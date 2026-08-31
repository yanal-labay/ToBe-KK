import { useState } from 'react'
import { Link } from 'react-router-dom'
import { markActivitySeen } from '../../components/ActivityManager/ActivityService'
import { useActivity } from '../../hooks/useActivity'
import './ActivityBell.css'

/**
 * Admin topbar bell: shows an unread dot when anything has arrived since the
 * admin last opened it, and expands into a per-source list — how many new
 * event registrations, job applications, and registry sign-ups, each linking
 * to the page that shows the full list.
 *
 * Opening does NOT clear anything — only the explicit "נקה התראות" button
 * does, so glancing at what arrived never destroys the marker.
 *
 * Rendered only from AdminTopbar, which itself only renders for admins (see
 * Layout.jsx), so this needs no isAdmin check of its own.
 *
 * Counts come from the shared ActivityProvider rather than a fetch of its
 * own, so clearing a notification on the /admin/activity tree updates this
 * bell immediately — and clearing here updates that tree.
 */
function ActivityBell() {
  const [open, setOpen] = useState(false)
  const { sources, loadState, notifyActivityChanged } = useActivity()

  const totalNew = sources.reduce((sum, source) => sum + source.newCount, 0)
  const totalFlagged = sources.reduce((sum, source) => sum + (source.flaggedCount || 0), 0)

  const handleClear = async () => {
    try {
      await markActivitySeen()
      // Refetches the shared summary (updating this bell) and signals the
      // activity tree to reload if it happens to be open.
      await notifyActivityChanged()
    } catch {
      // A failed clear leaves the counts up — harmless, and retried on the
      // next press.
    }
  }

  return (
    <div className="activity-bell">
      <button
        type="button"
        className="activity-bell-button"
        onClick={() => setOpen((current) => !current)}
        aria-label={totalNew > 0 ? `התראות — ${totalNew} חדשות` : 'התראות'}
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>
        {totalNew > 0 && <span className="activity-bell-dot">{totalNew}</span>}
        {totalFlagged > 0 && (
          <span className="activity-bell-flag" title={`${totalFlagged} מסומנים`} aria-hidden="true">
            🚩
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Transparent catcher so a click anywhere else closes the
              dropdown, mirroring .schedule-day-popover-overlay. */}
          <div className="activity-bell-overlay" onClick={() => setOpen(false)} />
          <div className="activity-bell-dropdown">
            <h3 className="activity-bell-heading">פעילות אחרונה</h3>

            {loadState === 'loading' && <p className="activity-bell-empty">טוען...</p>}
            {loadState === 'error' && (
              <p className="activity-bell-empty">לא ניתן לטעון את ההתראות</p>
            )}

            {loadState === 'ready' &&
              sources.map((source) => (
                <Link
                  key={source.key}
                  to={source.to}
                  className={`activity-bell-row ${source.newCount > 0 ? 'is-new' : ''} ${
                    source.flaggedCount > 0 ? 'is-flagged' : ''
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <span className="activity-bell-row-label">
                    {source.flaggedCount > 0 && <span aria-hidden="true">🚩 </span>}
                    {source.label}
                  </span>
                  <span className="activity-bell-row-count">
                    {source.newCount > 0 ? `${source.newCount} חדשים` : 'אין חדשים'}
                  </span>
                </Link>
              ))}

            <div className="activity-bell-footer">
              <button
                type="button"
                className="btn btn-outline activity-bell-clear"
                onClick={handleClear}
                disabled={totalNew === 0}
              >
                נקה התראות
              </button>
              <Link
                to="/admin/activity"
                className="activity-bell-footer-link"
                onClick={() => setOpen(false)}
              >
                לדף הסטטיסטיקות ←
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ActivityBell
