import { useTheme } from '../../hooks/useTheme'
import { API_URL } from '../../apiConfig'
import './JobCard.css'

const JOB_TYPE_LABELS = {
  fulltime: 'משרה מלאה',
  parttime: 'משרה חלקית',
}

/**
 * Read-only display of a single job posting — structurally the same as
 * `ScholarshipCard`: the photo sits beside the title/company/location/
 * job-type/salary block only (top row), while the description and contact
 * line span the full card width below it. Falls back to the site logo
 * (theme-appropriate, same as `ScholarshipCard`) when no photo was
 * uploaded. Unlike scholarships, there's no guest-facing action — jobs
 * have no "apply" URL, guests just read the contact details off the card.
 * Admins get edit/delete plus an "לא פעיל" badge when `isActive` is false
 * (guests never receive inactive postings at all, see job.controller.js).
 *
 * @param {{
 *   job: object,
 *   isAdmin: boolean,
 *   onEdit: () => void,
 *   onDelete: () => void,
 * }} props
 */
function JobCard({ job, isAdmin, onEdit, onDelete }) {
  const { theme } = useTheme()
  const fallbackLogo = theme === 'dark' ? '/logodark.png' : '/logo.png'
  const photoSrc = job.photoUrl ? `${API_URL}${job.photoUrl}` : fallbackLogo

  const hasContact = job.contactName || job.contactEmail || job.contactPhone

  return (
    <div className="card job-card">
      {isAdmin && !job.isActive && <span className="job-inactive-badge">לא פעיל</span>}
      <div className="job-card-top">
        <div className="job-card-info">
          <h3>{job.title}</h3>
          <p className="job-company">🏢 {job.company}</p>
          <p className="job-company">📍 {job.location}</p>
          {job.jobType && <p className="job-company">🕒 {JOB_TYPE_LABELS[job.jobType]}</p>}
          {job.salary && <p className="job-company">💰 {job.salary}</p>}
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

      {isAdmin && (
        <div className="job-card-actions">
          <button type="button" className="btn btn-outline" onClick={onEdit}>
            עריכה
          </button>
          <button type="button" className="btn btn-secondary" onClick={onDelete}>
            מחיקה
          </button>
        </div>
      )}
    </div>
  )
}

export default JobCard
