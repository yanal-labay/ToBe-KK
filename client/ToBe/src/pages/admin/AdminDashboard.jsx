import { useOutletContext } from 'react-router-dom'

/**
 * Landing page for authenticated admins at "/admin" — still a placeholder.
 * `admin` comes from the outlet context provided by `RequireAdminAuth`
 * (the route guard wrapping this page), not from `useAdminSession()`
 * directly.
 */
function AdminDashboard() {
  const { admin } = useOutletContext()

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h1>ברוך הבא, {admin?.email}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        אזור הניהול בבנייה — בקרוב יתווספו כאן כלי ניהול (מלגות, אירועים, משתמשים ועוד).
      </p>
    </div>
  )
}

export default AdminDashboard
