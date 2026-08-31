import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useActivity } from '../../hooks/useActivity'
import {
  getActivityStats,
  markActivitySeen,
  setActivityFlag,
} from '../../services/activityService'
import { formatDate } from '../../utils/formatDate'
import './AdminActivity.css'

// Order and labels for the count tiles. Keys match the `totals` object the
// server returns.
const TOTAL_TILES = [
  { key: 'events', label: 'אירועים' },
  { key: 'jobs', label: 'משרות' },
  { key: 'scholarships', label: 'מלגות' },
  { key: 'registrants', label: 'צעירים במאגר' },
  { key: 'registrations', label: 'הרשמות לאירועים' },
  { key: 'applications', label: 'מועמדים למשרות' },
]

/** "לפני שעתיים" / "אתמול" style relative time, falling back to a date. */
function relativeTime(value) {
  const then = new Date(value).getTime()
  const minutes = Math.floor((Date.now() - then) / 60000)
  if (minutes < 1) return 'הרגע'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return formatDate(value)
}

/** Recomputes a header's counts from whatever entries survived filtering. */
function summarise(entries) {
  return {
    newCount: entries.filter((e) => e.isNew).length,
    flaggedCount: entries.filter((e) => e.isFlagged).length,
  }
}

/**
 * Narrows the tree to `term`, matching either a person's name or a child's
 * title. A title match keeps that child whole (you asked for that event, so
 * you get all of it); a name match narrows the child to just those people.
 * Groups and children left with nothing drop out entirely.
 *
 * Counts are recomputed from the surviving entries so a filtered header
 * never claims more than it is showing.
 */
function filterGroups(groups, term) {
  const needle = term.trim().toLowerCase()
  if (!needle) return groups

  const matches = (text) => (text || '').toLowerCase().includes(needle)

  return groups
    .map((group) => {
      if (group.children) {
        const children = group.children
          .map((child) => {
            if (matches(child.title)) return child
            const entries = child.entries.filter((e) => matches(e.name))
            return entries.length ? { ...child, entries, ...summarise(entries) } : null
          })
          .filter(Boolean)
        if (!children.length) return null
        const all = children.flatMap((c) => c.entries)
        return { ...group, children, ...summarise(all) }
      }

      const entries = group.entries.filter((e) => matches(e.name))
      return entries.length ? { ...group, entries, ...summarise(entries) } : null
    })
    .filter(Boolean)
}

/**
 * Shared header for both tree levels: the ▾ disclosure, a new-count badge, a
 * flag marker, and a ✓ that clears just this node's notifications.
 *
 * A row rather than a single button, because the ✓ is itself a button and
 * nesting one inside another is invalid HTML — the disclosure and the clear
 * are siblings sharing a wrapper.
 */
function NodeHeader({ expanded, onToggle, onClear, title, newCount, flaggedCount, level }) {
  return (
    <div
      className={`admin-activity-node-header level-${level} ${newCount > 0 ? 'is-new' : ''} ${
        flaggedCount > 0 ? 'is-flagged' : ''
      }`}
    >
      <button
        type="button"
        className="admin-activity-disclosure"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span
          className={`admin-activity-caret ${expanded ? '' : 'is-collapsed'}`}
          aria-hidden="true"
        >
          ▾
        </span>
        <span className="admin-activity-node-title">
          {flaggedCount > 0 && <span aria-hidden="true">🚩 </span>}
          {title}
        </span>
        {newCount > 0 && <span className="admin-activity-badge">{newCount} חדשים</span>}
      </button>
      {newCount > 0 && (
        <button
          type="button"
          className="admin-activity-clear-btn"
          onClick={onClear}
          aria-label={`סימון ${title} כנצפה`}
          title="סימון כנצפה"
        >
          ✓
        </button>
      )}
    </div>
  )
}

