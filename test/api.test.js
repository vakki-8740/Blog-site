import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function startServer(dataDir) {
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'development', PORT: '0', DATA_DIR: dataDir, ADMIN_PASSWORD: 'test-password' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 30000)
    child.stdout.on('data', (chunk) => {
      output += chunk
      const match = output.match(/listening on port (\d+)/)
      if (match) { clearTimeout(timer); resolve(Number(match[1])) }
    })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.once('error', (error) => { clearTimeout(timer); reject(error) })
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)) })
  })
  return { child, base: `http://127.0.0.1:${port}` }
}
async function stopServer(server) {
  if (server.child.exitCode !== null || server.child.signalCode !== null) return
  const done = once(server.child, 'exit')
  server.child.kill('SIGTERM')
  await done
}
function request(base, endpoint, { method = 'GET', body, cookie, origin } = {}) {
  return fetch(base + endpoint, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

test('shared content, guest comments, admin authorization and durable edits', async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'good-edit-api-'))
  let server = await startServer(directory)
  t.after(async () => { await stopServer(server); rmSync(directory, { recursive: true, force: true }) })

  const initialResponse = await request(server.base, '/api/content')
  assert.equal(initialResponse.status, 200)
  const initial = await initialResponse.json()
  assert.equal(initial.post.title, 'Make room for the little things.')
  assert.deepEqual(initial.comments, [])
  assert.equal(initial.reviews.length, 3)

  assert.equal((await request(server.base, '/api/admin/post', { method: 'PUT', body: initial.post })).status, 401)
  assert.equal((await request(server.base, '/api/admin/reviews', { method: 'POST', body: { name: 'Someone', rating: 5, text: 'Review' } })).status, 401)
  assert.equal((await request(server.base, '/api/comments', { method: 'POST', body: { username: '', body: 'Hi' } })).status, 400)
  assert.equal((await request(server.base, '/api/comments', { method: 'POST', body: { username: 'Visitor', body: 'Hi' }, origin: 'https://other-site.example' })).status, 403)

  const commentResponse = await request(server.base, '/api/comments', { method: 'POST', body: { username: ' Visitor ', body: ' A thoughtful comment. ' } })
  assert.equal(commentResponse.status, 201)
  const comment = await commentResponse.json()
  assert.equal(comment.username, 'Visitor')
  assert.equal(comment.body, 'A thoughtful comment.')

  assert.equal((await request(server.base, '/api/admin/login', { method: 'POST', body: { password: 'wrong' } })).status, 401)
  const login = await request(server.base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } })
  assert.equal(login.status, 200)
  const setCookie = login.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /SameSite=Strict/i)
  const cookie = setCookie.split(';')[0]
  assert.deepEqual(await (await request(server.base, '/api/admin/session', { cookie })).json(), { authenticated: true })

  const post = { ...initial.post, title: 'A saved post', tag: 'DESIGN' }
  const invalidPost = await request(server.base, '/api/admin/post', { method: 'PUT', cookie, body: { ...post, link: 'javascript:alert(1)' } })
  assert.equal(invalidPost.status, 400)
  const postResponse = await request(server.base, '/api/admin/post', { method: 'PUT', cookie, body: post })
  assert.equal(postResponse.status, 200)
  assert.equal((await postResponse.json()).title, 'A saved post')

  const invalidReview = await request(server.base, '/api/admin/reviews', { method: 'POST', cookie, body: { name: 'Reviewer', rating: 6, text: 'Nice' } })
  assert.equal(invalidReview.status, 400)
  const create = await request(server.base, '/api/admin/reviews', { method: 'POST', cookie, body: { name: 'Reviewer', rating: 4, text: 'Nice' } })
  assert.equal(create.status, 201)
  const review = await create.json()
  const update = await request(server.base, `/api/admin/reviews/${review.id}`, { method: 'PUT', cookie, body: { name: 'Reviewer', rating: 5, text: 'Updated' } })
  assert.equal(update.status, 200)
  assert.equal((await update.json()).text, 'Updated')
  assert.equal((await request(server.base, `/api/admin/reviews/${review.id}`, { method: 'DELETE', cookie })).status, 204)
  assert.equal((await request(server.base, `/api/admin/reviews/${review.id}`, { method: 'DELETE', cookie })).status, 404)

  const latest = await (await request(server.base, '/api/content')).json()
  assert.equal(latest.post.title, 'A saved post')
  assert.equal(latest.comments[0].id, comment.id)
  assert.equal(latest.reviews.length, 3)

  await request(server.base, '/api/admin/logout', { method: 'POST', cookie })
  assert.equal((await request(server.base, '/api/admin/post', { method: 'PUT', cookie, body: post })).status, 401)
  await stopServer(server)
  server = await startServer(directory)
  const restored = await (await request(server.base, '/api/content')).json()
  assert.equal(restored.post.title, 'A saved post')
  assert.equal(restored.comments[0].body, 'A thoughtful comment.')
  assert.deepEqual(await (await request(server.base, '/api/admin/session', { cookie })).json(), { authenticated: false })
})

test('production requires an explicitly configured admin password', async () => {
  const env = { ...process.env, NODE_ENV: 'production' }
  delete env.ADMIN_PASSWORD
  const child = spawn(process.execPath, ['server/index.js'], { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const [code] = await once(child, 'exit')
  assert.equal(code, 1)
  assert.match(stderr, /ADMIN_PASSWORD must be set/)
})
