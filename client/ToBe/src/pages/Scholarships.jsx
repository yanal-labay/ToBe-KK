import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import ScholarshipForm from '../components/scholarships/ScholarshipForm'
import ScholarshipCard, { isScholarshipExpired } from '../components/scholarships/ScholarshipCard'
import ScholarshipFieldsManager from '../components/scholarships/ScholarshipFieldsManager'
import ScholarshipFilterSidebar from '../components/scholarships/ScholarshipFilterSidebar'
import './Scholarships.css'

/** Groups a scholarship's populated `fieldSelections` into `{ [fieldId]: optionId[] }`, for seeding ScholarshipForm's edit state. */
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
 * The /scholarships page — same admin-CRUD / guest-view pattern as Events
 * (see pages/Events.jsx), with the same filtering system as Jobs (see
 * pages/Jobs.jsx): a shared admin-defined field/option list managed
 * independently of any post (see ScholarshipFieldsManager), and a
 * search-by-title + per-field checkbox filter sidebar for guests, applied
 * client-side against the already-fetched list.
 */
function Scholarships() {
  const { isAdmin } = useAdminSession()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight')

  const [scholarships, setScholarships] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [highlightedId, setHighlightedId] = useState(null)

  const [fields, setFields] = useState([])

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showFieldsManager, setShowFieldsManager] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({}) // { [fieldId]: optionId[] }

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

  const loadFields = () => {
    fetch(`${API_URL}/api/scholarship-fields`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setFields)
      .catch(() => {})
  }

  useEffect(() => {
    loadScholarships()
    loadFields()
  }, [])

  // Scrolls to and briefly highlights the scholarship named by
  // ?highlight=<id> (arriving from the /schedule calendar) once loaded.
  useEffect(() => {
    if (!highlightParam || loadState !== 'ready') return
    if (!scholarships.some((scholarship) => scholarship._id === highlightParam)) return

    setHighlightedId(highlightParam)
    const card = document.getElementById(`scholarship-${highlightParam}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const timeout = setTimeout(() => setHighlightedId(null), 2500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam, loadState])

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
    searchTerm.trim() !== '' || Object.values(selectedOptionIds).some((ids) => ids.length > 0)

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedOptionIds({})
  }

  const visibleScholarships = scholarships.filter((scholarship) => {
    const term = searchTerm.trim().toLowerCase()
    if (term && !scholarship.title.toLowerCase().includes(term)) return false
    for (const field of fields) {
      const selected = selectedOptionIds[field._id]
      if (!selected || selected.length === 0) continue
      if (!scholarship.fieldSelections.some((sel) => selected.includes(sel._id))) return false
    }
    return true
  })

  return (
    <div className="scholarships-page">
      <div className="scholarships-page-header">
        <h1>מלגות</h1>
        <div className="scholarships-page-header-actions">
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
              + מלגה חדשה
            </button>
          )}
        </div>
      </div>

      {isAdmin && showFieldsManager && (
        <ScholarshipFieldsManager fields={fields} onFieldsChanged={loadFields} />
      )}

      {isAdmin && creating && (
        <ScholarshipForm
          fields={fields}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="scholarships-page-layout">
        <div className="scholarships-page-main">
          {loadState === 'loading' && <p>טוען מלגות...</p>}
          {loadState === 'error' && (
            <p className="scholarships-error">לא ניתן לטעון את המלגות כרגע</p>
          )}
          {loadState === 'ready' && scholarships.length === 0 && <p>אין מלגות להצגה כרגע.</p>}
          {loadState === 'ready' && scholarships.length > 0 && hasActiveFilters && (
            <p className="scholarships-match-count">{visibleScholarships.length} מלגות נמצאו</p>
          )}
          {loadState === 'ready' && scholarships.length > 0 && visibleScholarships.length === 0 && (
            <p>אין מלגות התואמות את החיפוש/הסינון.</p>
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
                    fields={fields}
                    initialValues={{
                      title: scholarship.title,
                      description: scholarship.description,
                      deadline: scholarship.deadline.slice(0, 10),
                      url: scholarship.url,
                      amount: scholarship.amount != null ? String(scholarship.amount) : '',
                      volunteerHours:
                        scholarship.volunteerHours != null
                          ? String(scholarship.volunteerHours)
                          : '',
                    }}
                    initialFieldValues={fieldSelectionsToFieldValues(scholarship.fieldSelections)}
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
                    isHighlighted={highlightedId === scholarship._id}
                    onEdit={() => setEditingId(scholarship._id)}
                    onDelete={() => handleDelete(scholarship)}
                  />
                )
              )}
          </div>
        </div>

        <aside className="scholarships-filter-sidebar">
          <ScholarshipFilterSidebar
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

export default Scholarships
