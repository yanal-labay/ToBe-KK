import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
