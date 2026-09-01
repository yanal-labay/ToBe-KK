const SITE_NAME = 'מרכז צעירים כפר כמא'

/*
 * These texts are deliberately free of emoji, the shekel sign, and em-dashes,
 * even though the cards themselves use all three.
 *
 * WhatsApp's share-link handler mangles anything whose UTF-8 encoding runs
 * past two bytes: emoji (4 bytes) came through as U+FFFD, while Hebrew
 * letters (2 bytes) were untouched. The link this app builds is correctly
 * percent-encoded — verified byte for byte — so the corruption is on the
 * receiving side and can't be fixed by encoding differently; the only
 * reliable fix is not to send those characters. `₪` (U+20AA) and `—`
 * (U+2014) are 3-byte and therefore at the same risk, so plain "ש\"ח" and a
 * hyphen stand in for them.
 *
 * The upshot: keep every character here inside the 2-byte range. There's a
 * test asserting exactly that.
 */

/** Same Hebrew long-date format the cards themselves display. */
function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * An absolute link back to one item on the public site, using the origin the
 * admin is currently browsing. That's deliberate: nothing in this client
 * knows the site's own public address (apiConfig.js only holds the *API*
 * origin), and reading it off the browser means the link is automatically
 * right once deployed, with no config to keep in sync. The tradeoff is that
 * sharing from a dev server yields a localhost link.
 *
 * `?highlight=<id>` is the existing deep-link shape the calendar already
 * builds — the target page scrolls to that card and pulses it.
 */
function buildShareUrl(path, id) {
  return `${window.location.origin}${path}?highlight=${id}`
}

/**
 * Joins the lines, dropping only the `null`s — an optional field the item
 * doesn't have. Note this can't be `filter(Boolean)`: the deliberate `''`
 * entries are the blank lines separating the text's paragraphs, and those
 * have to survive.
 */
function joinLines(lines) {
  return lines.filter((line) => line !== null).join('\n')
}

/** Ready-to-post invitation for one event, ending in a link to it on the site. */
export function buildEventShareText(event) {
  return joinLines([
    `בואו לאירוע "${event.title}" של ${SITE_NAME}!`,
    '',
    `תאריך: ${formatDate(event.date)}`,
    `שעה: ${event.time}`,
    `מיקום: ${event.location}`,
    `עלות: ${event.price != null ? `${event.price} ש"ח` : 'חינם'}`,
    event.registrationDeadline ? `הרשמה עד: ${formatDate(event.registrationDeadline)}` : null,
    '',
    'לפרטים והרשמה:',
    buildShareUrl('/events', event._id),
  ])
}

/**
 * Ready-to-post invitation for one scholarship. Deliberately links to the
 * scholarship's card on the site rather than its external `url` — the card
 * already carries that "לפרטים ולהגשה" button, and a link home keeps the
 * reader on the site.
 */
export function buildScholarshipShareText(scholarship) {
  return joinLines([
    `מלגה חדשה: "${scholarship.title}"`,
    '',
    scholarship.amount != null ? `סכום המלגה: ${scholarship.amount} ש"ח` : null,
    `הגשה עד: ${formatDate(scholarship.deadline)}`,
    scholarship.volunteerHours != null
      ? `נדרשות ${scholarship.volunteerHours} שעות התנדבות`
      : null,
    '',
    'לפרטים ולהגשה:',
    buildShareUrl('/scholarships', scholarship._id),
  ])
}

/** Ready-to-post invitation for one job posting, ending in a link to it on the site. */
export function buildJobShareText(job) {
  return joinLines([
    `דרושים: "${job.title}" - ${SITE_NAME}`,
    '',
    `חברה: ${job.company}`,
    `מיקום: ${job.location}`,
    job.salary ? `שכר: ${job.salary}` : null,
    '',
    'לפרטים:',
    buildShareUrl('/jobs', job._id),
  ])
}
