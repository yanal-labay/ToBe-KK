import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AgendaList from './AgendaList'
import {
  buildEntriesByDay,
  colorClassFor,
  dateKeyToDate,
  dayOnly,
  entriesOnDay,
  isSpanning,
  splitDeadlineTitle,
  toDateKey,
} from './scheduleEntries'
import './Calendar.css'

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

// How far ahead the compact agenda looks for its "next few days". Only a
// bound on the search, not on what's shown — `AGENDA_COMPACT_MAX_DAYS` does
// that — so it just needs to be comfortably longer than any realistic gap
// between entries.
const AGENDA_COMPACT_HORIZON_DAYS = 180
const AGENDA_COMPACT_MAX_DAYS = 4

/**
 * How wide (columns) and how long (days) each view's grid is. Month is the
 * only multi-row view; the two day views are a single rolling window, so
 * their day count equals their column count.
 *
 * 'agenda' is the mobile-only list view (see AgendaList.jsx) — it has no grid
 * at all, so neither number is ever read on that path; the entry exists only
 * so the shared destructure below doesn't have to special-case it.
 */
const VIEW_CONFIG = {
  month: { columnCount: 7, dayCount: 42 },
  sevenDay: { columnCount: 7, dayCount: 7 },
  threeDay: { columnCount: 3, dayCount: 3 },
  agenda: { columnCount: 1, dayCount: 0 },
}

// "שבוע" is literal — the 7-day view is a real Sunday–Saturday calendar week
// (see `startOfWeek` in useCalendarView). The 3-day view has no such natural
// name, since it's a window that slides a day at a time.
const VIEW_OPTIONS = [
  { value: 'month', label: 'חודש' },
  { value: 'sevenDay', label: 'שבוע' },
  { value: 'threeDay', label: '3 ימים' },
]

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
 * `length` consecutive days starting at `anchor` — the rolling window the
 * 3-day/7-day views render, with no Sunday-alignment (unlike the month grid
 * above, a window starts wherever you're anchored). Uses the same
 * calendar-field `setDate` arithmetic, which stays correct across DST
 * transitions where a day isn't 24h long.
 */
function buildDayWindow(anchor, length) {
  const days = []
  for (let i = 0; i < length; i++) {
    const day = new Date(anchor)
    day.setDate(anchor.getDate() + i)
    days.push(day)
  }
  return days
}

/**
 * Every day of the given month, 1st through last — the agenda's range. Unlike
 * `buildMonthGrid` above it borrows nothing from the adjacent months: a list
 * has no rectangle to fill, and days from a month you didn't navigate to
 * would just be confusing entries in it.
 */
function buildMonthDays(year, month) {
  const dayCount = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: dayCount }, (_, index) => new Date(year, month, index + 1))
}

/**
 * Assigns every spanning entry touching one grid row a stable lane index
 * (0, 1, 2, ...), shared across every day in that row it's active on — so a
 * continuing entry's segment stays in the same row of the day-bands stack
 * instead of jumping to a different one just because some other entry
 * started or ended on a neighboring day (which otherwise breaks the
 * "continuous bar" illusion with a visible vertical step at that boundary,
 * even though the color itself bridges seamlessly — see
 * `.is-continuing-backward`/`-forward` in Calendar.css). Each row is scoped
 * independently since it's already a separate visual line — an entry
 * spanning several rows is free to land in a different lane on each; no
 * continuity is expected or attempted across that boundary anyway (see
 * `computeDaySpanningSegments`'s `columnIndex` checks below).
 *
 * A "row" is whatever the current view slices: one of the month grid's six
 * weeks, or the whole 7-day/3-day window (which is a single row). Nothing
 * here assumes a row is 7 days long or starts on a Sunday.
 *
 * Classic greedy interval-coloring ("meeting rooms"): entries are
 * considered in the same stable order used everywhere else (start date,
 * then id), each claiming the lowest lane whose current occupant has
 * already ended before this entry starts.
 */
