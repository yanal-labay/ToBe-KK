import { API_URL } from '../../apiConfig'
import RegisterForm from './RegisterForm'
import RegistrationsPanel from './RegistrationsPanel'
import './EventCard.css'

/** Formats an event's `date` (ISO string from the API) for display in Hebrew. */
function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * True once the event's date+time has fully passed. Exported so `Events.jsx`
 * can sink expired events to the bottom of the list without duplicating this
 * date-parsing logic.
 */
export function isEventExpired(event) {
  const [hours, minutes] = event.time.split(':').map(Number)
  const eventDateTime = new Date(event.date)
  eventDateTime.setHours(hours, minutes, 0, 0)
  return eventDateTime.getTime() < Date.now()
}

/**
 * True once registration is no longer possible: either the event itself has
 * already happened, or (when the admin set one) its optional
 * `registrationDeadline` day has fully passed — a cutoff that can close
 * sign-ups earlier than the event itself. Mirrors the day-only comparison
 * in `event.controller.js`'s `isRegistrationClosed`, which is the one that
 * actually enforces this server-side.
 */
export function isRegistrationClosed(event) {
  if (isEventExpired(event)) return true
  if (!event.registrationDeadline) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(event.registrationDeadline)
  deadline.setHours(0, 0, 0, 0)
  return deadline.getTime() < today.getTime()
}

/**
 * Read-only display of a single event, with the action row branching by
 * role: admins get edit/delete/toggle-registrations buttons (and the
 * `RegistrationsPanel` when toggled open), guests get the `RegisterForm`
 * instead. Editing itself is handled by the parent (`Events.jsx` swaps this
 * component out for an `EventForm` while `editingId` matches), so this
 * component only needs to know *whether* it's being viewed by an admin, not
 * whether it's currently in edit mode.
 *
 * @param {{
 *   event: object,
 *   isAdmin: boolean,
 *   onEdit: () => void,
 *   onDelete: () => void,
 *   isViewingRegistrations: boolean,
 *   onToggleRegistrations: () => void,
 * }} props
 */
function EventCard({ event, isAdmin, onEdit, onDelete, isViewingRegistrations, onToggleRegistrations }) {
  const expired = isEventExpired(event)
  const registrationClosed = isRegistrationClosed(event)

  return (
    <div className="card event-card">
      {expired && <span className="event-expired-badge">הסתיים</span>}
      {event.photoUrl && (
        <img src={`${API_URL}${event.photoUrl}`} alt={event.title} className="event-photo" />
      )}
      <h3>{event.title}</h3>
      <div className="event-meta">
        <p>📅 {formatDate(event.date)}</p>
        <p>🕒 {event.time}</p>
        <p>📍 {event.location}</p>
        {event.price != null && <p> עלות : {event.price} ₪</p>}
        {event.registrationDeadline && (
          <p>⏳ הרשמה עד: {formatDate(event.registrationDeadline)}</p>
        )}
      </div>
      <p>{event.description}</p>

      {isAdmin ? (
        <>
          <div className="event-card-actions">
            <button type="button" className="btn btn-outline" onClick={onEdit}>
              עריכה
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDelete}>
              מחיקה
            </button>
            <button type="button" className="btn btn-outline" onClick={onToggleRegistrations}>
              {isViewingRegistrations ? 'הסתרת נרשמים' : 'נרשמים'}
            </button>
          </div>
          {isViewingRegistrations && <RegistrationsPanel eventId={event._id} />}
        </>
      ) : registrationClosed ? (
        <button type="button" className="btn btn-outline event-register-disabled" disabled>
          ההרשמה נסגרה
        </button>
      ) : (
        <RegisterForm eventId={event._id} />
      )}
    </div>
  )
}

export default EventCard
