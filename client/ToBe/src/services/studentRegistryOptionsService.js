import { apiRequest } from './apiClient'

/**
 * GET /api/student-registry-options — public. Used by both StudentRegistry.jsx
 * and RegistrantForm.jsx, which previously each reimplemented this call.
 */
export function getRegistryOptions() {
  return apiRequest('/api/student-registry-options')
}

/** POST /api/student-registry-options — admin-only. `category` is 'institution' or 'fieldOfStudy'. */
export function addRegistryOption({ category, name }) {
  return apiRequest('/api/student-registry-options', {
    method: 'POST',
    credentials: 'include',
    body: { category, name },
  })
}

/** DELETE /api/student-registry-options/:id — admin-only. */
export function deleteRegistryOption(id) {
  return apiRequest(`/api/student-registry-options/${id}`, { method: 'DELETE', credentials: 'include' })
}
