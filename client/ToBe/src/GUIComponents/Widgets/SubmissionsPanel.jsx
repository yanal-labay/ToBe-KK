import { useEffect, useState } from 'react'
import ExportExcelButton from './ExportExcelButton'
import { exportRowsToExcel } from '../../utils/exportToExcel'
import './SubmissionsPanel.css'

const EMPTY_PERSON = { name: '', email: '', phone: '' }

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
 * Admin-only view of everyone who signed up for one parent record — event
 * registrants or job applicants. Renders a status-summary bar chart, an
 * "add manually" form (reusing the same public endpoint visitors use), and
 * a table where each row's status can be changed via a dropdown or the row
 * removed entirely (with confirmation). Toggled open/closed from the card.
 *
 * The caller supplies `api` already bound to the parent id, the status set,
 * and every visible string — this component knows nothing about events or
 * jobs.
 *
 * `statusMeta` colors follow the app's reserved status palette (green=good,
 * red=critical), and every mark also carries an icon + label so identity
 * never relies on color alone.
 *
 * @param {{
 *   parentTitle: string,
 *   statusOrder: string[],
 *   statusMeta: Record<string, {label: string, icon: string, color: string}>,
 *   api: {
 *     list: () => Promise<Response>,
 *     add: (values: object) => Promise<Response>,
 *     updateStatus: (id: string, body: {status: string}) => Promise<Response>,
 *     remove: (id: string) => Promise<Response>,
 *   },
 *   labels: {
 *     chartAria: string, addButton: string, loading: string,
 *     loadError: string, empty: string, exportPrefix: string,
 *     confirmDelete: (name: string) => string,
 *     deleteAria: (name: string) => string, deleteTitle: string,
 *   },
 *   onCountChange?: (count: number) => void,
 * }} props
 */
function SubmissionsPanel({
  parentTitle,
  statusOrder,
  statusMeta,
  api,
  labels,
  onCountChange,
}) {
  const [registrations, setRegistrations] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [adding, setAdding] = useState(false)
  const [newRegistrant, setNewRegistrant] = useState(EMPTY_PERSON)
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoadState('loading')
    api.list()
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setRegistrations(data)
        setLoadState('ready')
        // The card that opened this panel shows the count on its own button,
        // from a number fetched with the list. Reporting the authoritative
        // count here keeps that label honest after an add or a delete, both of
        // which re-run `load`. Safe against a refetch loop: the parent patches
        // one row of its list, leaving the memoised `api` identity — and so
        // this effect's only dependency — untouched.
        onCountChange?.(data.length)
      })
      .catch(() => setLoadState('error'))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  /** Optimistically updates the dropdown, then rolls back if the PATCH fails. */
  const handleStatusChange = async (registrationId, status) => {
    const previous = registrations
    setRegistrations((current) =>
      current.map((r) => (r._id === registrationId ? { ...r, status } : r))
    )
    try {
      const res = await api.updateStatus(registrationId, { status })
      const data = await res.json()
      if (!data.success) throw new Error()
    } catch {
      setRegistrations(previous)
    }
  }

  const handleDelete = async (registration) => {
    if (!window.confirm(labels.confirmDelete(registration.name))) return
    const res = await api.remove(registration._id)
    const data = await res.json()
    if (!data.success) return
    load()
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setAddError('')
    try {
      const res = await api.add(newRegistrant)
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setNewRegistrant(EMPTY_PERSON)
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
    const rows = registrations.map((r) => [r.name, r.email, r.phone, statusMeta[r.status].label])
    const safeTitle = parentTitle.replace(/[\\/:*?"<>|]/g, '')
    exportRowsToExcel({ filename: `${labels.exportPrefix}-${safeTitle}.xlsx`, headers, rows })
  }

  const statusCounts = statusOrder.reduce((acc, status) => {
    acc[status] = registrations.filter((r) => r.status === status).length
    return acc
  }, {})
  const maxStatusCount = Math.max(1, ...statusOrder.map((status) => statusCounts[status]))

  return (
    <div className="registrations-panel">
      {loadState === 'ready' && registrations.length > 0 && (
        <div className="registrations-chart" role="img" aria-label={labels.chartAria}>
          {statusOrder.map((status) => (
            <div className="registrations-chart-row" key={status}>
              <span className="registrations-chart-label">
                {statusMeta[status].icon} {statusMeta[status].label}
              </span>
              <div className="registrations-chart-track">
                <div
                  className="registrations-chart-bar"
                  style={{
                    width: `${(statusCounts[status] / maxStatusCount) * 100}%`,
                    background: statusMeta[status].color,
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
            {labels.addButton}
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
          {addError && <p className="submissions-error">{addError}</p>}
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
                setNewRegistrant(EMPTY_PERSON)
              }}
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {loadState === 'loading' && <p>{labels.loading}</p>}
      {loadState === 'error' && <p className="submissions-error">{labels.loadError}</p>}
      {loadState === 'ready' && registrations.length === 0 && <p>{labels.empty}</p>}

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
                      {statusOrder.map((status) => (
                        <option value={status} key={status}>
                          {statusMeta[status].icon} {statusMeta[status].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="registrations-delete-btn"
                      onClick={() => handleDelete(r)}
                      aria-label={labels.deleteAria(r.name)}
                      title={labels.deleteTitle}
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

export default SubmissionsPanel
