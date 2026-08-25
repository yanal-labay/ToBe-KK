import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { listJobs, createJob, updateJob, deleteJob } from '../services/jobsService'
import { listJobFields } from '../services/jobFieldsService'
import JobForm from '../components/jobs/JobForm'
import JobCard from '../components/jobs/JobCard'
import JobFieldsManager from '../components/jobs/JobFieldsManager'
import JobFilterSidebar from '../components/jobs/JobFilterSidebar'
import './Jobs.css'

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
 * Search (by title) and filtering (by admin-defined fields, and a
 * student-position flag) happen entirely client-side against the
 * already-fetched `jobs` list, same as Scholarships' tag filter — see
 * `visibleJobs` below. The admin-defined fields themselves (name +
 * checkbox options each) come from a separate fetch (`/api/job-fields`),
 * managed independently of any single posting via `JobFieldsManager`.
 */
function Jobs() {
  const { isAdmin } = useAdminSession()

  const [jobs, setJobs] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

  const [fields, setFields] = useState([])

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showFieldsManager, setShowFieldsManager] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({}) // { [fieldId]: optionId[] }
  const [studentOnly, setStudentOnly] = useState(false)

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
    Object.values(selectedOptionIds).some((ids) => ids.length > 0) ||
    studentOnly

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedOptionIds({})
    setStudentOnly(false)
  }

  const visibleJobs = jobs.filter((job) => {
    const term = searchTerm.trim().toLowerCase()
    if (term && !job.title.toLowerCase().includes(term)) return false
    for (const field of fields) {
      const selected = selectedOptionIds[field._id]
      if (!selected || selected.length === 0) continue
      if (!job.fieldSelections.some((sel) => selected.includes(sel._id))) return false
    }
    if (studentOnly && !job.isStudentPosition) return false
    return true
  })

  return (
    <div className="jobs-page">
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
        <JobFieldsManager fields={fields} onFieldsChanged={loadFields} />
      )}

      {isAdmin && creating && (
        <JobForm
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

          <div className="jobs-list">
            {visibleJobs.map((job) =>
              isAdmin && editingId === job._id ? (
                <JobForm
                  key={job._id}
                  fields={fields}
                  initialValues={{
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    isStudentPosition: job.isStudentPosition,
                    description: job.description || '',
                    salary: job.salary || '',
                    contactName: job.contactName || '',
                    contactEmail: job.contactEmail || '',
                    contactPhone: job.contactPhone || '',
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
                  onEdit={() => setEditingId(job._id)}
                  onDelete={() => handleDelete(job)}
                />
              )
            )}
          </div>
        </div>

        <aside className="jobs-filter-sidebar">
          <JobFilterSidebar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            fields={fields}
            selectedOptionIds={selectedOptionIds}
            onToggleOption={toggleOption}
            studentOnly={studentOnly}
            onToggleStudentOnly={() => setStudentOnly((current) => !current)}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </aside>
      </div>
    </div>
  )
}

export default Jobs
