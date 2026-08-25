import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Calendar.css'

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

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

/** Midnight-normalized copy of an entry's `startDate`/`endDate` (arrive as ISO strings). */
function dayOnly(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
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
 * Groups single-day entries by the one calendar day they land on — genuinely
 * multi-day entries are handled separately (see `computeWeekBandLanes`) so
 * they render as one spanning bar instead of a repeated per-day pill.
 */
function buildEntriesByDay(entries) {
  const map = new Map()
  for (const entry of entries) {
    const key = toDateKey(dayOnly(entry.startDate))
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return map
}

/**
 * True when `entry` spans more than one calendar day. Only manual entries
 * can ever be true here — events/event-deadlines/scholarship-deadlines
 * always carry the same `startDate`/`endDate`.
 */
function isSpanning(entry) {
  return toDateKey(dayOnly(entry.startDate)) !== toDateKey(dayOnly(entry.endDate))
}

/**
 * The spanning entries active on one specific day, each flagged for whether
 * this is the entry's true first/last day — rendered as a same-colored
 * segment inside that day's own box (see `.schedule-calendar-day-bands`),
 * rounded only on the side that's a true range boundary so consecutive
 * days' segments read as one continuous bar without ever leaving the day
 * cells themselves. Sorted by the entry's own start date (a stable key
 * independent of which day is asking), so on the rare day where two
 * spanning entries overlap, they stack in the same relative order as every
 * other day both are active on, instead of swapping lanes day to day.
 */
function computeDaySpanningSegments(day, spanningEntries) {
  const dayTime = day.getTime()
  return spanningEntries
    .filter((entry) => {
      const start = dayOnly(entry.startDate).getTime()
      const end = dayOnly(entry.endDate).getTime()
      return dayTime >= start && dayTime <= end
    })
    .map((entry) => ({
      entry,
      isRangeStart: dayTime === dayOnly(entry.startDate).getTime(),
      isRangeEnd: dayTime === dayOnly(entry.endDate).getTime(),
    }))
    .sort((a, b) => new Date(a.entry.startDate) - new Date(b.entry.startDate) || a.entry.id.localeCompare(b.entry.id))
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
 * The interactive month grid itself. Renders single-day entries from
 * `GET /api/schedule` as small colored pills per day, and genuinely
 * multi-day manual entries as a dedicated, always-visible row of segments
 * inside each day box it covers (see `computeDaySpanningSegments`) — same
 * color throughout, rounded only at the range's true start/end so it reads
 * as one continuous bar without ever leaving the day cells themselves. This
 * band row never counts against the regular 3-pill/"+N more" cap below it —
 * each in its source's color (event / scholarship / one of 3 admin-defined
 * categories — see `colorClassFor`). Clicking a linked entry navigates to
 * its source page (and highlights the specific card there); clicking a
 * manual entry (any of its segments) as an admin opens it for editing.
 *
 * The legend doubles as the filter control: unlike a plain read-only key,
 * each row is a checkbox — `hiddenFilterKeys`/`onToggleFilterKey` are owned
 * by the parent (see Schedule.jsx), which filters `entries` before handing
 * them down, so this component stays a plain controlled display either way.
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
 *   onSelectManual?: (entry: object) => void,
 *   onDeleteManual?: (entry: object) => void,
 *   hiddenFilterKeys?: Set<string>,
 *   onToggleFilterKey?: (key: string) => void,
 *   compact?: boolean,
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
  hiddenFilterKeys = new Set(),
  onToggleFilterKey = () => {},
  compact = false,
}) {
  const navigate = useNavigate()
  const [expandedDayKey, setExpandedDayKey] = useState(null)

  const { singleDayEntries, spanningEntries } = useMemo(() => {
    const single = []
    const spanning = []
    for (const entry of entries) (isSpanning(entry) ? spanning : single).push(entry)
    return { singleDayEntries: single, spanningEntries: spanning }
  }, [entries])

  const entriesByDay = useMemo(() => buildEntriesByDay(singleDayEntries), [singleDayEntries])
  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const maxVisibleEntries = compact ? 1 : 3
  const allowManualEdit = isAdmin && Boolean(onSelectManual)

  const handleEntryClick = (entry) => {
    if (entry.kind === 'manual') {
      if (allowManualEdit) onSelectManual(entry)
      return
    }
    navigate(`${entry.linkTo}?highlight=${entry.refId}`)
  }

  const popoverEntries = expandedDayKey
    ? [
        ...(entriesByDay.get(expandedDayKey) || []),
        ...spanningEntries.filter((entry) => {
          const day = dateKeyToDate(expandedDayKey).getTime()
          return day >= dayOnly(entry.startDate).getTime() && day <= dayOnly(entry.endDate).getTime()
        }),
      ]
    : []

  return (
    <div className={`schedule-calendar ${compact ? 'schedule-calendar--compact' : ''}`}>
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

      {!compact && (
        <div className="schedule-calendar-legend">
          <label className="schedule-legend-chip">
            <input
              type="checkbox"
              checked={!hiddenFilterKeys.has('event')}
              onChange={() => onToggleFilterKey('event')}
            />
            <span className="schedule-legend-dot schedule-color-event" />
            אירועים
          </label>
          <label className="schedule-legend-chip">
            <input
              type="checkbox"
              checked={!hiddenFilterKeys.has('scholarship')}
              onChange={() => onToggleFilterKey('scholarship')}
            />
            <span className="schedule-legend-dot schedule-color-scholarship" />
            מלגות
          </label>
          {categories.map((category) => (
            <label className="schedule-legend-chip" key={category._id}>
              <input
                type="checkbox"
                checked={!hiddenFilterKeys.has(`category-${category._id}`)}
                onChange={() => onToggleFilterKey(`category-${category._id}`)}
              />
              <span className={`schedule-legend-dot schedule-color-category-${category.colorSlot}`} />
              {category.name}
            </label>
          ))}
        </div>
      )}

      <div className="schedule-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="schedule-calendar-grid">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEntries = entriesByDay.get(key) || []
          const daySegments = computeDaySpanningSegments(day, spanningEntries)
          const isCurrentMonth = day.getMonth() === viewMonth
          const isToday = key === todayKey
          const visible = dayEntries.slice(0, maxVisibleEntries)
          const hiddenCount = dayEntries.length - visible.length

          return (
            <div
              key={key}
              className={`schedule-calendar-day ${isCurrentMonth ? '' : 'is-outside-month'} ${
                isToday ? 'is-today' : ''
              }`}
            >
              <span className="schedule-calendar-day-number">{day.getDate()}</span>

              {daySegments.length > 0 && (
                <div className="schedule-calendar-day-bands">
                  {daySegments.map(({ entry, isRangeStart, isRangeEnd }) => (
                    <button
                      type="button"
                      key={entry.id}
                      className={`schedule-band-pill ${colorClassFor(entry)} ${
                        isRangeStart ? 'is-range-start' : ''
                      } ${isRangeEnd ? 'is-range-end' : ''}`}
                      title={entry.title}
                      onClick={() => handleEntryClick(entry)}
                    >
                      {isRangeStart ? entry.title : ''}
                    </button>
                  ))}
                </div>
              )}

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
              {popoverEntries.map((entry) => (
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
                  {isAdmin && entry.kind === 'manual' && onDeleteManual && (
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
