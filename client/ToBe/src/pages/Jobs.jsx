import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import JobForm from '../components/jobs/JobForm'
import JobCard from '../components/jobs/JobCard'
import './Jobs.css'

/**
 * The /jobs page ("לוח משרות") — same admin-CRUD / guest-view pattern as
 * Scholarships, minus the tag system (jobs have no tag/filter concept).
 * Admins fetch every posting (including inactive ones, via GET /api/jobs/
 * admin) while guests only ever receive active postings (GET /api/jobs
 * already excludes inactive ones server-side) — so an inactive posting is
 * never even present in a guest's data, not just hidden in the UI.
 */
function Jobs() {
  const { isAdmin } = useAdminSession()

  const [jobs, setJobs] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const loadJobs = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/jobs${isAdmin ? '/admin' : ''}`, { credentials: 'include' })
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

  useEffect(() => {
    loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const handleCreate = async (formData) => {
    const res = await fetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadJobs()
  }

  const handleUpdate = async (id, formData) => {
    const res = await fetch(`${API_URL}/api/jobs/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadJobs()
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`למחוק את המשרה "${job.title}"?`)) return
    const res = await fetch(`${API_URL}/api/jobs/${job._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadJobs()
  }

  return (
    <div className="jobs-page">
      <div className="jobs-page-header">
        <h1>לוח משרות</h1>
        {isAdmin && !creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            + משרה חדשה
          </button>
        )}
      </div>

      {isAdmin && creating && (
        <JobForm submitLabel="שמירה" onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {loadState === 'loading' && <p>טוען משרות...</p>}
      {loadState === 'error' && <p className="jobs-error">לא ניתן לטעון את המשרות כרגע</p>}
      {loadState === 'ready' && jobs.length === 0 && <p>אין משרות להצגה כרגע.</p>}

      <div className="jobs-list">
        {jobs.map((job) =>
          isAdmin && editingId === job._id ? (
            <JobForm
              key={job._id}
              initialValues={{
                title: job.title,
                company: job.company,
                location: job.location,
                jobType: job.jobType || '',
                description: job.description || '',
                salary: job.salary || '',
                contactName: job.contactName || '',
                contactEmail: job.contactEmail || '',
                contactPhone: job.contactPhone || '',
                isActive: job.isActive,
              }}
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
  )
}

export default Jobs
