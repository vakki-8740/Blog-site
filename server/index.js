import express from 'express'
import { createServer as createHttpServer } from 'node:http'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSeed } from './seed.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isProduction = process.env.NODE_ENV === 'production'
const adminPassword = process.env.ADMIN_PASSWORD || (!isProduction ? 'admin123' : '')
if (!adminPassword) {
  console.error('ADMIN_PASSWORD must be set before starting the production server.')
  process.exit(1)
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('Development only: using the default admin password. Set ADMIN_PASSWORD for a private password.')
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'))
const dataFile = path.join(dataDir, 'content.json')
mkdirSync(dataDir, { recursive: true })
if (!existsSync(dataFile)) writeFileSync(dataFile, JSON.stringify(createSeed(), null, 2), { mode: 0o600 })
let data
try {
  data = JSON.parse(readFileSync(dataFile, 'utf8'))
  if (!data.post || !Array.isArray(data.reviews) || !Array.isArray(data.comments)) throw new Error('Invalid data format')
} catch (error) {
  console.error(`Cannot read ${dataFile}: ${error.message}. Restore it from a backup before restarting.`)
  process.exit(1)
}

function saveData(next) {
  // A single Node process serializes these synchronous, atomic file replacements.
  const temporaryFile = `${dataFile}.${process.pid}.tmp`
  writeFileSync(temporaryFile, JSON.stringify(next, null, 2), { mode: 0o600 })
  renameSync(temporaryFile, dataFile)
  data = next
}

const app = express()
const httpServer = createHttpServer(app)
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  res.set('X-Content-Type-Options', 'nosniff')
  // SameSite cookies plus an Origin check keep browser cross-site requests out.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin')) {
    try {
      const originHost = new URL(req.get('origin')).host
      const requestHost = req.get('x-forwarded-host')?.split(',')[0].trim() || req.get('host')
      if (originHost !== requestHost) return res.status(403).json({ error: 'Request origin is not allowed.' })
    } catch {
      return res.status(403).json({ error: 'Request origin is not allowed.' })
    }
  }
  next()
})
app.use(express.json({ limit: '6mb' }))

const sessions = new Map()
const failedLogins = new Map()
const SESSION_MS = 8 * 60 * 60 * 1000
const COOKIE = 'good_edit_admin'

function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
}
function isAdmin(req) {
  const token = sessionToken(req)
  const expiry = sessions.get(token)
  if (!expiry) return false
  if (Date.now() >= expiry) { sessions.delete(token); return false }
  return true
}
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Please sign in as admin.' })
  next()
}
function samePassword(input) {
  const digest = (value) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(input), digest(adminPassword))
}
function cookieOptions(req) {
  return { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/', maxAge: SESSION_MS }
}

class InputError extends Error {}

function cleanText(value, label, maxLength, required = true) {
  if (typeof value !== 'string') throw new InputError(`${label} is required.`)
  const text = value.trim()
  if (required && !text) throw new InputError(`${label} is required.`)
  if (text.length > maxLength) throw new InputError(`${label} must be ${maxLength} characters or fewer.`)
  return text
}
function cleanLink(value) {
  const link = cleanText(value, 'Link', 2048)
  let url
  try { url = new URL(link) } catch { throw new InputError('Enter a valid website link.') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new InputError('Link must start with http:// or https://.')
  return link
}
function cleanImage(value, label, required) {
  const image = cleanText(value || '', label, 2_800_000, required)
  if (!image) return ''
  if (image.startsWith('/') && !image.startsWith('//') && !image.includes('..')) return image
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/]+={0,2}$/.test(image)) return image
  let url
  try { url = new URL(image) } catch { throw new InputError(`${label} must be a valid image URL.`) }
  if (!['http:', 'https:'].includes(url.protocol)) throw new InputError(`${label} must use http or https.`)
  return image
}
function cleanPost(body) {
  return {
    logoName: cleanText(body.logoName, 'Logo name', 60),
    logoImage: cleanImage(body.logoImage, 'Logo image', false),
    tag: cleanText(body.tag, 'Tag', 32),
    imageUrl: cleanImage(body.imageUrl, 'Image', true),
    title: cleanText(body.title, 'Title', 120),
    description: cleanText(body.description, 'Description', 3000),
    link: cleanLink(body.link),
  }
}
function cleanReview(body) {
  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new InputError('Choose a rating from 1 to 5.')
  return {
    name: cleanText(body.name, 'Name', 60),
    rating,
    text: cleanText(body.text, 'Review', 1000),
  }
}
function badInput(res, error) {
  if (error instanceof InputError) return res.status(400).json({ error: error.message })
  console.error(error)
  return res.status(500).json({ error: 'Could not save your changes. Please try again.' })
}

