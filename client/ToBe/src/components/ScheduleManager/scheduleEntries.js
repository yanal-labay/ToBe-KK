/**
 * Pure helpers over the flat entry list `GET /api/schedule` returns (see
 * schedule.controller.js), shared by the two ways it gets rendered: the
 * desktop grid (Calendar.jsx) and the mobile agenda (AgendaList.jsx).
 *
 * Only genuinely shape-independent logic lives here. Anything that assumes a
 * *grid* — lane assignment, per-day span segments, the day-window/month-grid
 * builders — stays in Calendar.jsx, since the agenda has no rows or columns
 * for those to mean anything in.
 */

/** Zero-pads a "yyyy-mm-dd" key from a Date's *local* components (never UTC) — */
export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function dateKeyToDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Midnight-normalized copy of an entry's `startDate`/`endDate` (arrive as ISO strings). */
export function dayOnly(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * True when `entry` spans more than one calendar day. Only manual entries
 * can ever be true here — events/event-deadlines/scholarship-deadlines
 * always carry the same `startDate`/`endDate`.
 */
export function isSpanning(entry) {
  return toDateKey(dayOnly(entry.startDate)) !== toDateKey(dayOnly(entry.endDate))
}

/**
 * Groups single-day entries by the one calendar day they land on — genuinely
 * multi-day entries are handled separately (see `computeDaySpanningSegments`
 * in Calendar.jsx, and `entriesOnDay` below) so the grid can render them as
 * one spanning bar instead of a repeated per-day pill.
 */
export function buildEntriesByDay(entries) {
  const map = new Map()
  for (const entry of entries) {
    const key = toDateKey(dayOnly(entry.startDate))
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return map
}

/** True when `day` (local midnight) falls inside `entry`'s inclusive range. */
export function coversDay(entry, day) {
  const time = day.getTime()
  return time >= dayOnly(entry.startDate).getTime() && time <= dayOnly(entry.endDate).getTime()
}

/**
 * Everything happening on one day: the single-day entries starting on it,
 * then every multi-day entry covering it.
 *
 * Both the day popover and the agenda need exactly this, and they must never
 * disagree about what a day contains — hence one definition rather than the
 * concatenation written twice.
 */
export function entriesOnDay(day, entriesByDay, spanningEntries) {
  return [
    ...(entriesByDay.get(toDateKey(day)) || []),
    ...spanningEntries.filter((entry) => coversDay(entry, day)),
  ]
}

/**
 * The pill/legend-dot/stripe color class for one entry. Events and
 * Scholarships each have their own permanently-reserved color; a manual
 * entry's color comes from whichever category it was assigned (see
 * CategoryManager) — `categoryKey` is one of the fixed palette keys in
 * categoryPalette.js. Every one of these classes sets `background`, so it
 * works on a pill, a legend dot, or the agenda's color stripe alike.
 */
export function colorClassFor(entry) {
  if (entry.kind === 'event' || entry.kind === 'event-deadline') return 'schedule-color-event'
  if (entry.kind === 'scholarship-deadline') return 'schedule-color-scholarship'
  return `schedule-color-category-${entry.categoryKey}`
}

const DEADLINE_LABEL_BY_KIND = {
  'event-deadline': 'אחרון להרשמה',
  'scholarship-deadline': 'אחרון להגשה',
}

/**
 * Splits a deadline entry's server-built "label: title" string (see
 * `listSchedule` in schedule.controller.js) back into its two parts — `null`
 * for any other kind, since only event/scholarship deadlines are prefixed
 * this way. Safe even if the underlying title itself contains a colon: only
 * the known, fixed label plus its ": " separator is stripped off the front,
 * not the first colon found anywhere in the string.
 */
export function splitDeadlineTitle(entry) {
  const label = DEADLINE_LABEL_BY_KIND[entry.kind]
  if (!label) return null
  return { label, rest: entry.title.slice(label.length + 2) }
}
