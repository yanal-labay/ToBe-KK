import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { API_URL } from '../apiConfig'

const AdminSessionContext = createContext(null)

export function AdminSessionProvider({ children }) {
  const [status, setStatus] = useState('checking') // checking | authed | anon
  const [admin, setAdmin] = useState(null)

  const refresh = useCallback(() => {
    return fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('not authenticated')
        return res.json()
      })
      .then((data) => {
        setAdmin(data.admin)
        setStatus('authed')
      })
      .catch(() => {
        setAdmin(null)
        setStatus('anon')
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markAuthed = useCallback((adminData) => {
    setAdmin(adminData)
    setStatus('authed')
  }, [])

  const clearSession = useCallback(() => {
    setAdmin(null)
    setStatus('anon')
  }, [])

  return (
    <AdminSessionContext.Provider
      value={{ status, admin, isAdmin: status === 'authed', refresh, markAuthed, clearSession }}
    >
      {children}
    </AdminSessionContext.Provider>
  )
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession must be used within AdminSessionProvider')
  return ctx
}