/** One person: name, when they arrived, a ✓ to clear, and the flag toggle. */
function EntryRow({ entry, onToggleFlag, onClear }) {
  return (
    <li className={`admin-activity-entry ${entry.isFlagged ? 'is-flagged' : ''}`}>
      <span className="admin-activity-entry-main">
        <span className="admin-activity-entry-name">
          {entry.isNew && <span className="admin-activity-new-dot" aria-label="חדש" />}
          {entry.name}
        </span>
        {entry.email && <span className="admin-activity-entry-email">{entry.email}</span>}
      </span>
      <span className="admin-activity-entry-time">{relativeTime(entry.createdAt)}</span>
      {entry.isNew && (
        <button
          type="button"
          className="admin-activity-clear-btn"
          onClick={() => onClear(entry)}
          aria-label={`סימון ${entry.name} כנצפה`}
          title="סימון כנצפה"
        >
          ✓
        </button>
      )}
      <button
        type="button"
        className="admin-activity-flag-btn"
        onClick={() => onToggleFlag(entry)}
        aria-pressed={entry.isFlagged}
        aria-label={entry.isFlagged ? `הסרת סימון מ${entry.name}` : `סימון ${entry.name}`}
        title={entry.isFlagged ? 'הסרת סימון' : 'סימון לטיפול'}
      >
        {entry.isFlagged ? '🚩' : '⚐'}
      </button>
    </li>
  )
}

/**
 * Admin-only statistics page (/admin/activity): content and submission
 * totals, plus the activity tree — three top-level dropdowns where events
 * and jobs nest one level deeper (per event / per posting) and the registry
 * holds its people directly.
 *
 * Unlike the rest of the app — where a page is public and only its controls
 * are admin-gated — this whole page is admin-only, so it renders a
 * no-permission message for guests. The API enforces it regardless; this is
 * just so a guest hitting the URL sees something sensible.
 */
