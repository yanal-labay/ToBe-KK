import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getCurrentAdmin } from '../components/UsersManager/UsersService'

const AdminSessionContext = createContext(null)

/**
 * App-wide "am I logged in as an admin" state, mounted once near the root
 * (see main.jsx) so every consumer shares a single `/api/auth/me` check
 * instead of each doing its own. This is what lets `Layout` pick admin vs.
 * guest chrome for ANY route (including public pages like /events) purely
 * from session state, rather than from which URL subtree is being visited.
 *
 * `markAuthed`/`clearSession` let `AdminLogin` and the logout button in
 * `AdminTopbar` update this state instantly after a successful login/logout,
 * without waiting on a second round-trip to `/me`.
 */
export function AdminSessionProvider({ children }) {
  const [status, setStatus] = useState('checking') // checking | authed | anon
  const [admin, setAdmin] = useState(null)

  const refresh = useCallback(() => {
    return getCurrentAdmin()
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

/**
 * Reads the shared admin-session context. Must be called from within an
 * `<AdminSessionProvider>` (mounted in main.jsx around the whole app).
 *
 * @returns {{
 *   status: 'checking'|'authed'|'anon',
 *   admin: {email: string}|null,
 *   isAdmin: boolean,
 *   refresh: () => Promise<void>,
 *   markAuthed: (admin: object) => void,
 *   clearSession: () => void,
 * }}
 */
export function useAdminSession() {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession must be used within AdminSessionProvider')
  return ctx
}
