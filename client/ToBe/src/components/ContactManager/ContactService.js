import { apiRequest } from '../../services/apiClient'

/** GET /api/contact — public. */
export function getContact() {
  return apiRequest('/api/contact')
}

/** POST /api/contact/groups — admin-only. */
export function createContactGroup({ title }) {
  return apiRequest('/api/contact/groups', { method: 'POST', credentials: 'include', body: { title } })
}

/** PATCH /api/contact/groups/:id — admin-only. */
export function renameContactGroup(id, { title }) {
  return apiRequest(`/api/contact/groups/${id}`, { method: 'PATCH', credentials: 'include', body: { title } })
}

/** DELETE /api/contact/groups/:id — admin-only. */
export function deleteContactGroup(id) {
  return apiRequest(`/api/contact/groups/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** POST /api/contact/people — admin-only. */
export function createContactPerson(values) {
  return apiRequest('/api/contact/people', { method: 'POST', credentials: 'include', body: values })
}

/** PATCH /api/contact/people/:id — admin-only. */
export function updateContactPerson(id, values) {
  return apiRequest(`/api/contact/people/${id}`, { method: 'PATCH', credentials: 'include', body: values })
}

/** DELETE /api/contact/people/:id — admin-only. */
export function deleteContactPerson(id) {
  return apiRequest(`/api/contact/people/${id}`, { method: 'DELETE', credentials: 'include' })
}