function computeRowLaneAssignments(rowDays, spanningEntries) {
  const rowStart = rowDays[0].getTime()
  const rowEnd = rowDays[rowDays.length - 1].getTime()

  const activeEntries = spanningEntries
    .filter((entry) => {
      const start = dayOnly(entry.startDate).getTime()
      const end = dayOnly(entry.endDate).getTime()
      return start <= rowEnd && end >= rowStart
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.id.localeCompare(b.id))

  const laneEndTimes = []
  const laneByEntryId = new Map()

  for (const entry of activeEntries) {
    const start = Math.max(dayOnly(entry.startDate).getTime(), rowStart)
    const end = Math.min(dayOnly(entry.endDate).getTime(), rowEnd)

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
 * tomorrow (within the same visual row — `columnIndex` runs 0 to
 * `columnCount - 1`) also carries this same entry, so its segment's CSS
 * can bridge the gap into that neighbor rather than just rounding a square
 * edge — see `.is-continuing-backward`/`-forward` in Calendar.css. A row
 * boundary never bridges (there's no adjacent gap to bridge, it's a whole
 * row away), which the `columnIndex` checks enforce regardless of whether
 * the entry itself continues past that day.
 *
 * `showsTitle` marks the one segment per row that renders the entry's title:
 * either its true start day, or — when it began before this row — the row's
 * first column. Those are the only two possibilities, since a range is
 * contiguous: an entry active at column 0 either starts there or started
 * earlier, and one first appearing at a later column must start exactly
 * there. Without this, a span running in from an earlier row (or from before
 * a 3-day window, which is most of them) renders as an unlabeled bar.
 */
function computeDaySpanningSegments(day, spanningEntries, columnIndex, columnCount, laneByEntryId) {
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
        showsTitle: isRangeStart || columnIndex === 0,
        isContinuingBackward: !isRangeStart && columnIndex !== 0,
        isContinuingForward: !isRangeEnd && columnIndex !== columnCount - 1,
        lane: laneByEntryId.get(entry.id) ?? 0,
      }
    })
}

const PILL_TITLE_PREVIEW_CHARS = 20

/**
 * Splits `title` into a leading preview of at most `maxChars` characters plus
 * whether it was actually longer than that — same shape as EventCard's
 * `previewDescription`, so a pill can show a fixed-length preview instead of
 * relying on CSS's pixel-width-based ellipsis, and offer to expand only when
 * there's really more to show. Only band-pills (multi-day spans) use this —
 * entry-pills always show their full title (see `handlePillClick`'s comment)
 * since they can safely wrap and grow their day cell instead of truncating.
 */
function previewTitle(title, maxChars) {
  if (title.length <= maxChars) return { preview: title, isTruncated: false }
  return { preview: title.slice(0, maxChars), isTruncated: true }
}

