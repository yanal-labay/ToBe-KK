import { API_URL } from '../apiConfig'

/**
 * Resolves a stored `photoUrl` into something an <img src> can use.
 *
 * Two shapes exist in the database and both have to keep working:
 *
 *   - Cloudinary (current): a full "https://res.cloudinary.com/…" URL, which
 *     is already absolute and must be used exactly as-is.
 *   - Legacy: a server-relative "/uploads/events/123.png" path, written by
 *     the disk-based uploader this app used before deployment. Those files
 *     only exist on a local dev machine, but the rows are still in the
 *     database, so they still need the API origin prefixed.
 *
 * Blindly prefixing API_URL — which every call site used to do — would turn
 * a Cloudinary URL into "http://localhost:5000https://res.cloudinary.com/…"
 * and silently break every image.
 *
 * @param {string|null|undefined} photoUrl - the stored value, or null.
 * @param {string} [fallback] - returned when there's no photo at all.
 * @returns {string|undefined} a usable src, or `fallback`.
 */
export function resolvePhotoUrl(photoUrl, fallback) {
  if (!photoUrl) return fallback
  return /^https?:\/\//i.test(photoUrl) ? photoUrl : `${API_URL}${photoUrl}`
}
