import { apiRequest } from './apiClient'

/**
 * GET /api/activity/summary — admin-only. One entry per followed source with
 * how many entries arrived since this admin last opened the dropdown.
 */
export function getActivitySummary() {
  return apiRequest('/api/activity/summary', { credentials: 'include' })
}

/**
 * POST /api/activity/seen — admin-only. Clears notifications at whichever
 * scope is passed:
 *
 *   markActivitySeen()                              everything
 *   markActivitySeen({ kind })                      one whole source
 *   markActivitySeen({ kind, parentId })            one event / posting
 *   markActivitySeen({ kind, entryId })             one person
 */
export function markActivitySeen(scope) {
  return apiRequest('/api/activity/seen', {
    method: 'POST',
    credentials: 'include',
    body: scope || {},
  })
}

/** GET /api/activity/stats — admin-only. Totals plus the merged recent feed. */
export function getActivityStats() {
  return apiRequest('/api/activity/stats', { credentials: 'include' })
}

/**
 * PATCH /api/activity/flag — admin-only. Sets or clears the "needs
 * attention" flag on one submission. `kind` tells the server which
 * collection the id belongs to.
 */
export function setActivityFlag({ kind, id, isFlagged }) {
  return apiRequest('/api/activity/flag', {
    method: 'PATCH',
    credentials: 'include',
    body: { kind, id, isFlagged },
  })
}
