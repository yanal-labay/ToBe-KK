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
 * multi-day entries are handled separately (see `computeWeekLaneAssignments`
 * and `computeDaySpanningSegments`) so they render as one spanning bar
 * instead of a repeated per-day pill.
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
 * Assigns every spanning entry touching this 7-day week a stable lane index
 * (0, 1, 2, ...), shared across every day in the week it's active on — so a
 * continuing entry's segment stays in the same row of the day-bands stack
 * instead of jumping to a different one just because some other entry
 * started or ended on a neighboring day (which otherwise breaks the
 * "continuous bar" illusion with a visible vertical step at that boundary,
 * even though the color itself bridges seamlessly — see
 * `.is-continuing-backward`/`-forward` in Calendar.css). A week is scoped
 * independently since it's already a separate visual row — an entry
 * spanning multiple weeks is free to land in a different lane on each
 * week's row; no continuity is expected or attempted across that boundary
 * anyway (see `computeDaySpanningSegments`'s `columnIndex` checks below).
 *
 * Classic greedy interval-coloring ("meeting rooms"): entries are
 * considered in the same stable order used everywhere else (start date,
 * then id), each claiming the lowest lane whose current occupant has
 * already ended before this entry starts.
 */
function computeWeekLaneAssignments(weekDays, spanningEntries) {
  const weekStart = weekDays[0].getTime()
  const weekEnd = weekDays[weekDays.length - 1].getTime()

  const activeEntries = spanningEntries
    .filter((entry) => {
      const start = dayOnly(entry.startDate).getTime()
      const end = dayOnly(entry.endDate).getTime()
      return start <= weekEnd && end >= weekStart
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.id.localeCompare(b.id))

  const laneEndTimes = []
  const laneByEntryId = new Map()

  for (const entry of activeEntries) {
    const start = Math.max(dayOnly(entry.startDate).getTime(), weekStart)
    const end = Math.min(dayOnly(entry.endDate).getTime(), weekEnd)

    let lane = laneEndTimes.findIndex((endTime) => endTime < start)
    if (lane === -1) {
      lane = laneEndTimes.length
      laneEndTimes.push(end)
    } else {
      laneEndTimes[lane] = end
    }
    laneByEntryId.set(entry.id, lane)
  }

  return laneByEntryId
}

/**
 * The spanning entries active on one specific day, each flagged for whether
 * this is the entry's true first/last day — rendered as a same-colored
 * segment inside that day's own box (see `.schedule-calendar-day-bands`),
 * rounded only on the side that's a true range boundary so consecutive
 * days' segments read as one continuous bar without ever leaving the day
 * cells themselves. `lane` (from `computeWeekLaneAssignments`) is what
 * actually determines vertical stacking order in the render — see the
 * `laneSlots` construction in Calendar's grid loop, which fills any lower,
 * unoccupied lane with a placeholder so a day where this entry isn't the
 * *only* active one still lines its segment up with its lane on neighboring
 * days.
 *
 * `isContinuingBackward`/`-Forward` additionally flag whether yesterday or
 * tomorrow (within the same visual week-row — `columnIndex` is 0 at
 * Sunday, 6 at Saturday) also carries this same entry, so its segment's CSS
 * can bridge the gap into that neighbor rather than just rounding a square
 * edge — see `.is-continuing-backward`/`-forward` in Calendar.css. A week
 * boundary never bridges (there's no adjacent gap to bridge, it's a whole
 * row away), which the `columnIndex` checks enforce regardless of whether
 * the entry itself continues past that day.
 */
function computeDaySpanningSegments(day, spanningEntries, columnIndex, laneByEntryId) {
  const dayTime = day.getTime()
  return spanningEntries
    .filter((entry) => {
      const start = dayOnly(entry.startDate).getTime()
      const end = dayOnly(entry.endDate).getTime()
      return dayTime >= start && dayTime <= end
    })
    .map((entry) => {
      const isRangeStart = dayTime === dayOnly(entry.startDate).getTime()
      const isRangeEnd = dayTime === dayOnly(entry.endDate).getTime()
      return {
        entry,
        isRangeStart,
        isRangeEnd,
        isContinuingBackward: !isRangeStart && columnIndex !== 0,
        isContinuingForward: !isRangeEnd && columnIndex !== 6,
        lane: laneByEntryId.get(entry.id) ?? 0,
      }
    })
}

/**
 * The pill/legend-dot color class for one entry. Events and Scholarships
 * each have their own permanently-reserved color; a manual entry's color
 * comes from whichever category it was assigned (see CategoryManager) —
 * `categoryKey` is one of the fixed palette keys in categoryPalette.js.
 */
function colorClassFor(entry) {
  if (entry.kind === 'event' || entry.kind === 'event-deadline') return 'schedule-color-event'
  if (entry.kind === 'scholarship-deadline') return 'schedule-color-scholarship'
  return `schedule-color-category-${entry.categoryKey}`
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
 *   categories: Array<{_id: string, name: string, colorKey: string}>,
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
  // One lane-assignment map per calendar week (6 weeks in a 42-day grid),
  // computed once per render rather than independently per day — see
  // `computeWeekLaneAssignments` for why per-day assignment alone isn't enough.
  const laneByEntryIdPerWeek = useMemo(() => {
    const perWeek = []
    for (let w = 0; w < days.length / 7; w++) {
      perWeek.push(computeWeekLaneAssignments(days.slice(w * 7, w * 7 + 7), spanningEntries))
    }
    return perWeek
  }, [days, spanningEntries])
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
              <span className={`schedule-legend-dot schedule-color-category-${category.colorKey}`} />
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
        {days.map((day, index) => {
          const key = toDateKey(day)
          const dayEntries = entriesByDay.get(key) || []
          const daySegments = computeDaySpanningSegments(
            day,
            spanningEntries,
            index % 7,
            laneByEntryIdPerWeek[Math.floor(index / 7)]
          )
          // Slots run from lane 0 up to this day's own highest active lane;
          // a lower lane with nothing active today still renders an empty
          // placeholder so a higher-lane segment stays vertically aligned
          // with where it sits on neighboring days (see
          // `computeWeekLaneAssignments`) — there's no need to pad past this
          // day's own max lane, since nothing below it needs the alignment.
          const segmentsByLane = new Map(daySegments.map((segment) => [segment.lane, segment]))
          const maxLane = daySegments.length > 0 ? Math.max(...daySegments.map((segment) => segment.lane)) : -1
          const laneSlots = Array.from({ length: maxLane + 1 }, (_, lane) => segmentsByLane.get(lane) ?? null)
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

              {laneSlots.length > 0 && (
                <div className="schedule-calendar-day-bands">
                  {laneSlots.map((segment, lane) =>
                    segment ? (
                      <button
                        type="button"
                        key={segment.entry.id}
                        className={`schedule-band-pill ${colorClassFor(segment.entry)} ${
                          segment.isRangeStart ? 'is-range-start' : ''
                        } ${segment.isRangeEnd ? 'is-range-end' : ''} ${
                          segment.isContinuingBackward ? 'is-continuing-backward' : ''
                        } ${segment.isContinuingForward ? 'is-continuing-forward' : ''}`}
                        title={segment.entry.title}
                        onClick={() => handleEntryClick(segment.entry)}
                      >
                        {segment.isRangeStart ? segment.entry.title : ''}
                      </button>
                    ) : (
                      <div className="schedule-band-pill-placeholder" key={`empty-lane-${lane}`} aria-hidden="true" />
                    )
                  )}
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
