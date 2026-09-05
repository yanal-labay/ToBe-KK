import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useScrollToOpenPanel } from '../../hooks/useScrollToOpenPanel'
import { listJobs, createJob, updateJob, deleteJob } from './JobsService'
import {
  listJobFields,
  createJobField,
  renameJobField,
  deleteJobField,
  addJobFieldOption,
  deleteJobFieldOption,
} from './JobFieldsService'
import JobForm from './JobForm'
import JobCard from './JobCard'
import FieldsManager from '../../GUIComponents/Widgets/FieldsManager'
import FilterSidebar from '../../GUIComponents/Widgets/FilterSidebar'
import SortBar from '../../GUIComponents/Widgets/SortBar'
import { byDateDesc, byTextAsc } from '../../utils/sortComparators'
import './Jobs.css'

// The write half of JobFieldsService, in the shape the shared FieldsManager
// expects. At module scope because it's the same object every render.
const fieldsApi = {
  create: createJobField,
  rename: renameJobField,
  remove: deleteJobField,
  addOption: addJobFieldOption,
  removeOption: deleteJobFieldOption,
}

// Orderings offered by the sort bar. `added` is first so it's the default,
// matching the order the page used before the bar existed.
//
// There's deliberately no salary option: `Job.salary` is a free-text string
// ("לפי ניסיון", ranges, "₪45 לשעה"), so it can't be ordered numerically.
// Jobs also has no expiry concept, so unlike Events/Scholarships nothing is
// pinned to the bottom and the chosen sort applies to the whole list.
const SORT_OPTIONS = [
  { value: 'added', label: 'תאריך הוספה — החדש ראשון', compare: byDateDesc('createdAt') },
  { value: 'title', label: 'שם המשרה — א-ת', compare: byTextAsc('title') },
  { value: 'company', label: 'שם החברה — א-ת', compare: byTextAsc('company') },
  { value: 'location', label: 'מיקום — א-ת', compare: byTextAsc('location') },
]

/** Groups a job's populated `fieldSelections` into `{ [fieldId]: optionId[] }`, for seeding JobForm's edit state. */
function fieldSelectionsToFieldValues(fieldSelections) {
  const values = {}
  for (const selection of fieldSelections) {
    const key = selection.field._id
    if (!values[key]) values[key] = []
    values[key].push(selection._id)
  }
  return values
}

/**
 * The /jobs page ("לוח משרות") — same admin-CRUD / guest-view pattern as
 * Scholarships. Admins fetch every posting (including inactive ones, via
 * GET /api/jobs/admin) while guests only ever receive active postings (GET
 * /api/jobs already excludes inactive ones server-side) — so an inactive
 * posting is never even present in a guest's data, not just hidden in the
 * UI.
 *
 * Search (by title) and filtering (by admin-defined fields) happen entirely
 * client-side against the already-fetched `jobs` list, same as
 * Scholarships' tag filter — see
 * `visibleJobs` below. The admin-defined fields themselves (name +
 * checkbox options each) come from a separate fetch (`/api/job-fields`),
 * managed independently of any single posting via the shared `FieldsManager`.
 */