function AdminActivity() {
  const { status } = useAdminSession()
  // `version` bumps whenever anything clears notifications — including the
  // topbar bell — so this tree reloads instead of showing stale counts.
  const { version, notifyActivityChanged } = useActivity()
  const [stats, setStats] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({}) // { [nodeKey]: true }

  useEffect(() => {
    if (status !== 'authed') return
    let cancelled = false
    getActivityStats()
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [status, version])

  const searching = search.trim() !== ''
  const groups = useMemo(
    () => (stats ? filterGroups(stats.groups, search) : []),
    [stats, search]
  )

  // While searching every match is revealed, so a hit three levels down is
  // never hidden behind a collapsed parent.
  const isExpanded = (key) => searching || Boolean(expanded[key])
  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }))

  /**
   * Clears notifications for one scope and marks the affected entries seen
   * locally, so counts drop without a refetch. `predicate` decides which
   * entries the scope covers; the server is told the same thing via `scope`.
   *
   * Rolls the whole tree back if the request fails, matching the flag
   * toggle's approach.
   */
  const handleClear = async (scope, predicate) => {
    const previous = stats
    const clear = (list) =>
      list.map((e) => (predicate(e) ? { ...e, isNew: false } : e))

    setStats((current) => ({
      ...current,
      groups: current.groups.map((group) => {
        if (group.children) {
          const children = group.children.map((child) => {
            const entries = clear(child.entries)
            return { ...child, entries, ...summarise(entries) }
          })
          return { ...group, children, ...summarise(children.flatMap((c) => c.entries)) }
        }
        const entries = clear(group.entries)
        return { ...group, entries, ...summarise(entries) }
      }),
    }))

    try {
      const res = await markActivitySeen(scope)
      const data = await res.json()
      if (!data.success) throw new Error()
      // Updates the topbar bell's counts without waiting for a page load.
      await notifyActivityChanged()
    } catch {
      setStats(previous)
    }
  }

  /**
   * Optimistic flag toggle: flips the entry in place, then rolls the whole
   * tree back if the request fails — same approach as SubmissionsPanel's
   * status dropdown.
   */
  const handleToggleFlag = async (entry) => {
    const previous = stats
    const next = !entry.isFlagged
    const applyTo = (list) =>
      list.map((e) => (e.id === entry.id ? { ...e, isFlagged: next } : e))

    setStats((current) => ({
      ...current,
      groups: current.groups.map((group) => {
        if (group.children) {
          const children = group.children.map((child) => {
            const entries = applyTo(child.entries)
            return { ...child, entries, ...summarise(entries) }
          })
          return { ...group, children, ...summarise(children.flatMap((c) => c.entries)) }
        }
        const entries = applyTo(group.entries)
        return { ...group, entries, ...summarise(entries) }
      }),
    }))

    try {
      const res = await setActivityFlag({ kind: entry.kind, id: entry.id, isFlagged: next })
      const data = await res.json()
      if (!data.success) throw new Error()
    } catch {
      setStats(previous)
    }
  }

  if (status === 'checking') {
    return (
      <div className="admin-activity-page">
        <p>בודק הרשאות...</p>
      </div>
    )
  }

  if (status !== 'authed') {
    return (
      <div className="admin-activity-page">
        <h1>סטטיסטיקות</h1>
        <p>אין לך הרשאה לצפות בעמוד זה.</p>
        <Link to="/admin/login" className="btn btn-primary">
          כניסת מנהל
        </Link>
      </div>
    )
  }

  return (
    <div className="admin-activity-page">
      <h1>סטטיסטיקות ופעילות</h1>

      {loadState === 'loading' && <p>טוען נתונים...</p>}
      {loadState === 'error' && <p className="admin-activity-error">לא ניתן לטעון את הנתונים</p>}

      {loadState === 'ready' && stats && (
        <>
          <div className="admin-activity-tiles">
            {TOTAL_TILES.map((tile) => (
              <div className="admin-activity-tile" key={tile.key}>
                <span className="admin-activity-tile-value">{stats.totals[tile.key]}</span>
                <span className="admin-activity-tile-label">{tile.label}</span>
              </div>
            ))}
          </div>

          <h2>פעילות אחרונה</h2>

          <label className="admin-activity-search">
            חיפוש לפי שם או כותרת
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="לדוגמה: דנא, טורניר כדורסל..."
            />
          </label>

          {groups.length === 0 ? (
            <p>{searching ? 'אין תוצאות התואמות את החיפוש.' : 'עדיין אין פעילות להצגה.'}</p>
          ) : (
            <div className="admin-activity-tree">
              {groups.map((group) => (
                <div className="admin-activity-group" key={group.key}>
                  <NodeHeader
                    level={1}
                    expanded={isExpanded(group.key)}
                    onToggle={() => toggle(group.key)}
                    title={group.label}
                    newCount={group.newCount}
                    flaggedCount={group.flaggedCount}
                    onClear={() =>
                      handleClear({ kind: group.key }, (e) => e.kind === group.key)
                    }
                  />

                  {isExpanded(group.key) && (
                    <div className="admin-activity-group-body">
                      {/* Events and jobs nest one level deeper; the registry
                          has no parent record, so its people sit here. */}
                      {group.children
                        ? group.children.map((child) => {
                            const childKey = `${group.key}:${child.key}`
                            return (
                              <div className="admin-activity-child" key={childKey}>
                                <NodeHeader
                                  level={2}
                                  expanded={isExpanded(childKey)}
                                  onToggle={() => toggle(childKey)}
                                  title={child.title}
                                  newCount={child.newCount}
                                  flaggedCount={child.flaggedCount}
                                  onClear={() =>
                                    handleClear(
                                      { kind: group.key, parentId: child.key },
                                      (e) =>
                                        e.kind === group.key &&
                                        child.entries.some((ce) => ce.id === e.id)
                                    )
                                  }
                                />
                                {isExpanded(childKey) && (
                                  <ul className="admin-activity-entries">
                                    {child.entries.map((entry) => (
                                      <EntryRow
                                        key={entry.id}
                                        entry={entry}
                                        onToggleFlag={handleToggleFlag}
                                        onClear={(target) =>
                                          handleClear(
                                            { kind: target.kind, entryId: target.id },
                                            (e) => e.id === target.id
                                          )
                                        }
                                      />
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })
                        : (
                            <ul className="admin-activity-entries">
                              {group.entries.map((entry) => (
                                <EntryRow
                                  key={entry.id}
                                  entry={entry}
                                  onToggleFlag={handleToggleFlag}
                                  onClear={(target) =>
                                    handleClear(
                                      { kind: target.kind, entryId: target.id },
                                      (e) => e.id === target.id
                                    )
                                  }
                                />
                              ))}
                            </ul>
                          )}

                      <Link to={group.to} className="admin-activity-group-link">
                        לעמוד המלא ←
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminActivity
