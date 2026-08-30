import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'
import { useScrollToOpenPanel } from '../hooks/useScrollToOpenPanel'
import { listEvents, createEvent, updateEvent, deleteEvent } from '../services/eventsService'
import EventForm from '../components/events/EventForm'
import EventCard, { isEventExpired } from '../components/events/EventCard'
import './Events.css'

/**
 * The /events page — the app's first fully-built example of a shared page
 * whose content adapts to the visitor's role (see components/events/):
 * admins can create/edit/delete events and view registrants, guests can
 * only view and register. `isAdmin` alone decides which controls render;
 * everyone hits the same public GET /api/events list.
 */
function Events() {
  const { isAdmin } = useAdminSession()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight')

  const [events, setEvents] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [highlightedId, setHighlightedId] = useState(null)

  // At most one event is being created/edited/registrations-viewed at a
  // time; `editingId`/`viewingRegistrationsId` track *which* event by id
  // rather than a boolean per card, so opening one automatically implies
  // closing whichever other one was open.
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingRegistrationsId, setViewingRegistrationsId] = useState(null)

  // One form is open at a time — either the create form or exactly one card's
  // edit form. Drives both the scroll-into-view effect and the backdrop.
  const openFormId = creating
    ? 'event-form-new'
    : editingId
      ? `event-form-${editingId}`
      : null

  useScrollToOpenPanel(openFormId)

  const loadEvents = () => {
    setLoadState('loading')
    listEvents()
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

  // Scrolls to and briefly highlights the event named by ?highlight=<id>
  // (arriving from the /schedule calendar) once the list has loaded.
  useEffect(() => {
    if (!highlightParam || loadState !== 'ready') return
    if (!events.some((event) => event._id === highlightParam)) return

    setHighlightedId(highlightParam)
    const card = document.getElementById(`event-${highlightParam}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const timeout = setTimeout(() => setHighlightedId(null), 2500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam, loadState])

  const handleCreate = async (formData) => {
    const res = await createEvent(formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadEvents()
  }

  const handleUpdate = async (id, formData) => {
    const res = await updateEvent(id, formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadEvents()
  }

  const handleDelete = async (event) => {
    if (!window.confirm(`למחוק את האירוע "${event.title}"?`)) return
    const res = await deleteEvent(event._id)
    const data = await res.json()
    if (!data.success) return
    loadEvents()
  }

  return (
    <div className="events-page">
      {isAdmin && openFormId && <div className="form-focus-overlay" />}

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
          formId="event-form-new"
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {loadState === 'loading' && <p>טוען אירועים...</p>}
      {loadState === 'error' && <p className="events-error">לא ניתן לטעון את האירועים כרגע</p>}
      {loadState === 'ready' && events.length === 0 && <p>אין אירועים קרובים כרגע.</p>}

      <div className="events-list">
        {/* Stable sort: groups expired events after active ones while
            preserving each group's original (soonest-first) order. */}
        {[...events]
          .sort((a, b) => Number(isEventExpired(a)) - Number(isEventExpired(b)))
          .map((event) =>
          isAdmin && editingId === event._id ? (
            <EventForm
              key={event._id}
              formId={`event-form-${event._id}`}
              initialValues={{
                title: event.title,
                description: event.description,
                location: event.location,
                date: event.date.slice(0, 10),
                time: event.time,
                price: event.price != null ? String(event.price) : '',
                registrationDeadline: event.registrationDeadline
                  ? event.registrationDeadline.slice(0, 10)
                  : '',
              }}
              existingPhotoUrl={event.photoUrl}
              submitLabel="עדכון"
              onSubmit={(formData) => handleUpdate(event._id, formData)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <EventCard
              key={event._id}
              event={event}
              isAdmin={isAdmin}
              isHighlighted={highlightedId === event._id}
              onEdit={() => setEditingId(event._id)}
              onDelete={() => handleDelete(event)}
              isViewingRegistrations={viewingRegistrationsId === event._id}
              onToggleRegistrations={() =>
                setViewingRegistrationsId((current) =>
                  current === event._id ? null : event._id
                )
              }
            />
          )
        )}
      </div>
    </div>
  )
}

export default Events
