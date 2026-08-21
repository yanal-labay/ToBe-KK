import { useTheme } from '../../hooks/useTheme'
import { API_URL } from '../../apiConfig'
import './ScholarshipCard.css'

/** Formats a scholarship's `deadline` (ISO string from the API) for display in Hebrew. */
function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * True once the deadline's calendar day has fully passed (comparing
 * day-only, so the deadline date itself still counts as open). Exported so
 * `Scholarships.jsx` can sink expired scholarships to the bottom of the
 * list without duplicating this date logic.
 */
export function isScholarshipExpired(scholarship) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(scholarship.deadline)
  deadline.setHours(0, 0, 0, 0)
  return deadline.getTime() < today.getTime()
}

/**
 * Read-only display of a single scholarship: the photo sits beside the
 * title/tags/deadline/amount/hours block only (top row), while the
 * description and action buttons span the full card width below it. The
 * photo is the last flex child in `.scholarship-card-top`, which lands on
 * the right side in this app's RTL layout (see Layout.jsx). Falls back to
 * the site logo (theme-appropriate, same assets as BrandLogo) when no photo
 * was uploaded. Admins get edit/delete buttons alongside the "לפרטים
 * ולהגשה" link in the same action row; guests only see the link.
 *
 * @param {{
 *   scholarship: object,
 *   isAdmin: boolean,
 *   isHighlighted?: boolean,
 *   onEdit: () => void,
 *   onDelete: () => void,
 * }} props
 */
function ScholarshipCard({ scholarship, isAdmin, isHighlighted, onEdit, onDelete }) {
  const { theme } = useTheme()
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = scholarship.photoUrl ? `${API_URL}${scholarship.photoUrl}` : fallbackLogo
  const expired = isScholarshipExpired(scholarship)

  return (
    <div
      id={`scholarship-${scholarship._id}`}
      className={`card scholarship-card ${isHighlighted ? 'is-highlighted' : ''}`}
    >
      {expired && <span className="scholarship-expired-badge">פג תוקף</span>}
      <div className="scholarship-card-top">
        <div className="scholarship-card-info">
          <h3>{scholarship.title}</h3>
          {scholarship.tags?.length > 0 && (
            <div className="scholarship-tags">
              {scholarship.tags.map((tag) => (
                <span className="scholarship-tag-chip" key={tag._id}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <p className="scholarship-deadline">📅 הגשה עד: {formatDate(scholarship.deadline)}</p>
          {scholarship.amount != null && <p>💰 סכום המלגה: ₪{scholarship.amount}</p>}
          {scholarship.volunteerHours != null && (
            <p>🙋 נדרשות {scholarship.volunteerHours} שעות התנדבות</p>
          )}
        </div>
        <img
          src={photoSrc}
          alt={scholarship.photoUrl ? scholarship.title : ''}
          className={`scholarship-photo ${!scholarship.photoUrl ? 'is-fallback-logo' : ''}`}
        />
      </div>

      <p className="scholarship-description">{scholarship.description}</p>

      <div className="scholarship-card-actions">
        {isAdmin || !expired ? (
          <a
            href={scholarship.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            לפרטים ולהגשה ↗
          </a>
        ) : (
          <button type="button" className="btn btn-primary scholarship-apply-disabled" disabled>
            ההגשה נסגרה
          </button>
        )}
        {isAdmin && (
          <>
            <button type="button" className="btn btn-outline" onClick={onEdit}>
              עריכה
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDelete}>
              מחיקה
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ScholarshipCard
