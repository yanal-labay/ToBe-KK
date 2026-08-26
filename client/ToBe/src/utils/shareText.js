const SITE_NAME = 'מרכז צעירים כפר כמא'

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
    `📅 ${formatDate(event.date)}`,
    `🕒 ${event.time}`,
    `📍 ${event.location}`,
    `עלות: ${event.price != null ? `${event.price} ₪` : 'חינם'}`,
    event.registrationDeadline ? `⏳ הרשמה עד: ${formatDate(event.registrationDeadline)}` : null,
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
    `מלגה חדשה ב${SITE_NAME}: "${scholarship.title}"`,
    '',
    scholarship.amount != null ? `💰 סכום המלגה: ₪${scholarship.amount}` : null,
    `📅 הגשה עד: ${formatDate(scholarship.deadline)}`,
    scholarship.volunteerHours != null
      ? `🙋 נדרשות ${scholarship.volunteerHours} שעות התנדבות`
      : null,
    '',
    'לפרטים ולהגשה:',
    buildShareUrl('/scholarships', scholarship._id),
  ])
}

/** Ready-to-post invitation for one job posting, ending in a link to it on the site. */
export function buildJobShareText(job) {
  return joinLines([
    `דרושים: "${job.title}" — ${SITE_NAME}`,
    '',
    `🏢 ${job.company}`,
    `📍 ${job.location}`,
    job.salary ? `💰 ${job.salary}` : null,
    job.isStudentPosition ? '🎓 משרת סטודנטים' : null,
    '',
    'לפרטים:',
    buildShareUrl('/jobs', job._id),
  ])
}
