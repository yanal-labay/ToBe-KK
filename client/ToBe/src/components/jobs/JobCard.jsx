import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildJobShareText } from '../../utils/shareText'
import { previewText } from '../../utils/previewText'
import ShareBox from '../shared/ShareBox'
import './JobCard.css'

const DESCRIPTION_PREVIEW_CHARS = 220

/**
 * Read-only display of a single job posting — structurally the same as
 * `ScholarshipCard`: the photo sits beside the title/company/location/
 * salary block only (top row), while the description and contact line span
 * the full card width below it. Falls back to the site logo
 * (theme-appropriate, same as `ScholarshipCard`) when no photo was
 * uploaded. Unlike scholarships, there's no guest-facing action — jobs
 * have no "apply" URL, guests just read the contact details off the card.
 * Admins get edit/delete plus an "לא פעיל" badge when `isActive` is false
 * (guests never receive inactive postings at all, see job.controller.js).
 * `job.fieldSelections` (populated server-side, see job.controller.js) is
 * an array of `{ _id, name, field: { _id, name } }` — rendered as a row of
 * small pill-shaped bubbles (one per selected option, field name not
 * shown) just above the action buttons.
 *
 * Descriptions are clipped to a 220-character preview by default (matching
 * ScholarshipCard) with a "קרא עוד"/"הצג פחות" toggle to expand/collapse the
 * full text in place. The toggle only renders when the text was actually
 * longer than that, and the whole block is skipped when a job has no
 * description at all — unlike scholarships, it's optional.
 *
 * @param {{
 *   job: object,
 *   isAdmin: boolean,
 *   isHighlighted?: boolean,
 *   onEdit: () => void,
 *   onDelete: () => void,
 * }} props
 */
function JobCard({ job, isAdmin, isHighlighted, onEdit, onDelete }) {
  const [sharing, setSharing] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const { theme } = useTheme()
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = resolvePhotoUrl(job.photoUrl, fallbackLogo)

  // Unlike scholarships, a job's description is optional (job.model.js
  // defaults it to null), so fall back to an empty string — the block below
  // is skipped entirely in that case anyway.
  const { preview, isTruncated } = previewText(
    job.description || '',
    DESCRIPTION_PREVIEW_CHARS
  )

  const hasContact = job.contactName || job.contactEmail || job.contactPhone

  return (
    <div id={`job-${job._id}`} className={`card job-card ${isHighlighted ? 'is-highlighted' : ''}`}>
      {isAdmin && !job.isActive && <span className="job-inactive-badge">לא פעיל</span>}
      <div className="job-card-top">
        <div className="job-card-info">
          <h3>{job.title}</h3>
          <p className="job-company">🏢 {job.company}</p>
          <p className="job-company">📍 {job.location}</p>
          {job.salary && <p className="job-company">💰 {job.salary}</p>}
          {job.isStudentPosition && <p className="job-company">🎓 משרת סטודנטים</p>}
        </div>
        <img
          src={photoSrc}
          alt={job.photoUrl ? job.title : ''}
          className={`job-photo ${!job.photoUrl ? 'is-fallback-logo' : ''}`}
        />
      </div>

      {job.description && (
        <>
          <p className="job-description">
            {descriptionExpanded || !isTruncated ? job.description : `${preview}…`}
          </p>
          {isTruncated && (
            <button
              type="button"
              className="job-description-toggle"
              onClick={() => setDescriptionExpanded((current) => !current)}
            >
              {descriptionExpanded ? 'הצג פחות' : 'קרא עוד'}
            </button>
          )}
        </>
      )}

      {hasContact && (
        <p className="job-contact">
          ליצירת קשר{job.contactName ? ` עם ${job.contactName}` : ''}
          {job.contactEmail ? ` · 📧 ${job.contactEmail}` : ''}
          {job.contactPhone ? ` · 📞 ${job.contactPhone}` : ''}
        </p>
      )}

      {job.fieldSelections?.length > 0 && (
        <div className="job-tag-bubbles">
          {job.fieldSelections.map((selection) => (
            <span className="job-tag-bubble" key={selection._id}>
              {selection.name}
            </span>
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <div className="job-card-actions">
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
          </div>
          {sharing && <ShareBox text={buildJobShareText(job)} />}
        </>
      )}
    </div>
  )
}

export default JobCard
