import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildJobShareText } from '../../utils/shareText'
import ShareBox from '../shared/ShareBox'
import './JobCard.css'

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
  const { theme } = useTheme()
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = resolvePhotoUrl(job.photoUrl, fallbackLogo)

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

      {job.description && <p className="job-description">{job.description}</p>}

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