app.get('/api/content', (_req, res) => res.json(data))
app.get('/api/admin/session', (req, res) => res.json({ authenticated: isAdmin(req) }))
app.post('/api/admin/login', (req, res) => {
  const key = req.ip || 'unknown'
  const attempts = failedLogins.get(key) || { count: 0, since: Date.now() }
  if (Date.now() - attempts.since >= 15 * 60 * 1000) { attempts.count = 0; attempts.since = Date.now() }
  if (attempts.count >= 10) return res.status(429).json({ error: 'Too many attempts. Please try again later.' })
  if (typeof req.body?.password !== 'string' || req.body.password.length > 1024 || !samePassword(req.body.password)) {
    attempts.count += 1
    failedLogins.set(key, attempts)
    return res.status(401).json({ error: 'Incorrect password.' })
  }
  failedLogins.delete(key)
  const token = randomBytes(32).toString('hex')
  sessions.set(token, Date.now() + SESSION_MS)
  res.cookie(COOKIE, token, cookieOptions(req))
  res.json({ authenticated: true })
})
app.post('/api/admin/logout', (req, res) => {
  sessions.delete(sessionToken(req))
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/' })
  res.json({ authenticated: false })
})
app.put('/api/admin/post', requireAdmin, (req, res) => {
  try {
    const post = cleanPost(req.body || {})
    saveData({ ...data, post })
    res.json(post)
  } catch (error) { badInput(res, error) }
})
app.post('/api/comments', (req, res) => {
  try {
    const comment = {
      id: randomUUID(),
      username: cleanText(req.body?.username, 'Username', 40),
      body: cleanText(req.body?.body, 'Comment', 1000),
      createdAt: new Date().toISOString(),
    }
    saveData({ ...data, comments: [comment, ...data.comments] })
    res.status(201).json(comment)
  } catch (error) { badInput(res, error) }
})
app.post('/api/admin/reviews', requireAdmin, (req, res) => {
  try {
    const review = { id: randomUUID(), ...cleanReview(req.body || {}), createdAt: new Date().toISOString() }
    saveData({ ...data, reviews: [review, ...data.reviews] })
    res.status(201).json(review)
  } catch (error) { badInput(res, error) }
})
app.put('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  try {
    const existing = data.reviews.find((review) => review.id === req.params.id)
    if (!existing) return res.status(404).json({ error: 'Review not found.' })
    const review = { ...existing, ...cleanReview(req.body || {}) }
    saveData({ ...data, reviews: data.reviews.map((item) => item.id === review.id ? review : item) })
    res.json(review)
  } catch (error) { badInput(res, error) }
})
app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  if (!data.reviews.some((review) => review.id === req.params.id)) return res.status(404).json({ error: 'Review not found.' })
  saveData({ ...data, reviews: data.reviews.filter((review) => review.id !== req.params.id) })
  res.status(204).end()
})
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Image is too large. Choose a file under 2 MB.' })
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Invalid request.' })
  console.error(error)
  res.status(500).json({ error: 'Something went wrong.' })
})

if (isProduction) {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    root,
    server: { middlewareMode: { server: httpServer }, hmr: { server: httpServer }, host: '0.0.0.0', allowedHosts: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

const port = Number(process.env.PORT || 3000)
httpServer.listen(port, '0.0.0.0', () => console.log(`The Good Edit is listening on port ${httpServer.address().port}`))
