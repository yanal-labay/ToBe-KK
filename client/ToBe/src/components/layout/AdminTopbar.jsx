import { useTheme } from '../hooks/useTheme'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import BrandLogo from './BrandLogo'
import ThemeToggleButton from './ThemeToggleButton'
import './AdminTopbar.css'

/** Admin-facing topbar: brand + "אזור ניהול" badge + theme toggle + logout. */
function AdminTopbar() {
  const { theme, toggleTheme } = useTheme()
  const { clearSession } = useAdminSession()

  // Deliberately does not navigate after logging out: clearing the shared
  // session flips Layout back to guest chrome in place on whatever page the
  // admin was viewing. If they happen to be on /admin, RequireAdminAuth
  // reacts to the same state change and redirects to /admin/login on its own.
  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    clearSession()
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-brand">
        <BrandLogo theme={theme} />
        <span className="admin-badge">אזור ניהול</span>
      </div>
      <div className="admin-topbar-actions">
        <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
        <button type="button" className="btn btn-outline" onClick={handleLogout}>
          התנתקות
        </button>
      </div>
    </header>
  )
}

export default AdminTopbar
