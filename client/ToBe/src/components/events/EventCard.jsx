import { useState } from 'react'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildEventShareText } from '../../utils/shareText'
import ShareBox from '../shared/ShareBox'
import RegisterForm from './RegisterForm'
import RegistrationsPanel from './RegistrationsPanel'
import './EventCard.css'

const DESCRIPTION_PREVIEW_CHARS = 90

/** Formats an event's `date` (ISO string from the API) for display in Hebrew. */
function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Splits `text` into a leading preview of at most `maxChars` characters
 * (including spaces) plus whether it was actually longer than that, so the
 * card can offer to expand only when there's really more to show.
 */
function previewDescription(text, maxChars) {
  if (text.length <= maxChars) {
    return { preview: text, isTruncated: false }
  }
  return { preview: text.slice(0, maxChars), isTruncated: true }
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
 * already happened, or its `registrationDeadline` day has fully passed — a
 * cutoff that can close sign-ups earlier than the event itself. Mirrors
 * the day-only comparison in `event.controller.js`'s
 * `isRegistrationClosed`, which is the one that actually enforces this
 * server-side. The `!event.registrationDeadline` guard is a defensive
 * fallback for any event created before this field became required.
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
 * Descriptions are clipped to a 90-character preview by default (so every
 * card's height stays consistent regardless of how long its description
 * is) with a "קרא עוד"/"הצג פחות" toggle to expand/collapse the full text
 * in place.
 *
 * @param {{
 *   event: object,
 *   isAdmin: boolean,
 *   isHighlighted?: boolean,
 *   onEdit: () => void,
 *   onDelete: () => void,
 *   isViewingRegistrations: boolean,
 *   onToggleRegistrations: () => void,
 * }} props
 */
function EventCard({ event, isAdmin, isHighlighted, onEdit, onDelete, isViewingRegistrations, onToggleRegistrations }) {
  const expired = isEventExpired(event)
  const registrationClosed = isRegistrationClosed(event)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [sharing, setSharing] = useState(false)
  const { preview, isTruncated } = previewDescription(event.description, DESCRIPTION_PREVIEW_CHARS)

  return (
    <div id={`event-${event._id}`} className={`card event-card ${isHighlighted ? 'is-highlighted' : ''}`}>

      {expired && <span className="event-expired-badge">הסתיים</span>}
      {event.photoUrl && (
        <img src={resolvePhotoUrl(event.photoUrl)} alt={event.title} className="event-photo" />
      )}
      <h3>{event.title}</h3>
      <div className="event-meta">
        <p>📅 {formatDate(event.date)}</p>
        <p>🕒 {event.time}</p>
        <p>📍 {event.location}</p>
        <p> עלות : {event.price != null ? `${event.price} ₪` : 'חינם'}</p>
        {event.registrationDeadline && (
          <p>⏳ הרשמה עד: {formatDate(event.registrationDeadline)}</p>
        )}
      </div>
      <p className="event-description">
        {descriptionExpanded || !isTruncated ? event.description : `${preview}…`}
      </p>
      {isTruncated && (
        <button
          type="button"
          className="event-description-toggle"
          onClick={() => setDescriptionExpanded((current) => !current)}
        >
          {descriptionExpanded ? 'הצג פחות' : 'קרא עוד'}
        </button>
      )}

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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSharing((current) => !current)}
            >
              {sharing ? 'סגירת שיתוף' : 'שיתוף'}
            </button>
          </div>
          {isViewingRegistrations && (
            <RegistrationsPanel eventId={event._id} eventTitle={event.title} />
          )}
          {sharing && <ShareBox text={buildEventShareText(event)} />}
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
