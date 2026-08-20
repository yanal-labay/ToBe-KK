import { useEffect, useState } from 'react'
import { API_URL } from '../../apiConfig'
import './RegistrationsPanel.css'

const STATUS_ORDER = ['signed_up', 'arrived', 'did_not_arrive']
const STATUS_META = {
  signed_up: { label: 'נרשם', icon: '🕓', color: 'var(--color-text-muted)' },
  arrived: { label: 'הגיע', icon: '✅', color: '#0ca30c' },
  did_not_arrive: { label: 'לא הגיע', icon: '❌', color: '#d03b3b' },
}

function RegistrationsPanel({ eventId }) {
  const [registrations, setRegistrations] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

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

  if (loadState === 'loading') return <p>טוען נרשמים...</p>
  if (loadState === 'error') return <p className="events-error">לא ניתן לטעון את הנרשמים</p>

  if (registrations.length === 0) {
    return <p>עדיין אין נרשמים לאירוע זה.</p>
  }

  const counts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = registrations.filter((r) => r.status === status).length
    return acc
  }, {})
  const maxCount = Math.max(1, ...STATUS_ORDER.map((status) => counts[status]))

  return (
    <div className="registrations-panel">
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
                  width: `${(counts[status] / maxCount) * 100}%`,
                  background: STATUS_META[status].color,
                }}
              />
            </div>
            <span className="registrations-chart-count">{counts[status]}</span>
          </div>
        ))}
      </div>

      <div className="registrations-table-wrap">
        <table className="registrations-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>אימייל</th>
              <th>טלפון</th>
              <th>סטטוס</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RegistrationsPanel
