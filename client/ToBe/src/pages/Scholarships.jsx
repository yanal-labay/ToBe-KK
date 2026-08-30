import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'
import { useScrollToOpenPanel } from '../hooks/useScrollToOpenPanel'
import { listScholarships, createScholarship, updateScholarship, deleteScholarship } from '../services/scholarshipsService'
import { listScholarshipFields } from '../services/scholarshipFieldsService'
import ScholarshipForm from '../components/scholarships/ScholarshipForm'
import ScholarshipCard, { isScholarshipExpired } from '../components/scholarships/ScholarshipCard'
import ScholarshipFieldsManager from '../components/scholarships/ScholarshipFieldsManager'
import ScholarshipFilterSidebar from '../components/scholarships/ScholarshipFilterSidebar'
import SortBar from '../components/shared/SortBar'
import { byDateAsc, byDateDesc, byNumberAsc, byNumberDesc, chain } from '../utils/sortComparators'
import './Scholarships.css'

// Orderings offered by the sort bar. `added` is first so it's the default,
// matching the order the page used before the bar existed.
const SORT_OPTIONS = [
  { value: 'added', label: 'תאריך הוספה — החדש ראשון', compare: byDateDesc('createdAt') },
  // A null `amount` means the scholarship doesn't state a sum, not that it's
  // worth nothing — so those sink to the bottom rather than counting as the
  // largest. Note this is the opposite null placement from Events' `price`.
  {
    value: 'amount',
    label: 'גובה המלגה — מהגבוה לנמוך',
    compare: byNumberDesc('amount', { nullsFirst: false }),
  },
  { value: 'deadline', label: 'מועד אחרון להגשה — הקרוב ראשון', compare: byDateAsc('deadline') },
  // A null `volunteerHours` means none are required, which is the best case
  // when sorting fewest-first — so these belong at the top.
  {
    value: 'volunteerHours',
    label: 'שעות התנדבות — מהנמוך לגבוה',
    compare: byNumberAsc('volunteerHours', { nullsFirst: true }),
  },
]

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

  // One form is open at a time — either the create form or exactly one
  // card's edit form. The fields manager toggles independently of both, so
  // each gets its own scroll hook rather than one merged id: that way only
  // the panel that just opened scrolls, with no precedence rules needed.
  const openFormId = creating
    ? 'scholarship-form-new'
    : editingId
      ? `scholarship-form-${editingId}`
      : null
  const openManagerId = showFieldsManager ? 'scholarship-fields-manager' : null

  useScrollToOpenPanel(openFormId)
  useScrollToOpenPanel(openManagerId)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({}) // { [fieldId]: optionId[] }
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0].value)

  const loadScholarships = () => {
    setLoadState('loading')
    listScholarships()
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
    listScholarshipFields()
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
    const res = await createScholarship(formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadScholarships()
  }

  const handleUpdate = async (id, formData) => {
    const res = await updateScholarship(id, formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadScholarships()
  }

  const handleDelete = async (scholarship) => {
    if (!window.confirm(`למחוק את המלגה "${scholarship.title}"?`)) return
    const res = await deleteScholarship(scholarship._id)
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

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortKey) ?? SORT_OPTIONS[0]

  // Expired scholarships stay grouped at the bottom whatever the visitor
  // sorts by; the chosen sort only orders within each group.
  const sortedScholarships = [...visibleScholarships].sort(
    chain(
      (a, b) => Number(isScholarshipExpired(a)) - Number(isScholarshipExpired(b)),
      activeSort.compare
    )
  )

  return (
    <div className="scholarships-page">
      {isAdmin && (openFormId || openManagerId) && <div className="form-focus-overlay" />}

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
        <ScholarshipFieldsManager
          panelId="scholarship-fields-manager"
          fields={fields}
          onFieldsChanged={loadFields}
          onClose={() => setShowFieldsManager(false)}
        />
      )}

      {isAdmin && creating && (
        <ScholarshipForm
          formId="scholarship-form-new"
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

          {loadState === 'ready' && scholarships.length > 0 && (
            <SortBar options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
          )}

          <div className="scholarships-list">
            {sortedScholarships.map((scholarship) =>
                isAdmin && editingId === scholarship._id ? (
                  <ScholarshipForm
                    key={scholarship._id}
                    formId={`scholarship-form-${scholarship._id}`}
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
