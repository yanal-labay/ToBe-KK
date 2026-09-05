import { useMemo, useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import { buildJobShareText } from '../../utils/shareText'
import { previewText } from '../../utils/previewText'
import { formatDate } from '../../utils/formatDate'
import ShareBox from '../../GUIComponents/Widgets/ShareBox'
import SignupForm from '../../GUIComponents/Widgets/SignupForm'
import SubmissionsPanel from '../../GUIComponents/Widgets/SubmissionsPanel'
import {
  applyToJob,
  listApplications,
  updateApplicationStatus,
  deleteApplication,
} from './JobsService'
import './JobCard.css'

const DESCRIPTION_PREVIEW_CHARS = 220

// Hiring pipeline for "leave your details" postings. Colors follow the app's
// reserved status palette and every mark also carries an icon + label, so
// identity never relies on color alone.
const APPLICATION_STATUS_ORDER = ['submitted', 'in_review', 'handled']
const APPLICATION_STATUS_META = {
  submitted: { label: 'הוגש', icon: '🕓', color: 'var(--color-text-muted)' },
  in_review: { label: 'בטיפול', icon: '🔎', color: '#b8860b' },
  handled: { label: 'טופל', icon: '✅', color: '#0ca30c' },
}

const APPLICATION_LABELS = {
  chartAria: 'גרף סיכום סטטוס מועמדים',
  addButton: '+ הוספת מועמד',
  loading: 'טוען מועמדים...',
  loadError: 'לא ניתן לטעון את המועמדים',
  empty: 'עדיין אין מועמדים למשרה זו.',
  exportPrefix: 'מועמדים',
  confirmDelete: (name) => `למחוק את ${name} מרשימת המועמדים?`,
  deleteAria: (name) => `מחק את ${name} מרשימת המועמדים`,
  deleteTitle: 'מחיקת מועמד',
}

/**
 * Read-only display of a single job posting — structurally the same as
 * `ScholarshipCard`: the photo sits beside the title/company/location/
 * salary block only (top row), while the description and contact line span
 * the full card width below it. Falls back to the site logo
 * (theme-appropriate, same as `ScholarshipCard`) when no photo was
 * uploaded. How a visitor applies depends on `job.applicationMethod`:
 * "contact" shows the contact line, "link" a button out to an external
 * site, and "form" a SignupForm whose submissions admins read through
 * SubmissionsPanel behind the מועמדים button.
 * Admins get edit/delete plus an "לא פעיל" badge when `isActive` is false
 * (guests never receive inactive postings at all, see job.controller.js).
 * `job.fieldSelections` (populated server-side, see job.controller.js) is
 * an array of `{ _id, name, field: { _id, name } }` — rendered as a row of
 * small pill-shaped bubbles (one per selected option, field name not
 * shown) above the apply control, so a visitor reads what the posting is
 * tagged as before the button that acts on it.
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
 *   isViewingApplications?: boolean,
 *   onToggleApplications?: () => void,
 * }} props
 */
function JobCard({
  job,
  isAdmin,
  isHighlighted,
  onEdit,
  onDelete,
  isViewingApplications,
  onToggleApplications,
  onApplicationCountChange,
}) {
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

  // Memoised because SubmissionsPanel re-fetches whenever `api` changes
  // identity — a fresh object each render would loop it forever.
  const applicationsApi = useMemo(
    () => ({
      list: () => listApplications(job._id),
      add: (values) => applyToJob(job._id, values),
      updateStatus: (applicationId, body) =>
        updateApplicationStatus(job._id, applicationId, body),
      remove: (applicationId) => deleteApplication(job._id, applicationId),
    }),
    [job._id]
  )

  return (
    // The applicants panel renders inside this card, so the whole card is what
    // stays sharp above the page's focus overlay (same as EventCard).
    <div
      id={`job-${job._id}`}
      className={`card job-card ${isHighlighted ? 'is-highlighted' : ''} ${
        isViewingApplications ? 'form-focus-panel' : ''
      }`}
    >
      {isAdmin && !job.isActive && <span className="job-inactive-badge">לא פעיל</span>}
      <div className="job-card-top">
        <div className="job-card-info">
          <h3>{job.title}</h3>
          <p className="job-company">🏢 {job.company}</p>
          <p className="job-company">📍 {job.location}</p>
          {job.salary && <p className="job-company">💰 {job.salary}</p>}
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

      {job.fieldSelections?.length > 0 && (
        <div className="job-tag-bubbles">
          {job.fieldSelections.map((selection) => (
            <span className="job-tag-bubble" key={selection._id}>
              {selection.name}
            </span>
          ))}
        </div>
      )}

      {job.applicationMethod === 'contact' && hasContact && (
        <p className="job-contact">
          ליצירת קשר{job.contactName ? ` עם ${job.contactName}` : ''}
          {job.contactEmail ? ` · 📧 ${job.contactEmail}` : ''}
          {job.contactPhone ? ` · 📞 ${job.contactPhone}` : ''}
        </p>
      )}

      {job.applicationMethod === 'link' && job.applicationUrl && (
        <p className="job-apply-link">
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            להגשת מועמדות ↗
          </a>
        </p>
      )}

      {job.applicationMethod === 'form' && !isAdmin && (
        <SignupForm
          onSubmit={(values) => applyToJob(job._id, values)}
          openLabel="השארת פרטים"
          submitLabel="שליחת הפרטים"
          submittingLabel="שולח..."
          errorFallback="שליחת הפרטים נכשלה"
          successLines={['✔ הפרטים נשלחו!', 'ניצור איתך קשר :)']}
        />
      )}

      <p className="job-added-date">נוסף ב{formatDate(job.createdAt)}</p>

      {isAdmin && (
        <>
          <div className="job-card-actions">
            <button type="button" className="btn btn-outline" onClick={onEdit}>
              עריכה
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDelete}>
              מחיקה
            </button>
            {/* Count from GET /api/jobs/admin; still clickable at zero so the
                panel's manual "+ הוספת מועמד" form stays reachable. Same
                reasoning as EventCard. */}
            {job.applicationMethod === 'form' && (
              <button type="button" className="btn btn-outline" onClick={onToggleApplications}>
                {isViewingApplications
                  ? 'הסתרת מועמדים'
                  : `מועמדים (${job.applicationCount ?? 0})`}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSharing((current) => !current)}
            >
              {sharing ? 'סגירת שיתוף' : 'שיתוף'}
            </button>
          </div>
          {isViewingApplications && job.applicationMethod === 'form' && (
            <SubmissionsPanel
              parentTitle={job.title}
              statusOrder={APPLICATION_STATUS_ORDER}
              statusMeta={APPLICATION_STATUS_META}
              api={applicationsApi}
              labels={APPLICATION_LABELS}
              onCountChange={onApplicationCountChange}
            />
          )}
          {sharing && <ShareBox text={buildJobShareText(job)} />}
        </>
      )}
    </div>
  )
}

export default JobCard
