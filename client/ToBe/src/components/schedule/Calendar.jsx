import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Calendar.css'

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const MAX_VISIBLE_ENTRIES = 3

/** Zero-pads a "yyyy-mm-dd" key from a Date's *local* components (never UTC) — */
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function dateKeyToDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Every cell of a full 6-week grid for the given month, including the leading/trailing days borrowed from adjacent months so the grid is always a rectangle. */
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const days = []
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    days.push(day)
  }
  return days
}

/**
 * Groups the flat `/api/schedule` entry list by every calendar day it
 * touches — a single-day entry (event/event-deadline/scholarship-deadline)
 * lands on one key, while a manual entry's `startDate`..`endDate` range
 * lands on every day in between.
 */
function buildEntriesByDay(entries) {
  const map = new Map()
  for (const entry of entries) {
    const start = new Date(entry.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(entry.endDate)
    end.setHours(0, 0, 0, 0)

    for (const cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
      const key = toDateKey(cursor)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(entry)
    }
  }
  return map
}

/**
 * The pill/legend-dot color class for one entry. Events and Scholarships
 * each have their own permanently-reserved color; a manual entry's color
 * comes from whichever category it was assigned (see CategoryManager) —
 * `categorySlot` is one of the 3 remaining free slots (0/1/2).
 */
function colorClassFor(entry) {
  if (entry.kind === 'event' || entry.kind === 'event-deadline') return 'schedule-color-event'
  if (entry.kind === 'scholarship-deadline') return 'schedule-color-scholarship'
  return `schedule-color-category-${entry.categorySlot}`
}

/**
 * The interactive month grid itself. Renders entries from
 * `GET /api/schedule` as small colored pills per day, each in its source's
 * color (event / scholarship / one of 3 admin-defined categories — see
 * `colorClassFor` and the legend below). Clicking a linked entry navigates
 * to its source page (and highlights the specific card there); clicking a
 * manual entry as an admin opens it for editing.
 *
 * @param {{
 *   entries: object[],
 *   categories: Array<{_id: string, name: string, colorSlot: number}>,
 *   isAdmin: boolean,
 *   viewYear: number,
 *   viewMonth: number,
 *   onPrevMonth: () => void,
 *   onNextMonth: () => void,
 *   onToday: () => void,
 *   onSelectManual: (entry: object) => void,
 *   onDeleteManual: (entry: object) => void,
 * }} props
 */
function Calendar({
  entries,
  categories,
  isAdmin,
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectManual,
  onDeleteManual,
}) {
  const navigate = useNavigate()
  const [expandedDayKey, setExpandedDayKey] = useState(null)

  const entriesByDay = useMemo(() => buildEntriesByDay(entries), [entries])
  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const handleEntryClick = (entry) => {
    if (entry.kind === 'manual') {
      if (isAdmin) onSelectManual(entry)
      return
    }
    navigate(`${entry.linkTo}?highlight=${entry.refId}`)
  }

  return (
    <div className="schedule-calendar">
      <div className="schedule-calendar-header">
        <button type="button" className="btn btn-outline" onClick={onPrevMonth} aria-label="חודש קודם">
          ‹
        </button>
        <h2>
          {new Date(viewYear, viewMonth, 1).toLocaleDateString('he-IL', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <button type="button" className="btn btn-outline" onClick={onNextMonth} aria-label="חודש הבא">
          ›
        </button>
        <button type="button" className="btn btn-outline schedule-calendar-today" onClick={onToday}>
          היום
        </button>
      </div>

      <div className="schedule-calendar-legend">
        <span className="schedule-legend-item">
          <span className="schedule-legend-dot schedule-color-event" />
          אירועים
        </span>
        <span className="schedule-legend-item">
          <span className="schedule-legend-dot schedule-color-scholarship" />
          מלגות
        </span>
        {categories.map((category) => (
          <span className="schedule-legend-item" key={category._id}>
            <span className={`schedule-legend-dot schedule-color-category-${category.colorSlot}`} />
            {category.name}
          </span>
        ))}
      </div>

      <div className="schedule-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="schedule-calendar-grid">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEntries = entriesByDay.get(key) || []
          const isCurrentMonth = day.getMonth() === viewMonth
          const isToday = key === todayKey
          const visible = dayEntries.slice(0, MAX_VISIBLE_ENTRIES)
          const hiddenCount = dayEntries.length - visible.length

          return (
            <div
              key={key}
              className={`schedule-calendar-day ${isCurrentMonth ? '' : 'is-outside-month'} ${
                isToday ? 'is-today' : ''
              }`}
            >
              <span className="schedule-calendar-day-number">{day.getDate()}</span>
              <div className="schedule-calendar-day-entries">
                {visible.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={`schedule-entry-pill ${colorClassFor(entry)}`}
                    title={entry.title}
                    onClick={() => handleEntryClick(entry)}
                  >
                    {entry.title}
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="schedule-entry-pill schedule-entry-more"
                    onClick={() => setExpandedDayKey(key)}
                  >
                    +{hiddenCount} נוספים
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {expandedDayKey && (
        <div className="schedule-day-popover-overlay" onClick={() => setExpandedDayKey(null)}>
          <div className="schedule-day-popover" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-day-popover-header">
              <h3>
                {dateKeyToDate(expandedDayKey).toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <button type="button" className="btn btn-outline" onClick={() => setExpandedDayKey(null)}>
                סגירה
              </button>
            </div>
            <div className="schedule-day-popover-list">
              {(entriesByDay.get(expandedDayKey) || []).map((entry) => (
                <div key={entry.id} className="schedule-day-popover-row">
                  <button
                    type="button"
                    className={`schedule-entry-pill ${colorClassFor(entry)}`}
                    onClick={() => {
                      handleEntryClick(entry)
                      setExpandedDayKey(null)
                    }}
                  >
                    {entry.title}
                  </button>
                  {isAdmin && entry.kind === 'manual' && (
                    <button
                      type="button"
                      className="btn btn-secondary schedule-day-popover-delete"
                      onClick={() => {
                        onDeleteManual(entry)
                        setExpandedDayKey(null)
                      }}
                    >
                      מחיקה
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
