import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useScrollToOpenPanel } from '../../hooks/useScrollToOpenPanel'
import { listEvents, createEvent, updateEvent, deleteEvent } from './EventsService'
import {
  listEventFields,
  createEventField,
  renameEventField,
  deleteEventField,
  addEventFieldOption,
  deleteEventFieldOption,
} from './EventFieldsService'
import EventForm from './EventForm'
import EventCard, { isEventExpired } from './EventCard'
import FieldsManager from '../../GUIComponents/Widgets/FieldsManager'
import FilterSidebar from '../../GUIComponents/Widgets/FilterSidebar'
import SortBar from '../../GUIComponents/Widgets/SortBar'
import { byDateAsc, byDateDesc, byNumberAsc, chain } from '../../utils/sortComparators'
import './Events.css'

// The write half of EventFieldsService, in the shape the shared FieldsManager
// expects. At module scope because it's the same object every render.
const fieldsApi = {
  create: createEventField,
  rename: renameEventField,
  remove: deleteEventField,
  addOption: addEventFieldOption,
  removeOption: deleteEventFieldOption,
}

// Orderings offered by the sort bar. `eventDate` is first so it's the
// default, matching the order the page used before the bar existed.
const SORT_OPTIONS = [
  { value: 'eventDate', label: 'תאריך האירוע — הקרוב ראשון', compare: byDateAsc('date') },
  { value: 'added', label: 'תאריך הוספה — החדש ראשון', compare: byDateDesc('createdAt') },
  // A null `price` means free, not unknown, so those belong at the cheap
  // end — the opposite of Scholarships' null `amount`, which means unstated.
  { value: 'price', label: 'מחיר — מהזול ליקר', compare: byNumberAsc('price', { nullsFirst: true }) },
  {
    value: 'registrationDeadline',
    label: 'סגירת הרשמה — הקרוב ראשון',
    compare: byDateAsc('registrationDeadline'),
  },
]

/** Groups an event's populated `fieldSelections` into `{ [fieldId]: optionId[] }`, for seeding EventForm's edit state. */
function fieldSelectionsToFieldValues(fieldSelections) {
  const grouped = {}
  for (const selection of fieldSelections || []) {
    const fieldId = selection.field?._id || selection.field
    if (!fieldId) continue
    grouped[fieldId] = [...(grouped[fieldId] || []), selection._id]
  }
  return grouped
}

/**
 * The /events page — the app's first fully-built example of a shared page
 * whose content adapts to the visitor's role (see EventsManager/):
 * admins can create/edit/delete events and view registrants, guests can
 * only view and register. `isAdmin` alone decides which controls render;
 * everyone hits the same public GET /api/events list.
 */
