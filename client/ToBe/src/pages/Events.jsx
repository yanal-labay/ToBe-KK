import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import './Events.css'

const EMPTY_FORM = { title: '', description: '', date: '', time: '', location: '', price: '' }
const EMPTY_REGISTER = { name: '', email: '', phone: '' }

const STATUS_ORDER = ['signed_up', 'arrived', 'did_not_arrive']
const STATUS_META = {
  signed_up: { label: 'נרשם', icon: '🕓', color: 'var(--color-text-muted)' },
  arrived: { label: 'הגיע', icon: '✅', color: '#0ca30c' },
  did_not_arrive: { label: 'לא הגיע', icon: '❌', color: '#d03b3b' },
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function EventForm({ initialValues, existingPhotoUrl, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const selectPhotoFile = (file) => {
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description)
      formData.append('date', values.date)
      formData.append('time', values.time)
      formData.append('location', values.location)
      formData.append('price', values.price)
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת האירוע נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <label>
        כותרת
        <input value={values.title} onChange={handleChange('title')} required />
      </label>
      <label>
        תיאור
        <textarea value={values.description} onChange={handleChange('description')} required />
      </label>
      <div className="event-form-row">
        <label>
          תאריך
          <input type="date" value={values.date} onChange={handleChange('date')} required />
        </label>
        <label>
          שעה
          <input type="time" value={values.time} onChange={handleChange('time')} required />
        </label>
      </div>
      <label>
        מיקום
        <input value={values.location} onChange={handleChange('location')} required />
      </label>
      <label>
        מחיר בש״ח (לא חובה)
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="ללא עלות"
          value={values.price}
          onChange={handleChange('price')}
        />
      </label>
      <label>
        תמונה (לא חובה)
        <img
          src={photoPreview || (existingPhotoUrl ? `${API_URL}${existingPhotoUrl}` : undefined)}
          alt=""
          className="event-photo-preview"
          hidden={!photoPreview && !existingPhotoUrl}
        />
        <div
          className={`photo-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            selectPhotoFile(e.dataTransfer.files?.[0])
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => selectPhotoFile(e.target.files?.[0])}
          />
          <p className="photo-dropzone-hint">
            {photoFile ? photoFile.name : 'גררו תמונה לכאן או לחצו לבחירה'}
          </p>
        </div>
      </label>
      {error && <p className="event-form-error">{error}</p>}
      <div className="event-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר...' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  )
}

function RegisterForm({ eventId }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY_REGISTER)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'ההרשמה נכשלה')
    }
  }

  if (status === 'success') {
    return (
      <div className="event-register-success">
        <p>✔ נרשמת בהצלחה!</p>
        <p>ניצור איתך קשר :)</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        הרשמה לאירוע
      </button>
    )
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <label>
        שם מלא
        <input value={values.name} onChange={handleChange('name')} required />
      </label>
      <label>
        אימייל
        <input type="email" value={values.email} onChange={handleChange('email')} required />
      </label>
      <label>
        טלפון
        <input type="tel" value={values.phone} onChange={handleChange('phone')} required />
      </label>
      {status === 'error' && <p className="event-form-error">{error}</p>}
      <div className="event-form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'נרשם...' : 'אישור הרשמה'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
          ביטול
        </button>
      </div>
    </form>
  )
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

function Events() {
  const { isAdmin } = useAdminSession()

  const [events, setEvents] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingRegistrationsId, setViewingRegistrationsId] = useState(null)

  const loadEvents = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/events`)
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setEvents(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleCreate = async (formData) => {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadEvents()
  }

  const handleUpdate = async (id, formData) => {
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadEvents()
  }

  const handleDelete = async (event) => {
    if (!window.confirm(`למחוק את האירוע "${event.title}"?`)) return
    const res = await fetch(`${API_URL}/api/events/${event._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadEvents()
  }

  return (
    <div className="events-page">
      <div className="events-page-header">
        <h1>אירועים</h1>
        {isAdmin && !creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            + אירוע חדש
          </button>
        )}
      </div>

      {isAdmin && creating && (
        <EventForm
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {loadState === 'loading' && <p>טוען אירועים...</p>}
      {loadState === 'error' && <p className="events-error">לא ניתן לטעון את האירועים כרגע</p>}
      {loadState === 'ready' && events.length === 0 && <p>אין אירועים קרובים כרגע.</p>}

      <div className="events-list">
        {events.map((event) =>
          isAdmin && editingId === event._id ? (
            <EventForm
              key={event._id}
              initialValues={{
                title: event.title,
                description: event.description,
                location: event.location,
                date: event.date.slice(0, 10),
                time: event.time,
                price: event.price != null ? String(event.price) : '',
              }}
              existingPhotoUrl={event.photoUrl}
              submitLabel="עדכון"
              onSubmit={(formData) => handleUpdate(event._id, formData)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="card event-card" key={event._id}>
              {event.photoUrl && (
                <img
                  src={`${API_URL}${event.photoUrl}`}
                  alt={event.title}
                  className="event-photo"
                />
              )}
              <h3>{event.title}</h3>
              <div className="event-meta">
                <p>📅 {formatDate(event.date)}</p>
                <p>🕒 {event.time}</p>
                <p>📍 {event.location}</p>
                {event.price != null && <p> עלות : {event.price} ₪</p>}
              </div>
              <p>{event.description}</p>

              {isAdmin ? (
                <>
                  <div className="event-card-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setEditingId(event._id)}
                    >
                      עריכה
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDelete(event)}
                    >
                      מחיקה
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        setViewingRegistrationsId((current) =>
                          current === event._id ? null : event._id
                        )
                      }
                    >
                      {viewingRegistrationsId === event._id ? 'הסתרת נרשמים' : 'נרשמים'}
                    </button>
                  </div>
                  {viewingRegistrationsId === event._id && (
                    <RegistrationsPanel eventId={event._id} />
                  )}
                </>
              ) : (
                <RegisterForm eventId={event._id} />
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Events
