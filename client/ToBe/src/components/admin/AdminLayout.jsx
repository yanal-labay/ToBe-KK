import { Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { API_URL } from '../../apiConfig'
import BrandLogo from '../BrandLogo'
import ThemeToggleButton from '../ThemeToggleButton'
import './AdminLayout.css'

function AdminLayout() {
  const navigate = useNavigate()
  const context = useOutletContext()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    navigate('/admin/login')
  }

  return (
    <div dir="rtl" lang="he" className="admin-shell">
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
      <main className="admin-content">
        <Outlet context={context} />
      </main>
    </div>
  )
}

export default AdminLayout
