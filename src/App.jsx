import { useEffect, useState } from 'react'
import { api } from './api.js'
import { Header } from './components/Shared.jsx'
import PublicPage from './components/PublicPage.jsx'
import AdminPage from './components/AdminPage.jsx'

const isAdminPage = window.location.pathname.replace(/\/+$/, '') === '/admin'

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [data, setData] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('good-edit-theme', theme) } catch { /* Storage can be disabled. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#12141a' : '#f4f5f7')
  }, [theme])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [content, session] = await Promise.all([
          api('/api/content'),
          isAdminPage ? api('/api/admin/session') : Promise.resolve({ authenticated: false }),
        ])
        if (!cancelled) { setData(content); setAuthenticated(session.authenticated) }
      } catch (requestError) { if (!cancelled) setError(requestError.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (isAdminPage) return undefined
    let cancelled = false
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        api('/api/content').then((content) => { if (!cancelled) setData(content) }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', refresh)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', refresh) }
  }, [])

  return (
    <div className="app-shell">
      <Header theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} admin={isAdminPage} />
      {loading ? <main className="page-message" aria-live="polite">Loading...</main>
        : error ? <main className="page-message" role="alert">{error} <button type="button" onClick={() => window.location.reload()}>Try again</button></main>
          : isAdminPage ? <AdminPage authenticated={authenticated} setAuthenticated={setAuthenticated} data={data} setData={setData} />
            : <PublicPage data={data} setData={setData} />}
    </div>
  )
}
