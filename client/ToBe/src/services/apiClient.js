import { API_URL } from '../apiConfig'

/**
 * Low-level fetch wrapper shared by every service module — centralizes only
 * the mechanical, identical-everywhere part (URL prefixing, method/header/
 * body encoding). Response parsing and success/error handling stay in each
 * caller, since today's call sites don't all agree on that (some throw on
 * failure, some silently swallow it, some only check `res.ok`) — this
 * extraction preserves each call's existing behavior rather than unifying it.
 */
export function apiRequest(path, { method = 'GET', body, isFormData = false, credentials } = {}) {
  return fetch(`${API_URL}${path}`, {
    method,
    credentials,
    headers: isFormData || body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
  })
}