/**
 * The interactive calendar grid itself. Renders single-day entries from
 * `GET /api/schedule` as small colored pills per day, and genuinely
 * multi-day manual entries as a dedicated, always-visible row of segments
 * inside each day box it covers (see `computeDaySpanningSegments`) — same
 * color throughout, rounded only at the range's true start/end so it reads
 * as one continuous bar without ever leaving the day cells themselves. This
 * band row never counts against the regular "+N more" cap below it — each in
 * its source's color (event / scholarship / one of the admin-defined
 * categories — see `colorClassFor`). Clicking a linked entry navigates to
 * its source page (and highlights the specific card there); clicking a
 * manual entry (any of its segments) as an admin opens it for editing.
 *
 * Three grid views share one code path, parameterized by `VIEW_CONFIG`'s
 * column count: the six-week month grid, and two single-row rolling windows
 * (7-day and 3-day) that start wherever `anchor` points rather than snapping
 * to a Sunday. Navigation state lives in the parent (`useCalendarView`), so
 * this stays a plain controlled display.
 *
 * A fourth view type, 'agenda', swaps the grid for `AgendaList` — the
 * scrollable per-day list that renders instead on a phone, where seven
 * columns leave each one about 45px wide. It isn't selectable:
 * `useCalendarView` derives it from the viewport, and the view switcher is
 * hidden while it's active, since the agenda is the only mobile view. Header
 * navigation, the legend/filters, and every click behaviour carry over
 * unchanged; only the layout differs.
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
 *   anchor: Date,
 *   viewType: 'month'|'sevenDay'|'threeDay'|'agenda',
 *   onSelectViewType: (next: 'month'|'sevenDay'|'threeDay') => void,
 *   onPrev: () => void,
 *   onNext: () => void,
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
  anchor,
  viewType,
  onSelectViewType,
  onPrev,
  onNext,
  onToday,
  onSelectManual,
  onDeleteManual,
  hiddenFilterKeys = new Set(),
  onToggleFilterKey = () => {},
  compact = false,
}) {
  const navigate = useNavigate()
  const [expandedDayKey, setExpandedDayKey] = useState(null)
  const [expandedEntryIds, setExpandedEntryIds] = useState(() => new Set())

  const { singleDayEntries, spanningEntries } = useMemo(() => {
    const single = []
    const spanning = []
    for (const entry of entries) (isSpanning(entry) ? spanning : single).push(entry)
    return { singleDayEntries: single, spanningEntries: spanning }
  }, [entries])

  const entriesByDay = useMemo(() => buildEntriesByDay(singleDayEntries), [singleDayEntries])
  const { columnCount, dayCount } = VIEW_CONFIG[viewType]
  const isAgenda = viewType === 'agenda'
  const days = useMemo(() => {
    if (viewType === 'agenda') return buildMonthDays(anchor.getFullYear(), anchor.getMonth())
    if (viewType === 'month') return buildMonthGrid(anchor.getFullYear(), anchor.getMonth())
    return buildDayWindow(anchor, dayCount)
  }, [anchor, viewType, dayCount])
  // One lane-assignment map per grid row (six weeks in the month view, a
  // single row in the day views), computed once per render rather than
  // independently per day — see `computeRowLaneAssignments` for why per-day
  // assignment alone isn't enough. Lanes are a property of a grid *row*, so
  // the agenda has nothing to assign: the bail-out lives inside the memo
  // rather than around it, keeping the hook order stable when a resize
  // switches views mid-session.
  const laneByEntryIdPerRow = useMemo(() => {
    if (viewType === 'agenda') return []
    const perRow = []
    for (let r = 0; r < Math.ceil(days.length / columnCount); r++) {
      perRow.push(
        computeRowLaneAssignments(days.slice(r * columnCount, (r + 1) * columnCount), spanningEntries)
      )
    }
    return perRow
  }, [days, spanningEntries, columnCount, viewType])
  const todayKey = useMemo(() => toDateKey(new Date()), [])
  // Only the compact Home preview needs a hard cap (it's a small, fixed-size
  // glance widget) — the full calendar's day cells already grow to fit their
  // content (`min-height`, no `overflow: hidden`, same as the band-pill and
  // expanded-pill rows above), so there's no reason to hide entries there
  // just because more than a fixed number exist; showing them all lets the
  // row grow instead. Even compact, the day views' far wider cells have room
  // for more than the single pill a narrow month column can show.
  const maxVisibleEntries = compact ? (viewType === 'month' ? 1 : 3) : Infinity
  // Scaled to the column width: a 3-day column is over twice as wide as a
  // month column, so the same character budget would truncate long before it
  // needed to. Read by both `handlePillClick` and the band-pill render below,
  // which must agree — if they disagree, a click on a pill the render treats
  // as truncated (but the handler doesn't) silently does nothing.
  const pillPreviewChars = Math.round(PILL_TITLE_PREVIEW_CHARS * (7 / columnCount))
  const allowManualEdit = isAdmin && Boolean(onSelectManual)

  const handleEntryClick = (entry) => {
    if (entry.kind === 'manual') {
      if (allowManualEdit) onSelectManual(entry)
      return
    }
    navigate(`${entry.linkTo}?highlight=${entry.refId}`)
  }

  // Used only by band-pills — entry-pills always show their full title (no
  // truncated state to gate on) and call handleEntryClick directly. Also
  // never used by the day popover, which likewise always shows full titles.
  const handlePillClick = (entry) => {
    const { isTruncated } = previewTitle(entry.title, pillPreviewChars)
    if (isTruncated && !expandedEntryIds.has(entry.id)) {
      setExpandedEntryIds((current) => new Set(current).add(entry.id))
      return
    }
    handleEntryClick(entry)
  }

  const popoverEntries = expandedDayKey
    ? entriesOnDay(dateKeyToDate(expandedDayKey), entriesByDay, spanningEntries)
    : []

  // What one press of ‹/› actually moves, named for this view. The agenda
  // covers a whole month, same as the month grid.
  const stepNoun = { month: 'חודש', agenda: 'חודש', sevenDay: 'שבוע', threeDay: 'יום' }[viewType]

  // The full-page agenda spans the anchor's month; the compact one is a
  // forward-looking "next few days" glance widget instead, for which a month
  // boundary would be arbitrary — an entry three days away shouldn't vanish
  // from the home page just because it lands after the 31st.
  //
  // Memoised because these Dates are `AgendaList`'s memo dependencies: fresh
  // objects every render would re-derive its whole day list every render.
  const agendaRange = useMemo(() => {
    if (!compact) {
      return {
        rangeStart: days[0],
        rangeEnd: days[days.length - 1],
        maxDays: Infinity,
        emptyMessage: 'אין רשומות בחודש זה',
      }
    }
    const rangeStart = dayOnly(new Date())
    const rangeEnd = dayOnly(new Date())
    rangeEnd.setDate(rangeEnd.getDate() + AGENDA_COMPACT_HORIZON_DAYS)
    return {
      rangeStart,
      rangeEnd,
      maxDays: AGENDA_COMPACT_MAX_DAYS,
      emptyMessage: 'אין רשומות קרובות',
    }
  }, [compact, days])

  return (
    <div
      className={`schedule-calendar schedule-calendar--${viewType} ${
        compact ? 'schedule-calendar--compact' : ''
      }`}
      style={{ '--schedule-columns': String(columnCount) }}
    >
      {/* The compact agenda is a forward-rolling "next few days" list rather
          than a month, so month-stepping controls would navigate somewhere it
          doesn't show. Every other combination keeps the header. */}
      {!(isAgenda && compact) && (
        <div className="schedule-calendar-header">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onPrev}
            aria-label={`${stepNoun} קודם`}
          >
            ‹
          </button>
          <h2>
            {viewType === 'month' || isAgenda
              ? anchor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
              : new Intl.DateTimeFormat('he-IL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).formatRange(days[0], days[days.length - 1])}
          </h2>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onNext}
            aria-label={`${stepNoun} הבא`}
          >
            ›
          </button>
          <button
            type="button"
            className="btn btn-outline schedule-calendar-today"
            onClick={onToday}
          >
            היום
          </button>
        </div>
      )}

      {/* Its own row rather than another control inside the header, which
          already carries four. Unlike the legend, this renders in compact
          mode too, so the Home preview can be re-scoped without leaving for
          the full page (whether the choice outlives the visit is the
          parent's call — see `persist` in useCalendarView).

          Hidden entirely on the agenda: it's the mobile view, and the whole
          point is that it's the *only* one there — offering a switch back to
          a 7-column grid on a phone would just offer the layout this
          replaces. */}
      {!isAgenda && (
        <div className="schedule-calendar-views" role="group" aria-label="תצוגת לוח">
          {VIEW_OPTIONS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              className={`btn btn-outline schedule-view-button ${
                viewType === value ? 'is-active' : ''
              }`}
              aria-pressed={viewType === value}
              onClick={() => onSelectViewType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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

      {isAgenda ? (
        <AgendaList
          entries={entries}
          rangeStart={agendaRange.rangeStart}
          rangeEnd={agendaRange.rangeEnd}
          maxDays={agendaRange.maxDays}
          emptyMessage={agendaRange.emptyMessage}
          isAdmin={isAdmin}
          onEntryClick={handleEntryClick}
          onDeleteManual={onDeleteManual}
          compact={compact}
        />
      ) : (
        <>
        {/* Derived from the actual days rather than a static list, since a
            rolling window can start on any weekday. In month view the first
            row is always Sunday-aligned (see `buildMonthGrid`), so this still
            renders exactly א through ש. The wider 3-day columns have room for
            the full weekday name. */}
        <div className="schedule-calendar-weekdays">
          {days.slice(0, columnCount).map((day, index) => (
            <div key={index}>
              {viewType === 'threeDay'
                ? day.toLocaleDateString('he-IL', { weekday: 'long' })
                : WEEKDAY_LABELS[day.getDay()]}
            </div>
          ))}
        </div>

        <div className="schedule-calendar-grid">
          {days.map((day, index) => {
            const key = toDateKey(day)
            const dayEntries = entriesByDay.get(key) || []
            const daySegments = computeDaySpanningSegments(
              day,
              spanningEntries,
              index % columnCount,
              columnCount,
              laneByEntryIdPerRow[Math.floor(index / columnCount)]
            )
            // Slots run from lane 0 up to this day's own highest active lane;
            // a lower lane with nothing active today still renders an empty
            // placeholder so a higher-lane segment stays vertically aligned
            // with where it sits on neighboring days (see
            // `computeRowLaneAssignments`) — there's no need to pad past this
            // day's own max lane, since nothing below it needs the alignment.
            const segmentsByLane = new Map(daySegments.map((segment) => [segment.lane, segment]))
            const maxLane = daySegments.length > 0 ? Math.max(...daySegments.map((segment) => segment.lane)) : -1
            const laneSlots = Array.from({ length: maxLane + 1 }, (_, lane) => segmentsByLane.get(lane) ?? null)
            // Only the month grid borrows days from adjacent months; every cell
            // of a rolling window is equally in-view, so nothing is dimmed.
            const isOutsideMonth = viewType === 'month' && day.getMonth() !== anchor.getMonth()
            const isToday = key === todayKey
            const visible = dayEntries.slice(0, maxVisibleEntries)
            const hiddenCount = dayEntries.length - visible.length

            return (
              <div
                key={key}
                className={`schedule-calendar-day ${isOutsideMonth ? 'is-outside-month' : ''} ${
                  isToday ? 'is-today' : ''
                }`}
              >
                <span className="schedule-calendar-day-number">{day.getDate()}</span>

                {laneSlots.length > 0 && (
                  <div className="schedule-calendar-day-bands">
                    {laneSlots.map((segment, lane) => {
                      if (!segment) {
                        return (
                          <div
                            className="schedule-band-pill-placeholder"
                            key={`empty-lane-${lane}`}
                            aria-hidden="true"
                          />
                        )
                      }
                      const isExpanded = expandedEntryIds.has(segment.entry.id)
                      const { preview, isTruncated } = previewTitle(segment.entry.title, pillPreviewChars)
                      const showFull = isExpanded || !isTruncated
                      return (
                        <button
                          type="button"
                          key={segment.entry.id}
                          className={`schedule-band-pill ${colorClassFor(segment.entry)} ${
                            segment.isRangeStart ? 'is-range-start' : ''
                          } ${segment.isRangeEnd ? 'is-range-end' : ''} ${
                            segment.showsTitle ? 'is-title-segment' : ''
                          } ${segment.isContinuingBackward ? 'is-continuing-backward' : ''} ${
                            segment.isContinuingForward ? 'is-continuing-forward' : ''
                          } ${segment.showsTitle && isExpanded ? 'is-expanded' : ''}`}
                          title={segment.entry.title}
                          onClick={() => handlePillClick(segment.entry)}
                        >
                          {segment.showsTitle ? (showFull ? segment.entry.title : `${preview}…`) : ''}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="schedule-calendar-day-entries">
                  {visible.map((entry) => {
                    const deadline = splitDeadlineTitle(entry)
                    return (
                      <button
                        type="button"
                        key={entry.id}
                        className={`schedule-entry-pill ${colorClassFor(entry)}`}
                        title={entry.title}
                        onClick={() => handleEntryClick(entry)}
                      >
                        {deadline ? (
                          <>
                            <span className="schedule-entry-pill-deadline-label">{deadline.label}:</span>
                            <span className="schedule-entry-pill-deadline-title">{deadline.rest}</span>
                          </>
                        ) : (
                          entry.title
                        )}
                      </button>
                    )
                  })}
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
        </>
      )}

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
              {popoverEntries.map((entry) => {
                const deadline = splitDeadlineTitle(entry)
                return (
                  <div key={entry.id} className="schedule-day-popover-row">
                    <button
                      type="button"
                      className={`schedule-entry-pill ${colorClassFor(entry)}`}
                      onClick={() => {
                        handleEntryClick(entry)
                        setExpandedDayKey(null)
                      }}
                    >
                      {deadline ? (
                        <>
                          <span className="schedule-entry-pill-deadline-label">{deadline.label}:</span>
                          <span className="schedule-entry-pill-deadline-title">{deadline.rest}</span>
                        </>
                      ) : (
                        entry.title
                      )}
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
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
