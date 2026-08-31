import { useMemo, useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildEventShareText } from '../../utils/shareText'
import { previewText } from '../../utils/previewText'
import { formatDate } from '../../utils/formatDate'
import ShareBox from '../../GUIComponents/Widgets/ShareBox'
import SignupForm from '../../GUIComponents/Widgets/SignupForm'
import SubmissionsPanel from '../../GUIComponents/Widgets/SubmissionsPanel'
import {
  registerForEvent,
  listRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
} from './EventsService'
import './EventCard.css'

const DESCRIPTION_PREVIEW_CHARS = 90

// Display order for both the chart rows and the per-row status <select> in
// SubmissionsPanel; colors follow the app's reserved status palette
// (green=good, red=critical) so identity never relies on color alone —
// every mark also carries an icon + label.
const REGISTRATION_STATUS_ORDER = ['signed_up', 'arrived', 'did_not_arrive']
const REGISTRATION_STATUS_META = {
  signed_up: { label: 'נרשם', icon: '🕓', color: 'var(--color-text-muted)' },
  arrived: { label: 'הגיע', icon: '✅', color: '#0ca30c' },
  did_not_arrive: { label: 'לא הגיע', icon: '❌', color: '#d03b3b' },
}

const REGISTRATION_LABELS = {
  chartAria: 'גרף סיכום סטטוס נרשמים',
  addButton: '+ הוספת נרשם',
  loading: 'טוען נרשמים...',
  loadError: 'לא ניתן לטעון את הנרשמים',
  empty: 'עדיין אין נרשמים לאירוע זה.',
  exportPrefix: 'נרשמים',
  confirmDelete: (name) => `למחוק את ${name} מרשימת הנרשמים?`,
  deleteAria: (name) => `מחק את ${name} מרשימת הנרשמים`,
  deleteTitle: 'מחיקת נרשם',
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
 * `SubmissionsPanel` when toggled open), guests get the `SignupForm`
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
  const { theme } = useTheme()
  // Events with no uploaded photo fall back to the site logo, same as
  // JobCard and ScholarshipCard — so every card in a list has an image and
  // they stay the same height. Theme-appropriate, matching BrandLogo.
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = resolvePhotoUrl(event.photoUrl, fallbackLogo)
  const { preview, isTruncated } = previewText(event.description, DESCRIPTION_PREVIEW_CHARS)

  // Memoised because SubmissionsPanel re-fetches whenever `api` changes
  // identity — a fresh object each render would loop it forever.
  const registrationsApi = useMemo(
    () => ({
      list: () => listRegistrations(event._id),
      add: (values) => registerForEvent(event._id, values),
      updateStatus: (registrationId, body) =>
        updateRegistrationStatus(event._id, registrationId, body),
      remove: (registrationId) => deleteRegistration(event._id, registrationId),
    }),
    [event._id]
  )

  return (
    <div id={`event-${event._id}`} className={`card event-card ${isHighlighted ? 'is-highlighted' : ''}`}>

      {(expired || (isAdmin && !event.isActive)) && (
        <div className="event-card-badges">
          {expired && <span className="event-badge event-expired-badge">הסתיים</span>}
          {isAdmin && !event.isActive && (
            <span className="event-badge event-inactive-badge">לא פעיל</span>
          )}
        </div>
      )}
      <img
        src={photoSrc}
        // Empty alt when it's the fallback: the logo is decorative here and
        // announcing it would just repeat the title below.
        alt={event.photoUrl ? event.title : ''}
        className={`event-photo ${!event.photoUrl ? 'is-fallback-logo' : ''}`}
      />
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

      {event.fieldSelections?.length > 0 && (
        <div className="event-tag-bubbles">
          {event.fieldSelections.map((selection) => (
            <span className="event-tag-bubble" key={selection._id}>
              {selection.name}
            </span>
          ))}
        </div>
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
            <SubmissionsPanel
              parentTitle={event.title}
              statusOrder={REGISTRATION_STATUS_ORDER}
              statusMeta={REGISTRATION_STATUS_META}
              api={registrationsApi}
              labels={REGISTRATION_LABELS}
            />
          )}
          {sharing && <ShareBox text={buildEventShareText(event)} />}
        </>
      ) : registrationClosed ? (
        <button type="button" className="btn btn-outline event-register-disabled" disabled>
          ההרשמה נסגרה
        </button>
      ) : (
        <SignupForm
          onSubmit={(values) => registerForEvent(event._id, values)}
          openLabel="הרשמה לאירוע"
          submitLabel="אישור הרשמה"
          submittingLabel="נרשם..."
          errorFallback="ההרשמה נכשלה"
          successLines={['✔ נרשמת בהצלחה!', 'ניצור איתך קשר :)']}
        />
      )}
    </div>
  )
}

export default EventCard
