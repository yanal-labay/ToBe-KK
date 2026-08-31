import { apiRequest } from '../../services/apiClient'

/**
 * GET /api/events (guest) or /api/events/admin (admin, includes inactive
 * events). Sends credentials unconditionally, matching jobsService.listJobs.
 */
export function listEvents({ isAdmin } = {}) {
  return apiRequest(`/api/events${isAdmin ? '/admin' : ''}`, { credentials: 'include' })
}

/** POST /api/events — admin-only. */
export function createEvent(formData) {
  return apiRequest('/api/events', { method: 'POST', credentials: 'include', body: formData, isFormData: true })
}

/** PATCH /api/events/:id — admin-only. */
export function updateEvent(id, formData) {
  return apiRequest(`/api/events/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
    isFormData: true,
  })
}

/** DELETE /api/events/:id — admin-only. */
export function deleteEvent(id) {
  return apiRequest(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' })
}

/**
 * POST /api/events/:id/register — public, no credentials. Shared by the
 * guest-facing SignupForm and SubmissionsPanel's admin "add" convenience
 * (both hit this exact endpoint today).
 */
export function registerForEvent(eventId, { name, email, phone }) {
  return apiRequest(`/api/events/${eventId}/register`, {
    method: 'POST',
    body: { name, email, phone },
  })
}

/** GET /api/events/:id/registrations — admin-only. */
export function listRegistrations(eventId) {
  return apiRequest(`/api/events/${eventId}/registrations`, { credentials: 'include' })
}

/** PATCH /api/events/:id/registrations/:registrationId — admin-only. */
export function updateRegistrationStatus(eventId, registrationId, { status }) {
  return apiRequest(`/api/events/${eventId}/registrations/${registrationId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { status },
  })
}

/** DELETE /api/events/:id/registrations/:registrationId — admin-only. */
export function deleteRegistration(eventId, registrationId) {
  return apiRequest(`/api/events/${eventId}/registrations/${registrationId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
