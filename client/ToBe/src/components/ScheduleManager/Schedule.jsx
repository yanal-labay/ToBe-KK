import { useEffect, useRef, useState } from 'react'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useCalendarView } from '../../hooks/useCalendarView'
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

  // Clicking a manual entry on the calendar (which can sit far below the
  // fold) opens this form right away, but up near the page header — with
  // no scroll, an admin looking at the calendar wouldn't see anything
  // change. Once the form mounts, smooth-scroll it into view instead.
  const editFormRef = useRef(null)

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

  // A short delay before scrolling — not just a nicety, but the reason it
  // works at all: right after the click, `editFormRef` still points at last
  // render's DOM (or nothing, the first time), since the form for this
  // entry hasn't mounted yet. Waiting a beat lets React commit it first.
  //
  // Plain `scrollIntoView` isn't enough: `.site-topbar` (AdminTopbar +
  // Navbar) is `position: sticky; top: 0`, so it renders on top of whatever
  // lands at the very top of the viewport — scrolling the form's top edge
  // to y=0 just puts it directly underneath the sticky header. Measuring
  // the header's real height at scroll-time (rather than guessing a fixed
  // pixel value) keeps this correct across viewport widths.
  useEffect(() => {
    if (!editingEntry) return
    const timeout = setTimeout(() => {
      const el = editFormRef.current
      if (!el) return
      const headerHeight = document.querySelector('.site-topbar')?.offsetHeight ?? 0
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
      window.scrollTo({ top, behavior: 'smooth' })
    }, 150)
    return () => clearTimeout(timeout)
  }, [editingEntry])

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
        <CategoryManager categories={categories} onCategoriesChanged={loadCategories} />
      )}

      {isAdmin && creating && (
        <ScheduleEntryForm
          categories={categories}
          submitLabel="שמירה"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {isAdmin && editingEntry && (
        <div key={editingEntry.id} ref={editFormRef}>
          <ScheduleEntryForm
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
        </div>
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
