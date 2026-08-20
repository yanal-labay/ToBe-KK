import { Navigate, Outlet } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'

function RequireAdminAuth() {
  const { status, admin } = useAdminSession()

  if (status === 'checking') return null
  if (status === 'anon') return <Navigate to="/admin/login" replace />

  return <Outlet context={{ admin }} />
}

export default RequireAdminAuth