function Jobs() {
  const { isAdmin } = useAdminSession()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight')

  const [jobs, setJobs] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [highlightedId, setHighlightedId] = useState(null)

  const [fields, setFields] = useState([])

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showFieldsManager, setShowFieldsManager] = useState(false)
  const [viewingApplicationsId, setViewingApplicationsId] = useState(null)

  // One form is open at a time — either the create form or exactly one
  // card's edit form. The fields manager toggles independently of both, so
  // each gets its own scroll hook rather than one merged id: that way only
  // the panel that just opened scrolls, with no precedence rules needed.
  const openFormId = creating
    ? 'job-form-new'
    : editingId
      ? `job-form-${editingId}`
      : null
  const openManagerId = showFieldsManager ? 'job-fields-manager' : null

  useScrollToOpenPanel(openFormId)
  useScrollToOpenPanel(openManagerId)

  // The applicants panel gets its own scroll hook too. The panel renders *inside* its card, so the card is what
  // stays sharp above the backdrop — and is therefore also the scroll target,
  // reusing the id the ?highlight= effect below already relies on. Anchoring at
  // the card's top also survives the panel growing when its fetch resolves.
  const openSubmissionsId = viewingApplicationsId ? `job-${viewingApplicationsId}` : null
  useScrollToOpenPanel(openSubmissionsId)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({}) // { [fieldId]: optionId[] }
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0].value)

  const loadJobs = () => {
    setLoadState('loading')
    listJobs({ isAdmin })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setJobs(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  const loadFields = () => {
    listJobFields()
      .then((res) => (res.ok ? res.json() : []))
      .then(setFields)
      .catch(() => {})
  }

  useEffect(() => {
    loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    loadFields()
  }, [])

  // Scrolls to and briefly highlights the job named by ?highlight=<id>
  // (arriving from an admin's share link) once the list has loaded. Same
  // shape as the equivalent effects in Events.jsx and Scholarships.jsx.
  useEffect(() => {
    if (!highlightParam || loadState !== 'ready') return
    if (!jobs.some((job) => job._id === highlightParam)) return

    setHighlightedId(highlightParam)
    const card = document.getElementById(`job-${highlightParam}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const timeout = setTimeout(() => setHighlightedId(null), 2500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam, loadState])

  const handleCreate = async (formData) => {
    const res = await createJob(formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadJobs()
  }

  const handleUpdate = async (id, formData) => {
    const res = await updateJob(id, formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadJobs()
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`למחוק את המשרה "${job.title}"?`)) return
    const res = await deleteJob(job._id)
    const data = await res.json()
    if (!data.success) return
    loadJobs()
  }

  const toggleOption = (fieldId, optionId) => {
    setSelectedOptionIds((current) => {
      const currentForField = current[fieldId] || []
      const nextForField = currentForField.includes(optionId)
        ? currentForField.filter((id) => id !== optionId)
        : [...currentForField, optionId]
      return { ...current, [fieldId]: nextForField }
    })
  }

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    Object.values(selectedOptionIds).some((ids) => ids.length > 0)

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedOptionIds({})
  }

  const visibleJobs = jobs.filter((job) => {
    const term = searchTerm.trim().toLowerCase()
    if (term && !job.title.toLowerCase().includes(term)) return false
    for (const field of fields) {
      const selected = selectedOptionIds[field._id]
      if (!selected || selected.length === 0) continue
      if (!job.fieldSelections.some((sel) => selected.includes(sel._id))) return false
    }
    return true
  })

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortKey) ?? SORT_OPTIONS[0]
  const sortedJobs = [...visibleJobs].sort(activeSort.compare)

  return (
    <div className="jobs-page">
      {isAdmin && (openFormId || openManagerId || openSubmissionsId) && (
        <div className="form-focus-overlay" />
      )}

      <div className="jobs-page-header">
        <h1>לוח משרות</h1>
        <div className="jobs-page-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowFieldsManager((current) => !current)}
            >
              {showFieldsManager ? 'סגירת ניהול שדות' : 'ניהול שדות'}
            </button>
          )}
          {isAdmin && !creating && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              + משרה חדשה
            </button>
          )}
        </div>
      </div>

      {isAdmin && showFieldsManager && (
        <FieldsManager
          panelId="job-fields-manager"
          fields={fields}
          onFieldsChanged={loadFields}
          onClose={() => setShowFieldsManager(false)}
          api={fieldsApi}
        />
      )}

      {isAdmin && creating && (
        <JobForm
          formId="job-form-new"
          fields={fields}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="jobs-page-layout">
        <div className="jobs-page-main">
          {loadState === 'loading' && <p>טוען משרות...</p>}
          {loadState === 'error' && <p className="jobs-error">לא ניתן לטעון את המשרות כרגע</p>}
          {loadState === 'ready' && jobs.length === 0 && <p>אין משרות להצגה כרגע.</p>}
          {loadState === 'ready' && jobs.length > 0 && hasActiveFilters && (
            <p className="jobs-match-count">{visibleJobs.length} משרות נמצאו</p>
          )}
          {loadState === 'ready' && jobs.length > 0 && visibleJobs.length === 0 && (
            <p>אין משרות התואמות את החיפוש/הסינון.</p>
          )}

          {loadState === 'ready' && jobs.length > 0 && (
            <SortBar options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
          )}

          <div className="jobs-list">
            {sortedJobs.map((job) =>
              isAdmin && editingId === job._id ? (
                <JobForm
                  key={job._id}
                  formId={`job-form-${job._id}`}
                  fields={fields}
                  initialValues={{
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description || '',
                    salary: job.salary || '',
                    contactName: job.contactName || '',
                    contactEmail: job.contactEmail || '',
                    contactPhone: job.contactPhone || '',
                    applicationMethod: job.applicationMethod || 'contact',
                    applicationUrl: job.applicationUrl || '',
                    isActive: job.isActive,
                  }}
                  initialFieldValues={fieldSelectionsToFieldValues(job.fieldSelections)}
                  existingPhotoUrl={job.photoUrl}
                  submitLabel="עדכון"
                  onSubmit={(formData) => handleUpdate(job._id, formData)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <JobCard
                  key={job._id}
                  job={job}
                  isAdmin={isAdmin}
                  isHighlighted={highlightedId === job._id}
                  onEdit={() => setEditingId(job._id)}
                  onDelete={() => handleDelete(job)}
                  isViewingApplications={viewingApplicationsId === job._id}
                  onToggleApplications={() =>
                    setViewingApplicationsId((current) =>
                      current === job._id ? null : job._id
                    )
                  }
                  // Keeps the button's count honest after the open panel adds
                  // or removes a row — see the note in Events.jsx.
                  onApplicationCountChange={(count) =>
                    setJobs((current) =>
                      current.map((item) =>
                        item._id === job._id ? { ...item, applicationCount: count } : item
                      )
                    )
                  }
                />
              )
            )}
          </div>
        </div>

        <aside className="jobs-filter-sidebar">
          <FilterSidebar
            searchLabel="חיפוש לפי שם משרה"
            searchPlaceholder="לדוגמה: מדריך/ה, מזכיר/ה..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            fields={fields}
            selectedOptionIds={selectedOptionIds}
            onToggleOption={toggleOption}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </aside>
      </div>
    </div>
  )
}

export default Jobs
