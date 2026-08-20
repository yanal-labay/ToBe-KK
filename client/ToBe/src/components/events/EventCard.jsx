import { API_URL } from '../../apiConfig'
import RegisterForm from './RegisterForm'
import RegistrationsPanel from './RegistrationsPanel'
import './EventCard.css'

function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function EventCard({ event, isAdmin, onEdit, onDelete, isViewingRegistrations, onToggleRegistrations }) {
  return (
    <div className="card event-card">
      {event.photoUrl && (
        <img src={`${API_URL}${event.photoUrl}`} alt={event.title} className="event-photo" />
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
      ) : (
        <RegisterForm eventId={event._id} />
      )}
    </div>
  )
}

export default EventCard
