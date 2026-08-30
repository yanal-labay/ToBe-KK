/**
 * Comparator builders for the listing pages' sort bars (see
 * components/shared/SortBar.jsx). Each returns a plain `(a, b) => number`
 * suitable for `Array.prototype.sort`.
 *
 * `Array.prototype.sort` is stable in every engine the app targets, so rows
 * the comparator calls equal keep the order the server sent them in rather
 * than shuffling between renders.
 */

/** Missing/unparseable dates sort last, in both directions. */
function dateValue(row, key) {
  const raw = row[key]
  if (!raw) return null
  const time = new Date(raw).getTime()
  return Number.isNaN(time) ? null : time
}

/** Oldest → newest. */
export function byDateAsc(key) {
  return (a, b) => {
    const av = dateValue(a, key)
    const bv = dateValue(b, key)
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return av - bv
  }
}

/** Newest → oldest. */
export function byDateDesc(key) {
  const asc = byDateAsc(key)
  return (a, b) => {
    const av = dateValue(a, key)
    const bv = dateValue(b, key)
    // Missing dates stay last rather than flipping to first, so "newest"
    // and "oldest" both bottom out on the rows that have no date at all.
    if (av === null || bv === null) return asc(a, b)
    return bv - av
  }
}

/**
 * Numeric sort where `nullsFirst` decides what a missing value means for
 * this particular field — the caller has to say, because it differs: a null
 * event `price` means "free" (belongs at the cheap end), while a null
 * scholarship `amount` means "unstated" (belongs at the bottom).
 */
export function byNumberAsc(key, { nullsFirst = false } = {}) {
  return (a, b) => {
    const av = typeof a[key] === 'number' ? a[key] : null
    const bv = typeof b[key] === 'number' ? b[key] : null
    if (av === null && bv === null) return 0
    if (av === null) return nullsFirst ? -1 : 1
    if (bv === null) return nullsFirst ? 1 : -1
    return av - bv
  }
}

/** As `byNumberAsc`, largest first. `nullsFirst` keeps the same meaning. */
export function byNumberDesc(key, { nullsFirst = false } = {}) {
  return (a, b) => {
    const av = typeof a[key] === 'number' ? a[key] : null
    const bv = typeof b[key] === 'number' ? b[key] : null
    if (av === null && bv === null) return 0
    if (av === null) return nullsFirst ? -1 : 1
    if (bv === null) return nullsFirst ? 1 : -1
    return bv - av
  }
}

/**
 * A-Z on a string field, Hebrew-aware: `localeCompare(…, 'he')` orders א
 * before ת, which a plain `<` comparison on UTF-16 code units does not do
 * reliably once niqqud or mixed Latin/Hebrew titles are involved.
 */
export function byTextAsc(key) {
  return (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'he')
}

/**
 * Runs comparators in order and returns the first non-zero result, so
 * earlier ones outrank later ones. Used to keep expired rows pinned to the
 * bottom regardless of the sort the visitor picked: the expired test runs
 * first, and the chosen sort only ever breaks ties *within* a group.
 */
export function chain(...comparators) {
  return (a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b)
      if (result !== 0) return result
    }
    return 0
  }
}
