import { useState } from 'react'
import { useIsMobile } from './useIsMobile'

const STORAGE_KEY = 'scheduleView'
// The three views an explicit pick can select — and so the only three values
// ever read back out of storage. 'agenda' is deliberately absent: it's
// derived from the viewport, never chosen, and never persisted.
const VALID_VIEW_TYPES = ['month', 'sevenDay', 'threeDay']

/** Today at local midnight — see the `anchor` note in `useCalendarView`. */
function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** A copy of `date` shifted by whole days, via calendar-field arithmetic. */
function addDays(date, delta) {
  const next = new Date(date)
  next.setDate(date.getDate() + delta)
  return next
}

/**
 * The Sunday on or before `date`. The 7-day view is a real calendar week, not
 * a rolling window, so its anchor is always snapped here — otherwise stepping
 * a week from a mid-week anchor would keep showing Wednesday-to-Tuesday.
 */
function startOfWeek(date) {
  return addDays(date, -date.getDay())
}

/**
 * A copy of `date` shifted by whole months, clamping the day-of-month to the
 * target month's length. Without the clamp, `new Date(y, m + 1, 31)` rolls
 * over into the month after next — so stepping forward from Aug 31 would
 * silently skip September, and from Jan 31 it would skip February every
 * single year.
 */
function addMonthsClamped(date, delta) {
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1)
  const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDayOfTarget))
  return target
}

/**
 * Normalizes `anchor` for the view about to render it: the 7-day view always
 * starts on a Sunday, the others start wherever they're pointed (the agenda
 * included — it covers whole calendar months, which need no snapping).
 */
function anchorForView(anchor, viewType) {
  return viewType === 'sevenDay' ? startOfWeek(anchor) : anchor
}

/**
 * Which slice of the calendar is on screen, shared by Schedule.jsx and
 * Home.jsx's compact preview.
 *
 * A single `anchor` date drives every view: month renders the month
 * containing it, the 7-day view renders the Sunday–Saturday week containing
 * it, and the 3-day view renders a sliding window starting at it. Switching
 * view keeps the anchor, so navigating to September and then switching to
 * 3-day stays in September.
 *
 * Stepping matches what each view means rather than always jumping a whole
 * screenful: a month at a time, a week at a time, but the 3-day window slides
 * one day at a time so you can walk a span across it.
 *
 * On a phone-sized viewport this returns a fourth view type, 'agenda' — the
 * scrollable per-day list Calendar.jsx renders instead of the grid, which is
 * unreadable at seven columns wide. It's derived here rather than inside
 * Calendar.jsx for a reason that bites immediately otherwise: `shift()` picks
 * its step size from `viewType`, so a calendar that swapped in the agenda
 * locally while this hook still believed it was on 'threeDay' would advance
 * the anchor by one *day* per ‹ › press while showing a whole month. The
 * stored desktop pick is left untouched throughout, so widening the window
 * restores exactly the view that was chosen.
 *
 * `persist` (default true) is what separates the two surfaces. The /schedule
 * page remembers an explicit pick across visits; the Home preview always
 * opens at its own `defaultViewType` regardless of what's stored, and never
 * writes to storage — so a view chosen there stays local to that visit and
 * can't quietly change what /schedule opens with.
 *
 * Two hazards this deliberately avoids, both variants of a real bug this
 * calendar already shipped once (year-skipping on a Dec→Jan wrap):
 * - A state updater must stay pure. React 19's StrictMode double-invokes
 *   updaters to check for purity, so calling another setter *inside* one
 *   runs its side effect twice. That's what the old two-`useState`
 *   year/month code did. `viewType` and `anchor` are separate state here,
 *   but no action ever writes both, and each updater only returns a value.
 * - Never mutate the previous Date. `setAnchor((prev) => { prev.setDate(...);
 *   return prev })` would shift twice under that same double-invocation.
 *   `addDays`/`addMonthsClamped` copy first, for exactly this reason.
 *
 * `anchor` is always local midnight, which Calendar.jsx's day-equality
 * comparisons depend on — a Date carrying a time-of-day would silently stop
 * every multi-day entry from matching its own start day.
 *
 * Unlike `useTheme`, the chosen view is persisted from the setter rather than
 * a `useEffect` on every change: there's no DOM side effect to apply here,
 * and an effect would also persist the derived mobile view, freezing "agenda"
 * into storage where it would then override the desktop default. Only an
 * explicit pick is remembered.
 *
 * `defaultViewType` is a plain string, not a `(isMobile) => …` callback: a
 * phone never renders the stored/default type at all now, so the only value
 * this needs to describe is the desktop one.
 *
 * @param {{
 *   persist?: boolean,
 *   defaultViewType?: 'month'|'sevenDay'|'threeDay',
 * }} [options]
 * @returns {{
 *   viewType: 'month'|'sevenDay'|'threeDay'|'agenda',
 *   selectViewType: (next: 'month'|'sevenDay'|'threeDay') => void,
 *   anchor: Date,
 *   handlePrev: () => void,
 *   handleNext: () => void,
 *   handleToday: () => void,
 * }}
 */
export function useCalendarView({ persist = true, defaultViewType = 'month' } = {}) {
  const isMobile = useIsMobile()
  const [storedViewType, setViewType] = useState(() => {
    if (persist) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (VALID_VIEW_TYPES.includes(stored)) return stored
    }
    return defaultViewType
  })
  const [anchor, setAnchor] = useState(startOfToday)

  const viewType = isMobile ? 'agenda' : storedViewType

  const selectViewType = (next) => {
    setViewType(next)
    if (persist) localStorage.setItem(STORAGE_KEY, next)
  }

  const shift = (direction) => {
    setAnchor((current) => {
      // The agenda covers one whole calendar month, so it steps like the
      // month grid does.
      if (viewType === 'month' || viewType === 'agenda') {
        return addMonthsClamped(current, direction)
      }
      // Whole weeks from the week's own Sunday, so stepping never drifts the
      // window off its Sunday alignment.
      if (viewType === 'sevenDay') return addDays(startOfWeek(current), direction * 7)
      return addDays(current, direction)
    })
  }

  return {
    viewType,
    selectViewType,
    anchor: anchorForView(anchor, viewType),
    handlePrev: () => shift(-1),
    handleNext: () => shift(1),
    handleToday: () => setAnchor(startOfToday()),
  }
}
