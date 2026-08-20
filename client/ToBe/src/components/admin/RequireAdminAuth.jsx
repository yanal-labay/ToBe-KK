import { Navigate, Outlet } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'

/**
 * Route guard for the /admin dashboard. Reads the same shared session as
 * `Layout` (see useAdminSession.jsx) rather than checking auth itself, so it
 * stays in sync with whatever chrome is currently showing. Redirects
 * anonymous visitors to the login page; renders nothing while the initial
 * session check is still in flight to avoid a flash of the login redirect.
 */
function RequireAdminAuth() {
  const { status, admin } = useAdminSession()

  if (status === 'checking') return null
  if (status === 'anon') return <Navigate to="/admin/login" replace />

  return <Outlet context={{ admin }} />
}

export default RequireAdminAuth
