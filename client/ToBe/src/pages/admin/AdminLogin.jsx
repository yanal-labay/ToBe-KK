import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useAdminSession } from '../../hooks/useAdminSession'
import { login } from '../../services/authService'
import BrandLogo from '../../components/layout/BrandLogo'
import ThemeToggleButton from '../../components/layout/ThemeToggleButton'
import './AdminLogin.css'

/**
 * Standalone admin login page (outside the shared `Layout`, see App.jsx).
 * On success, calls `markAuthed` to update the shared session immediately
 * (rather than navigating and relying on a fresh `/api/auth/me` check), then
 * sends the admin to "/" — the same home page everyone sees, just now with
 * admin-only controls layered on since the session is already authed.
 *
 * The guest link at the bottom is the way *off* this page: it sits outside
 * `Layout` (App.jsx), so there's no navbar here and anyone who lands on it by
 * mistake would otherwise be stuck. It deliberately doesn't log anyone out —
 * it's an escape hatch for someone who isn't signing in, so an already-authed
 * admin who clicks it just lands on "/" with their admin chrome.
 */
function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { markAuthed } = useAdminSession()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password })
      const data = await res.json()
      if (data.success) {
        markAuthed(data.admin)
        navigate('/')
      } else {
        setError(data.message || 'שגיאה בהתחברות')
      }
    } catch {
      setError('לא ניתן להתחבר לשרת')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" lang="he" className="admin-login">
      <div className="admin-login-topbar">
        <BrandLogo theme={theme} />
        <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
      </div>
      {/*
        The `id`/`name` on the two fields below do nothing for React — these
        are controlled inputs, so their values come from state, not the DOM.
        They're there for the browser: `name` is the key the form-history
        autofill dropdown files remembered values under (no name, no
        dropdown, ever), and password managers use `id`/`name` alongside the
        `autoComplete` hints to identify the fields and to decide whether to
        offer "save password". Please don't remove them as unused.
      */}
      <form onSubmit={handleSubmit} className="admin-login-form">
        <h1>כניסת מנהלים</h1>
        <label>
          אימייל
          <input
            type="email"
            id="admin-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          סיסמה
          <input
            type="password"
            id="admin-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="admin-login-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחברות'}
        </button>
        <Link to="/" className="admin-login-guest-link">
          המשך לאתר כאורח
        </Link>
      </form>
    </div>
  )
}

export default AdminLogin
