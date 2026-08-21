import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import Calendar from '../components/schedule/Calendar'
import ScheduleEntryForm from '../components/schedule/ScheduleEntryForm'
import CategoryManager from '../components/schedule/CategoryManager'
import './Schedule.css'

/**
 * The /schedule page ("לוח זמנים") — an interactive month calendar that
 * combines every date-bearing record the app already has (event dates,
 * event registration deadlines, scholarship deadlines) with admin-added
 * manual entries, all served pre-merged by `GET /api/schedule` (see
 * schedule.controller.js). Guests can only view; the admin can create,
 * edit, and delete the manual entries and their categories (the
 * event/scholarship-derived entries are edited on their own pages, not
 * here).
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

  // Year and month are one atomic state, not two separate `useState`s —
  // updating them together in a single setter avoids a real bug: with two
  // separate setters, React 19's StrictMode double-invokes a functional
  // updater to check for purity, and the old code called `setViewYear` as
  // a *side effect* inside `setViewMonth`'s updater — so wrapping from
  // December to January silently bumped the year by 2 instead of 1,
  // skipping every other year when clicking "next month" repeatedly.
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const loadEntries = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/schedule`)
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
    fetch(`${API_URL}/api/schedule/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategories)
      .catch(() => {})
  }

  useEffect(() => {
    loadEntries()
    loadCategories()
  }, [])

  const handleCreate = async (values) => {
    const res = await fetch(`${API_URL}/api/schedule`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setCreating(false)
    loadEntries()
  }

  const handleUpdate = async (id, values) => {
    const res = await fetch(`${API_URL}/api/schedule/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setEditingEntry(null)
    loadEntries()
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`למחוק את "${entry.title}" מלוח השנה?`)) return
    const res = await fetch(`${API_URL}/api/schedule/${entry.refId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
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

  const handlePrevMonth = () => {
    setView(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))
  }

  const handleNextMonth = () => {
    setView(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))
  }

  const handleToday = () => {
    const now = new Date()
    setView({ year: now.getFullYear(), month: now.getMonth() })
  }

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
      )}

      {loadState === 'loading' && <p>טוען לוח זמנים...</p>}
      {loadState === 'error' && <p className="schedule-error">לא ניתן לטעון את לוח הזמנים כרגע</p>}

      {loadState === 'ready' && (
        <Calendar
          entries={entries}
          categories={categories}
          isAdmin={isAdmin}
          viewYear={view.year}
          viewMonth={view.month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          onSelectManual={handleSelectManual}
          onDeleteManual={handleDelete}
        />
      )}
    </div>
  )
}

export default Schedule
