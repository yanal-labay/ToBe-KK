/**
 * Formats an ISO date string from the API for display in Hebrew, e.g.
 * "31 באוגוסט 2026". Shared by the cards so all three pages render dates
 * identically — EventCard and ScholarshipCard each had their own byte-for-byte
 * copy of this before JobCard needed one too.
 */
export function formatDate(value) {
  return new Date(value).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
