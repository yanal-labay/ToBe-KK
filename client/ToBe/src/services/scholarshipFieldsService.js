import { apiRequest } from './apiClient'

/** GET /api/scholarship-fields — public. Every admin-defined field with its options nested. */
export function listScholarshipFields() {
  return apiRequest('/api/scholarship-fields')
}

/** POST /api/scholarship-fields — admin-only. */
export function createScholarshipField({ name }) {
  return apiRequest('/api/scholarship-fields', { method: 'POST', credentials: 'include', body: { name } })
}

/** PATCH /api/scholarship-fields/:id — admin-only. */
export function renameScholarshipField(id, { name }) {
  return apiRequest(`/api/scholarship-fields/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { name },
  })
}

/** DELETE /api/scholarship-fields/:id — admin-only. Cascades to every scholarship's fieldSelections server-side. */
export function deleteScholarshipField(id) {
  return apiRequest(`/api/scholarship-fields/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** POST /api/scholarship-fields/:fieldId/options — admin-only. */
export function addScholarshipFieldOption(fieldId, { name }) {
  return apiRequest(`/api/scholarship-fields/${fieldId}/options`, {
    method: 'POST',
    credentials: 'include',
    body: { name },
  })
}

/** DELETE /api/scholarship-fields/:fieldId/options/:optionId — admin-only. */
export function deleteScholarshipFieldOption(fieldId, optionId) {
  return apiRequest(`/api/scholarship-fields/${fieldId}/options/${optionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
