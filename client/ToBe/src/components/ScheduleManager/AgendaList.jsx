import { useEffect, useMemo, useRef } from 'react'
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
import './AgendaList.css'

const DAY_HEADING_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' }
const RANGE_FORMAT = { day: 'numeric', month: 'long' }

/**
 * Every date key an entry occupies that falls inside `[rangeStart, rangeEnd]`.
 * A multi-day entry contributes one key per covered day, which is what puts it
 * under each date it's actually happening on.
 *
 * Both ends are clamped to the range before iterating, so a span running in
 * from a previous month (or one left open years into the future) costs one
 * iteration per *visible* day rather than one per day of its whole length.
 */
function occupiedDayKeys(entry, rangeStart, rangeEnd) {
  const start = dayOnly(entry.startDate)
  const end = dayOnly(entry.endDate)
  if (end < rangeStart || start > rangeEnd) return []

  const from = start < rangeStart ? new Date(rangeStart) : start
  const until = end > rangeEnd ? rangeEnd : end
  const keys = []
  for (const day = from; day <= until; day.setDate(day.getDate() + 1)) {
    keys.push(toDateKey(day))
  }
  return keys
}

/**
 * The mobile rendering of the same schedule the desktop grid shows: a
 * scrollable list of date headings, each followed by what is happening on that
 * date. Seven grid columns are ~45px wide on a phone, which wraps every title
 * to three or four lines — this drops the two-dimensional layout entirely
 * rather than trying to shrink it (see `useCalendarView`, which returns the
 * 'agenda' view type on a phone-sized viewport).
 *
 * The day list is derived from the *entries*, not from a calendar range, so
 * empty days simply never appear — no filtering pass, and no "אין אירועים"
 * filler between the days that matter.
 *
 * Two shapes, one component:
 * - The full page passes the anchor's month as `[rangeStart, rangeEnd]` with
 *   no `maxDays` cap.
 * - Home's compact preview passes today plus a horizon as the range and a
 *   small `maxDays`, making it a "next few upcoming" glance widget rather
 *   than a month.
 *
 * Both range ends are inclusive and required — an open-ended range would let
 * one long-running entry expand into thousands of day keys before `maxDays`
 * ever got the chance to trim them.
 *
 * @param {{
 *   entries: object[],
 *   rangeStart: Date,
 *   rangeEnd: Date,
 *   maxDays?: number,
 *   isAdmin: boolean,
 *   onEntryClick: (entry: object) => void,
 *   onDeleteManual?: (entry: object) => void,
 *   compact?: boolean,
 *   emptyMessage: string,
 * }} props
 */
function AgendaList({
  entries,
  rangeStart,
  rangeEnd,
  maxDays = Infinity,
  isAdmin,
  onEntryClick,
  onDeleteManual,
  compact = false,
  emptyMessage,
}) {
  const todayRef = useRef(null)
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const days = useMemo(() => {
    const { singleDayEntries, spanningEntries } = entries.reduce(
      (acc, entry) => {
        acc[isSpanning(entry) ? 'spanningEntries' : 'singleDayEntries'].push(entry)
        return acc
      },
      { singleDayEntries: [], spanningEntries: [] }
    )
    const entriesByDay = buildEntriesByDay(singleDayEntries)

    // Collect the keys first, then resolve each one's entries — so a day is
    // built once no matter how many entries landed on it.
    const keys = new Set()
    for (const entry of entries) {
      for (const key of occupiedDayKeys(entry, rangeStart, rangeEnd)) keys.add(key)
    }

    return [...keys]
      .sort()
      .slice(0, maxDays)
      .map((key) => {
        const date = dateKeyToDate(key)
        return { key, date, entries: entriesOnDay(date, entriesByDay, spanningEntries) }
      })
  }, [entries, rangeStart, rangeEnd, maxDays])

  // Opens on today rather than on the 1st: the current month is usually half
  // history, and scrolling past it every visit is exactly the friction this
  // view exists to remove. The ref is only attached to today's heading, so
  // this is a no-op in any month that doesn't contain it.
  //
  // Keyed on the range's start (i.e. which month is showing) rather than on
  // `days`, which gets a fresh identity every time the entry list reloads —
  // an admin saving an entry would otherwise be yanked back to today, on top
  // of Schedule.jsx's own scroll-to-the-edit-form. Never runs in compact
  // mode: the home page must not scroll itself out from under a visitor.
  const rangeStartTime = rangeStart.getTime()
  useEffect(() => {
    if (compact) return
    todayRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [compact, rangeStartTime])

  if (days.length === 0) {
    return <p className="schedule-agenda-empty">{emptyMessage}</p>
  }

  return (
    <div className={`schedule-agenda ${compact ? 'schedule-agenda--compact' : ''}`}>
      {days.map(({ key, date, entries: dayEntries }) => (
        <section className="schedule-agenda-day" key={key}>
          <h3
            className={`schedule-agenda-day-heading ${key === todayKey ? 'is-today' : ''}`}
            ref={key === todayKey ? todayRef : null}
          >
            {date.toLocaleDateString('he-IL', DAY_HEADING_FORMAT)}
            {key === todayKey && <span className="schedule-agenda-today-badge">היום</span>}
          </h3>

          <div className="schedule-agenda-entries">
            {dayEntries.map((entry) => {
              const deadline = splitDeadlineTitle(entry)
              // A multi-day entry repeats under every day it covers, so
              // without its full range it reads as several separate things
              // rather than one span passing through.
              const range = isSpanning(entry)
                ? new Intl.DateTimeFormat('he-IL', RANGE_FORMAT).formatRange(
                    dayOnly(entry.startDate),
                    dayOnly(entry.endDate)
                  )
                : null

              return (
                <div className="schedule-agenda-row" key={entry.id}>
                  <button
                    type="button"
                    className="schedule-agenda-entry"
                    onClick={() => onEntryClick(entry)}
                  >
                    <span className={`schedule-agenda-stripe ${colorClassFor(entry)}`} />
                    <span className="schedule-agenda-entry-text">
                      {deadline && (
                        <span className="schedule-agenda-entry-label">{deadline.label}</span>
                      )}
                      <span className="schedule-agenda-entry-title">
                        {deadline ? deadline.rest : entry.title}
                      </span>
                      {range && <span className="schedule-agenda-entry-range">{range}</span>}
                    </span>
                  </button>

                  {isAdmin && entry.kind === 'manual' && onDeleteManual && (
                    <button
                      type="button"
                      className="btn btn-secondary schedule-agenda-delete"
                      onClick={() => onDeleteManual(entry)}
                    >
                      מחיקה
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export default AgendaList
