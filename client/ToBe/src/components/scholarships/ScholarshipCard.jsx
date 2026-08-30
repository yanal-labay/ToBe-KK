import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildScholarshipShareText } from '../../utils/shareText'
import { previewText } from '../../utils/previewText'
import ShareBox from '../shared/ShareBox'
import './ScholarshipCard.css'

const DESCRIPTION_PREVIEW_CHARS = 220

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
 * title/deadline/amount/hours block only (top row), while the description
 * and action buttons span the full card width below it. The photo is the
 * last flex child in `.scholarship-card-top`, which lands on the right side
 * in this app's RTL layout (see Layout.jsx). Falls back to the site logo
 * (theme-appropriate, same assets as BrandLogo) when no photo was uploaded.
 * Admins get edit/delete buttons alongside the "לפרטים ולהגשה" link in the
 * same action row; guests only see the link. `scholarship.fieldSelections`
 * (populated server-side, see scholarship.controller.js) is rendered as a
 * row of small pill-shaped bubbles (one per selected option, field name not
 * shown) just above that action row.
 *
 * Descriptions are clipped to a 220-character preview by default (so every
 * card's height stays consistent regardless of how long its description is)
 * with a "קרא עוד"/"הצג פחות" toggle to expand/collapse the full text in
 * place. The toggle only renders when the text was actually longer than that.
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
  const [sharing, setSharing] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const { theme } = useTheme()
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = resolvePhotoUrl(scholarship.photoUrl, fallbackLogo)
  const expired = isScholarshipExpired(scholarship)
  const { preview, isTruncated } = previewText(
    scholarship.description,
    DESCRIPTION_PREVIEW_CHARS
  )

  return (
    <div
      id={`scholarship-${scholarship._id}`}
      className={`card scholarship-card ${isHighlighted ? 'is-highlighted' : ''}`}
    >
      {expired && <span className="scholarship-expired-badge">פג תוקף</span>}
      <div className="scholarship-card-top">
        <div className="scholarship-card-info">
          <h3>{scholarship.title}</h3>
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

      <p className="scholarship-description">
        {descriptionExpanded || !isTruncated ? scholarship.description : `${preview}…`}
      </p>
      {isTruncated && (
        <button
          type="button"
          className="scholarship-description-toggle"
          onClick={() => setDescriptionExpanded((current) => !current)}
        >
          {descriptionExpanded ? 'הצג פחות' : 'קרא עוד'}
        </button>
      )}

      {scholarship.fieldSelections?.length > 0 && (
        <div className="scholarship-tag-bubbles">
          {scholarship.fieldSelections.map((selection) => (
            <span className="scholarship-tag-bubble" key={selection._id}>
              {selection.name}
            </span>
          ))}
        </div>
      )}

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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSharing((current) => !current)}
            >
              {sharing ? 'סגירת שיתוף' : 'שיתוף'}
            </button>
          </>
        )}
      </div>
      {isAdmin && sharing && <ShareBox text={buildScholarshipShareText(scholarship)} />}
    </div>
  )
}

export default ScholarshipCard
