import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import ScholarshipForm from '../components/scholarships/ScholarshipForm'
import ScholarshipCard, { isScholarshipExpired } from '../components/scholarships/ScholarshipCard'
import TagManager from '../components/scholarships/TagManager'
import './Scholarships.css'

/**
 * The /scholarships page — same admin-CRUD / guest-view pattern as Events
 * (see pages/Events.jsx), with two additions: a shared Tag list admins
 * manage independently of any post (see TagManager), and a multi-select
 * tag filter for guests, applied client-side against the already-fetched
 * list.
 */
function Scholarships() {
  const { isAdmin } = useAdminSession()

  const [scholarships, setScholarships] = useState([])
  const [tags, setTags] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const loadScholarships = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/scholarships`)
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setScholarships(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  const loadTags = () => {
    fetch(`${API_URL}/api/tags`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setTags)
      .catch(() => {})
  }

  useEffect(() => {
    loadScholarships()
    loadTags()
  }, [])

  const handleCreate = async (formData) => {
    const res = await fetch(`${API_URL}/api/scholarships`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadScholarships()
  }

  const handleUpdate = async (id, formData) => {
    const res = await fetch(`${API_URL}/api/scholarships/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadScholarships()
  }

  const handleDelete = async (scholarship) => {
    if (!window.confirm(`למחוק את המלגה "${scholarship.title}"?`)) return
    const res = await fetch(`${API_URL}/api/scholarships/${scholarship._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadScholarships()
  }

  const toggleTagFilter = (tagId) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    )
  }

  const visibleScholarships =
    selectedTagIds.length === 0
      ? scholarships
      : scholarships.filter((s) => s.tags.some((tag) => selectedTagIds.includes(tag._id)))

  return (
    <div className="scholarships-page">
      <div className="scholarships-page-header">
        <h1>מלגות</h1>
        <div className="scholarships-page-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowTagManager((current) => !current)}
            >
              {showTagManager ? 'סגירת ניהול תגיות' : 'ניהול תגיות'}
            </button>
          )}
          {isAdmin && !creating && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              + מלגה חדשה
            </button>
          )}
        </div>
      </div>

      {isAdmin && showTagManager && <TagManager tags={tags} onTagsChanged={loadTags} />}

      {tags.length > 0 && (
        <div className="tag-filter-bar">
          <button
            type="button"
            className={`tag-filter-chip ${selectedTagIds.length === 0 ? 'is-active' : ''}`}
            onClick={() => setSelectedTagIds([])}
          >
            הכל
          </button>
          {tags.map((tag) => (
            <button
              type="button"
              key={tag._id}
              className={`tag-filter-chip ${selectedTagIds.includes(tag._id) ? 'is-active' : ''}`}
              onClick={() => toggleTagFilter(tag._id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {isAdmin && creating && (
        <ScholarshipForm
          tags={tags}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {loadState === 'loading' && <p>טוען מלגות...</p>}
      {loadState === 'error' && <p className="scholarships-error">לא ניתן לטעון את המלגות כרגע</p>}
      {loadState === 'ready' && visibleScholarships.length === 0 && (
        <p>אין מלגות להצגה כרגע.</p>
      )}

      <div className="scholarships-list">
        {/* Stable sort: groups expired scholarships after active ones while
            preserving each group's original order. */}
        {[...visibleScholarships]
          .sort((a, b) => Number(isScholarshipExpired(a)) - Number(isScholarshipExpired(b)))
          .map((scholarship) =>
          isAdmin && editingId === scholarship._id ? (
            <ScholarshipForm
              key={scholarship._id}
              tags={tags}
              initialValues={{
                title: scholarship.title,
                description: scholarship.description,
                deadline: scholarship.deadline.slice(0, 10),
                url: scholarship.url,
                amount: scholarship.amount != null ? String(scholarship.amount) : '',
                volunteerHours:
                  scholarship.volunteerHours != null ? String(scholarship.volunteerHours) : '',
              }}
              initialTagIds={scholarship.tags.map((tag) => tag._id)}
              existingPhotoUrl={scholarship.photoUrl}
              submitLabel="עדכון"
              onSubmit={(formData) => handleUpdate(scholarship._id, formData)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <ScholarshipCard
              key={scholarship._id}
              scholarship={scholarship}
              isAdmin={isAdmin}
              onEdit={() => setEditingId(scholarship._id)}
              onDelete={() => handleDelete(scholarship)}
            />
          )
        )}
      </div>
    </div>
  )
}

export default Scholarships
