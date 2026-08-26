import { useState } from 'react'

const STORAGE_KEY = 'scheduleView'
const VALID_VIEW_TYPES = ['month', 'sevenDay', 'threeDay']

// The app's canonical mobile breakpoint. There's no shared variable for it,
// so it's duplicated here alongside Navbar.css and Calendar.css — keep all
// three in sync.
const MOBILE_QUERY = '(max-width: 900px)'

const isMobileViewport = () => window.matchMedia(MOBILE_QUERY).matches

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
 * starts on a Sunday, the other two start wherever they're pointed.
 */
function anchorForView(anchor, viewType) {
  return viewType === 'sevenDay' ? startOfWeek(anchor) : anchor
}

/**
 * Which slice of the calendar is on screen, shared by Schedule.jsx and
 * Home.jsx's compact preview.
 *
 * A single `anchor` date drives all three views: month renders the month
 * containing it, the 7-day view renders the Sunday–Saturday week containing
 * it, and the 3-day view renders a sliding window starting at it. Switching
 * view keeps the anchor, so navigating to September and then switching to
 * 3-day stays in September.
 *
 * Stepping matches what each view means rather than always jumping a whole
 * screenful: a month at a time, a week at a time, but the 3-day window slides
 * one day at a time so you can walk a span across it.
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
 * and an effect would also persist the *viewport-derived* default, so a first
 * visit on a phone would freeze "threeDay" into storage and then override the
 * desktop default later. Only an explicit pick is remembered.
 *
 * @param {{
 *   persist?: boolean,
 *   defaultViewType?: (isMobile: boolean) => 'month'|'sevenDay'|'threeDay',
 * }} [options]
 * @returns {{
 *   viewType: 'month'|'sevenDay'|'threeDay',
 *   selectViewType: (next: 'month'|'sevenDay'|'threeDay') => void,
 *   anchor: Date,
 *   handlePrev: () => void,
 *   handleNext: () => void,
 *   handleToday: () => void,
 * }}
 */
export function useCalendarView({
  persist = true,
  defaultViewType = (isMobile) => (isMobile ? 'threeDay' : 'month'),
} = {}) {
  const [viewType, setViewType] = useState(() => {
    if (persist) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (VALID_VIEW_TYPES.includes(stored)) return stored
    }
    return defaultViewType(isMobileViewport())
  })
  const [anchor, setAnchor] = useState(startOfToday)

  const selectViewType = (next) => {
    setViewType(next)
    if (persist) localStorage.setItem(STORAGE_KEY, next)
  }

  const shift = (direction) => {
    setAnchor((current) => {
      if (viewType === 'month') return addMonthsClamped(current, direction)
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
