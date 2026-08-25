import { apiRequest } from './apiClient'

/** GET /api/student-registry — admin-only. */
export function listRegistrants() {
  return apiRequest('/api/student-registry', { credentials: 'include' })
}

/**
 * POST /api/student-registry — public. Sends credentials even on the guest
 * self-signup path, matching today's RegistrantForm.jsx exactly.
 */
export function createRegistrant(payload) {
  return apiRequest('/api/student-registry', { method: 'POST', credentials: 'include', body: payload })
}

/** PATCH /api/student-registry/:id — admin-only. */
export function updateRegistrant(id, payload) {
  return apiRequest(`/api/student-registry/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: payload,
  })
}

/** DELETE /api/student-registry/:id — admin-only. */
export function deleteRegistrant(id) {
  return apiRequest(`/api/student-registry/${id}`, { method: 'DELETE', credentials: 'include' })
}
