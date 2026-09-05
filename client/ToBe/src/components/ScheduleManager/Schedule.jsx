import { useEffect, useState } from 'react'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useCalendarView } from '../../hooks/useCalendarView'
import { useScrollToOpenPanel } from '../../hooks/useScrollToOpenPanel'
import { getScheduleEntries, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry, getScheduleCategories } from './ScheduleService'
import Calendar from './Calendar'
import ScheduleEntryForm from './ScheduleEntryForm'
import CategoryManager from './CategoryManager'
import './Schedule.css'

/**
 * The /schedule page ("לוח זמנים") — an interactive calendar (month, 7-day,
 * or 3-day; see `useCalendarView`) that
 * combines every date-bearing record the app already has (event dates,
 * event registration deadlines, scholarship deadlines) with admin-added
 * manual entries, all served pre-merged by `GET /api/schedule` (see
 * schedule.controller.js). Guests can only view; the admin can create,
 * edit, and delete the manual entries and their categories (the
 * event/scholarship-derived entries are edited on their own pages, not
 * here). Anyone — guest or admin — can hide a whole category of entries
 * from the grid via the calendar's legend/filter checkboxes
 * (`hiddenFilterKeys`, purely client-side, nothing persisted).
 */
function Schedule() {
  const { isAdmin } = useAdminSession()

  const [entries, setEntries] = useState([])
  const [categories, setCategories] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error

  const [creating, setCreating] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  // The manual entry currently being edited, shaped for ScheduleEntryForm's
  // initialValues ({id, title, startDate, endDate, categoryId} with
  // date-only strings), or null when nothing is being edited.
  const [editingEntry, setEditingEntry] = useState(null)

  const { viewType, selectViewType, anchor, handlePrev, handleNext, handleToday } = useCalendarView()

  // Which of the legend's rows are unchecked, i.e. hidden from the grid —
  // see `Calendar.jsx`, where the legend doubles as the filter control.
  const [hiddenFilterKeys, setHiddenFilterKeys] = useState(() => new Set())

  // One form is open at a time — either the create form or exactly one entry's
  // edit form. The category manager toggles independently of both, so each gets
  // its own scroll hook rather than one merged id: that way only the panel that
  // just opened scrolls, with no precedence rules between them.
  //
  // The edit id carries the entry's own id rather than a fixed string, so
  // switching to a different entry changes the id and scrolls again.
  const openFormId = creating
    ? 'schedule-entry-form-new'
    : editingEntry
      ? `schedule-entry-form-${editingEntry.id}`
      : null
  const openManagerId = showCategoryManager ? 'schedule-category-manager' : null

  useScrollToOpenPanel(openFormId)
  useScrollToOpenPanel(openManagerId)

  const loadEntries = () => {
    setLoadState('loading')
    getScheduleEntries()
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setEntries(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  const loadCategories = () => {
    getScheduleCategories()
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategories)
      .catch(() => {})
  }

  useEffect(() => {
    loadEntries()
    loadCategories()
  }, [])

  const handleCreate = async (values) => {
    const res = await createScheduleEntry(values)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadEntries()
  }

  const handleUpdate = async (id, values) => {
    const res = await updateScheduleEntry(id, values)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingEntry(null)
    loadEntries()
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`למחוק את "${entry.title}" מלוח השנה?`)) return
    const res = await deleteScheduleEntry(entry.refId)
    const data = await res.json()
    if (!data.success) return
    setEditingEntry(null)
    loadEntries()
  }

  const handleSelectManual = (entry) => {
    setCreating(false)
    setEditingEntry({
      id: entry.refId,
      title: entry.title,
      startDate: entry.startDate.slice(0, 10),
      endDate: entry.endDate.slice(0, 10),
      categoryId: String(entry.categoryId),
    })
  }

  const toggleFilterKey = (key) => {
    setHiddenFilterKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const filterKeyFor = (entry) => {
    if (entry.kind === 'event' || entry.kind === 'event-deadline') return 'event'
    if (entry.kind === 'scholarship-deadline') return 'scholarship'
    return `category-${entry.categoryId}`
  }

  const visibleEntries = entries.filter((entry) => !hiddenFilterKeys.has(filterKeyFor(entry)))

  return (
    <div className="schedule-page">
      {isAdmin && (openFormId || openManagerId) && <div className="form-focus-overlay" />}

      <div className="schedule-page-header">
        <h1>לוח זמנים</h1>
        {isAdmin && (
          <div className="schedule-page-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCategoryManager((current) => !current)}
            >
              {showCategoryManager ? 'סגירת ניהול קטגוריות' : 'ניהול קטגוריות'}
            </button>
            {!creating && !editingEntry && (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                + הוספת רשומה ללוח
              </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && showCategoryManager && (
        <CategoryManager
          panelId="schedule-category-manager"
          categories={categories}
          onCategoriesChanged={loadCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {isAdmin && creating && (
        <ScheduleEntryForm
          formId="schedule-entry-form-new"
          categories={categories}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {isAdmin && editingEntry && (
        <ScheduleEntryForm
          // Remounts when the admin switches to a different entry. The form
          // seeds its state from `initialValues` on mount only, with no effect
          // syncing it afterwards — so a reused instance would keep showing the
          // previous entry's values while submitting against the new entry's id.
          key={editingEntry.id}
          formId={`schedule-entry-form-${editingEntry.id}`}
          categories={categories}
          initialValues={{
            title: editingEntry.title,
            startDate: editingEntry.startDate,
            endDate: editingEntry.endDate,
            categoryId: editingEntry.categoryId,
          }}
          submitLabel="עדכון"
          onSubmit={(values) => handleUpdate(editingEntry.id, values)}
          onCancel={() => setEditingEntry(null)}
          onDelete={() => handleDelete({ refId: editingEntry.id, title: editingEntry.title })}
        />
      )}

      {loadState === 'loading' && <p>טוען לוח זמנים...</p>}
      {loadState === 'error' && <p className="schedule-error">לא ניתן לטעון את לוח הזמנים כרגע</p>}

      {loadState === 'ready' && (
        <Calendar
          entries={visibleEntries}
          categories={categories}
          isAdmin={isAdmin}
          anchor={anchor}
          viewType={viewType}
          onSelectViewType={selectViewType}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onSelectManual={handleSelectManual}
          onDeleteManual={handleDelete}
          hiddenFilterKeys={hiddenFilterKeys}
          onToggleFilterKey={toggleFilterKey}
        />
      )}
    </div>
  )
}

export default Schedule
