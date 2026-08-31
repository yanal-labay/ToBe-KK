import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getActivitySummary } from '../services/activityService'
import { useAdminSession } from './useAdminSession'

const ActivityContext = createContext(null)

/**
 * App-wide activity-notification state, mounted once near the root (see
 * main.jsx) so the topbar bell and the /admin/activity tree share one view
 * of what is unread.
 *
 * They previously each kept their own copy, which meant clearing a
 * notification from the tree left the bell showing a stale count until the
 * next page load. `notifyActivityChanged()` is the single hook both call
 * after any clear: it refetches the summary (updating the bell) and bumps
 * `version`, which the tree watches so a clear from the bell reaches it too.
 * The connection therefore works in both directions.
 *
 * Only fetches while an admin is logged in — the endpoints are admin-only,
 * so doing it for guests would just produce 401s on every page.
 */
export function ActivityProvider({ children }) {
  const { isAdmin } = useAdminSession()
  const [sources, setSources] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [version, setVersion] = useState(0)

  const refreshSummary = useCallback(() => {
    // Guests never reach this data (the bell only renders inside
    // AdminTopbar), so bail without touching state — setting it here would
    // be a synchronous setState inside the mount effect below.
    if (!isAdmin) return Promise.resolve()
    return getActivitySummary()
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        setSources(data.sources || [])
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }, [isAdmin])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  /**
   * Call after anything that changes what is unread. Refetches the summary
   * so the bell is right, and bumps `version` so a mounted tree reloads.
   */
  const notifyActivityChanged = useCallback(() => {
    setVersion((current) => current + 1)
    return refreshSummary()
  }, [refreshSummary])

  return (
    <ActivityContext.Provider
      value={{ sources, loadState, version, refreshSummary, notifyActivityChanged }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

/**
 * Reads the shared activity context. Must be called from within an
 * `<ActivityProvider>` (mounted in main.jsx around the whole app).
 *
 * @returns {{
 *   sources: Array<{key: string, label: string, to: string, newCount: number, total: number, flaggedCount: number}>,
 *   loadState: 'loading'|'ready'|'error',
 *   version: number,
 *   refreshSummary: () => Promise<void>,
 *   notifyActivityChanged: () => Promise<void>,
 * }}
 */
export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
