import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useAdminSession } from '../../hooks/useAdminSession'
import { API_URL } from '../../apiConfig'
import BrandLogo from '../../components/BrandLogo'
import ThemeToggleButton from '../../components/ThemeToggleButton'
import './AdminLogin.css'

/**
 * Standalone admin login page (outside the shared `Layout`, see App.jsx).
 * On success, calls `markAuthed` to update the shared session immediately
 * rather than navigating and relying on a fresh `/api/auth/me` check — the
 * `RequireAdminAuth` guard on `/admin` reads that same session state, so
 * without this it would still think the visitor is anonymous the instant
 * after login and bounce them back to the login page.
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
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        markAuthed(data.admin)
        navigate('/admin')
      } else {
        setError(data.message || 'שגיאה בהתחברות')
      }
    } catch (err) {
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
      <form onSubmit={handleSubmit} className="admin-login-form">
        <h1>כניסת מנהלים</h1>
        <label>
          אימייל
          <input
            type="email"
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
      </form>
    </div>
  )
}

export default AdminLogin
