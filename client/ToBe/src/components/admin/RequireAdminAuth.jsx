import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { API_URL } from '../../apiConfig'

function RequireAdminAuth() {
  const [status, setStatus] = useState('checking') // checking | authed | anon
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('not authenticated')
        return res.json()
      })
      .then((data) => {
        setAdmin(data.admin)
        setStatus('authed')
      })
      .catch(() => setStatus('anon'))
  }, [])

  if (status === 'checking') return null
  if (status === 'anon') return <Navigate to="/admin/login" replace />

  return <Outlet context={{ admin }} />
}

export default RequireAdminAuth