function Events() {
  const { isAdmin } = useAdminSession()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight')

  const [events, setEvents] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [highlightedId, setHighlightedId] = useState(null)

  // At most one event is being created/edited/registrations-viewed at a
  // time; `editingId`/`viewingRegistrationsId` track *which* event by id
  // rather than a boolean per card, so opening one automatically implies
  // closing whichever other one was open.
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingRegistrationsId, setViewingRegistrationsId] = useState(null)
  const [showFieldsManager, setShowFieldsManager] = useState(false)

  const [fields, setFields] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({}) // { [fieldId]: optionId[] }
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0].value)

  // One form is open at a time — either the create form or exactly one card's
  // edit form. Drives both the scroll-into-view effect and the backdrop.
  const openFormId = creating
    ? 'event-form-new'
    : editingId
      ? `event-form-${editingId}`
      : null
  const openManagerId = showFieldsManager ? 'event-fields-manager' : null

  useScrollToOpenPanel(openFormId)
  useScrollToOpenPanel(openManagerId)

  const loadEvents = () => {
    setLoadState('loading')
    listEvents({ isAdmin })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setEvents(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  const loadFields = () => {
    listEventFields()
      .then((res) => (res.ok ? res.json() : []))
      .then(setFields)
      .catch(() => {})
  }

  // Re-fetches when `isAdmin` flips: guests get /api/events (active only),
  // admins get /api/events/admin (everything).
  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    loadFields()
  }, [])

  // Scrolls to and briefly highlights the event named by ?highlight=<id>
  // (arriving from the /schedule calendar) once the list has loaded.
  useEffect(() => {
    if (!highlightParam || loadState !== 'ready') return
    if (!events.some((event) => event._id === highlightParam)) return

    setHighlightedId(highlightParam)
    const card = document.getElementById(`event-${highlightParam}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const timeout = setTimeout(() => setHighlightedId(null), 2500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam, loadState])

  const handleCreate = async (formData) => {
    const res = await createEvent(formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadEvents()
  }

  const handleUpdate = async (id, formData) => {
    const res = await updateEvent(id, formData)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingId(null)
    loadEvents()
  }

  const handleDelete = async (event) => {
    if (!window.confirm(`למחוק את האירוע "${event.title}"?`)) return
    const res = await deleteEvent(event._id)
    const data = await res.json()
    if (!data.success) return
    loadEvents()
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

  const visibleEvents = events.filter((event) => {
    const term = searchTerm.trim().toLowerCase()
    if (term && !event.title.toLowerCase().includes(term)) return false
    for (const field of fields) {
      const selected = selectedOptionIds[field._id]
      if (!selected || selected.length === 0) continue
      if (!event.fieldSelections.some((sel) => selected.includes(sel._id))) return false
    }
    return true
  })

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortKey) ?? SORT_OPTIONS[0]

  // Expired events stay grouped at the bottom whatever the visitor sorts by,
  // so a cheap event that has already happened never outranks a live one —
  // the chosen sort only orders within each group.
  const sortedEvents = [...visibleEvents].sort(
    chain((a, b) => Number(isEventExpired(a)) - Number(isEventExpired(b)), activeSort.compare)
  )

  return (
    <div className="events-page">
      {isAdmin && (openFormId || openManagerId) && <div className="form-focus-overlay" />}

      <div className="events-page-header">
        <h1>אירועים</h1>
        {isAdmin && (
          <div className="events-page-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowFieldsManager((current) => !current)}
            >
              {showFieldsManager ? 'סגירת ניהול שדות' : 'ניהול שדות'}
            </button>
            {!creating && (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                + אירוע חדש
              </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && showFieldsManager && (
        <FieldsManager
          panelId="event-fields-manager"
          fields={fields}
          onFieldsChanged={loadFields}
          onClose={() => setShowFieldsManager(false)}
          api={fieldsApi}
        />
      )}

      {isAdmin && creating && (
        <EventForm
          formId="event-form-new"
          fields={fields}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="events-page-layout">
        <div className="events-page-main">
          {loadState === 'loading' && <p>טוען אירועים...</p>}
          {loadState === 'error' && (
            <p className="events-error">לא ניתן לטעון את האירועים כרגע</p>
          )}
          {loadState === 'ready' && events.length === 0 && <p>אין אירועים קרובים כרגע.</p>}
          {loadState === 'ready' && events.length > 0 && hasActiveFilters && (
            <p className="events-match-count">{visibleEvents.length} אירועים נמצאו</p>
          )}
          {loadState === 'ready' && events.length > 0 && visibleEvents.length === 0 && (
            <p>אין אירועים התואמים את החיפוש/הסינון.</p>
          )}

          {loadState === 'ready' && events.length > 0 && (
            <SortBar options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
          )}

          <div className="events-list">
        {sortedEvents.map((event) =>
          isAdmin && editingId === event._id ? (
            <EventForm
              key={event._id}
              formId={`event-form-${event._id}`}
              fields={fields}
              initialValues={{
                title: event.title,
                description: event.description,
                location: event.location,
                date: event.date.slice(0, 10),
                time: event.time,
                price: event.price != null ? String(event.price) : '',
                registrationDeadline: event.registrationDeadline
                  ? event.registrationDeadline.slice(0, 10)
                  : '',
                isActive: event.isActive !== false,
              }}
              initialFieldValues={fieldSelectionsToFieldValues(event.fieldSelections)}
              existingPhotoUrl={event.photoUrl}
              submitLabel="עדכון"
              onSubmit={(formData) => handleUpdate(event._id, formData)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <EventCard
              key={event._id}
              event={event}
              isAdmin={isAdmin}
              isHighlighted={highlightedId === event._id}
              onEdit={() => setEditingId(event._id)}
              onDelete={() => handleDelete(event)}
              isViewingRegistrations={viewingRegistrationsId === event._id}
              onToggleRegistrations={() =>
                setViewingRegistrationsId((current) =>
                  current === event._id ? null : event._id
                )
              }
            />
          )
        )}
          </div>
        </div>

        <aside className="events-filter-sidebar">
          <FilterSidebar
            searchLabel="חיפוש לפי שם האירוע"
            searchPlaceholder="לדוגמה: סדנה, הרצאה..."
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

export default Events
