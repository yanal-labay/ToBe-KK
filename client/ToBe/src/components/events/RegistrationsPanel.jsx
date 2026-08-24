import { useEffect, useState } from 'react'
import { API_URL } from '../../apiConfig'
import ExportExcelButton from '../shared/ExportExcelButton'
import { exportRowsToExcel } from '../../utils/exportToExcel'
import './RegistrationsPanel.css'

// Display order for both the chart rows and the per-row status <select>;
// colors follow the app's reserved status palette (green=good, red=critical)
// so identity never relies on color alone — every mark also carries an
// icon + label.
const STATUS_ORDER = ['signed_up', 'arrived', 'did_not_arrive']
const STATUS_META = {
  signed_up: { label: 'נרשם', icon: '🕓', color: 'var(--color-text-muted)' },
  arrived: { label: 'הגיע', icon: '✅', color: '#0ca30c' },
  did_not_arrive: { label: 'לא הגיע', icon: '❌', color: '#d03b3b' },
}

const EMPTY_REGISTRANT = { name: '', email: '', phone: '' }

/** A small abstract trash-bin icon, colored via `currentColor` (see .registrations-delete-btn). */
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Admin-only view of everyone registered for one event: a status-summary
 * bar chart, an "add registrant" form for admins to add someone manually
 * (reusing the same public register endpoint guests use), and a table
 * where each registrant's attendance status can be changed via a dropdown
 * or the registrant removed entirely (with confirmation). Toggled
 * open/closed from `EventCard`.
 *
 * @param {{eventId: string, eventTitle: string}} props
 */
function RegistrationsPanel({ eventId, eventTitle }) {
  const [registrations, setRegistrations] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [adding, setAdding] = useState(false)
  const [newRegistrant, setNewRegistrant] = useState(EMPTY_REGISTRANT)
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/events/${eventId}/registrations`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setRegistrations(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  /** Optimistically updates the dropdown, then rolls back if the PATCH fails. */
  const handleStatusChange = async (registrationId, status) => {
    const previous = registrations
    setRegistrations((current) =>
      current.map((r) => (r._id === registrationId ? { ...r, status } : r))
    )
    try {
      const res = await fetch(
        `${API_URL}/api/events/${eventId}/registrations/${registrationId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      const data = await res.json()
      if (!data.success) throw new Error()
    } catch {
      setRegistrations(previous)
    }
  }

  const handleDelete = async (registration) => {
    if (!window.confirm(`למחוק את ${registration.name} מרשימת הנרשמים?`)) return
    const res = await fetch(
      `${API_URL}/api/events/${eventId}/registrations/${registration._id}`,
      { method: 'DELETE', credentials: 'include' }
    )
    const data = await res.json()
    if (!data.success) return
    load()
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setAddError('')
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegistrant),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setNewRegistrant(EMPTY_REGISTRANT)
      setAdding(false)
      load()
    } catch (err) {
      setAddError(err.message || 'ההוספה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  /** Exports exactly the visible table columns (name/email/phone/status) to an .xlsx file. */
  const handleExport = () => {
    const headers = ['שם', 'אימייל', 'טלפון', 'סטטוס']
    const rows = registrations.map((r) => [r.name, r.email, r.phone, STATUS_META[r.status].label])
    const safeTitle = eventTitle.replace(/[\\/:*?"<>|]/g, '')
    exportRowsToExcel({ filename: `נרשמים-${safeTitle}.xlsx`, headers, rows })
  }

  const statusCounts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = registrations.filter((r) => r.status === status).length
    return acc
  }, {})
  const maxStatusCount = Math.max(1, ...STATUS_ORDER.map((status) => statusCounts[status]))

  return (
    <div className="registrations-panel">
      {loadState === 'ready' && registrations.length > 0 && (
        <div className="registrations-chart" role="img" aria-label="גרף סיכום סטטוס נרשמים">
          {STATUS_ORDER.map((status) => (
            <div className="registrations-chart-row" key={status}>
              <span className="registrations-chart-label">
                {STATUS_META[status].icon} {STATUS_META[status].label}
              </span>
              <div className="registrations-chart-track">
                <div
                  className="registrations-chart-bar"
                  style={{
                    width: `${(statusCounts[status] / maxStatusCount) * 100}%`,
                    background: STATUS_META[status].color,
                  }}
                />
              </div>
              <span className="registrations-chart-count">{statusCounts[status]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="registrations-toolbar">
        {!adding && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + הוספת נרשם
          </button>
        )}
        <ExportExcelButton onClick={handleExport} disabled={registrations.length === 0} />
      </div>

      {adding && (
        <form className="registrations-add-form" onSubmit={handleAddSubmit}>
          <label>
            שם מלא
            <input
              value={newRegistrant.name}
              onChange={(e) => setNewRegistrant({ ...newRegistrant, name: e.target.value })}
              required
            />
          </label>
          <label>
            אימייל
            <input
              type="email"
              value={newRegistrant.email}
              onChange={(e) => setNewRegistrant({ ...newRegistrant, email: e.target.value })}
              required
            />
          </label>
          <label>
            טלפון
            <input
              type="tel"
              value={newRegistrant.phone}
              onChange={(e) => setNewRegistrant({ ...newRegistrant, phone: e.target.value })}
              required
            />
          </label>
          {addError && <p className="events-error">{addError}</p>}
          <div className="registrations-add-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'מוסיף...' : 'הוספה'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setAdding(false)
                setAddError('')
                setNewRegistrant(EMPTY_REGISTRANT)
              }}
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {loadState === 'loading' && <p>טוען נרשמים...</p>}
      {loadState === 'error' && <p className="events-error">לא ניתן לטעון את הנרשמים</p>}
      {loadState === 'ready' && registrations.length === 0 && (
        <p>עדיין אין נרשמים לאירוע זה.</p>
      )}

      {loadState === 'ready' && registrations.length > 0 && (
        <div className="registrations-table-wrap">
          <table className="registrations-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.phone}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r._id, e.target.value)}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option value={status} key={status}>
                          {STATUS_META[status].icon} {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="registrations-delete-btn"
                      onClick={() => handleDelete(r)}
                      aria-label={`מחק את ${r.name} מרשימת הנרשמים`}
                      title="מחיקת נרשם"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RegistrationsPanel
