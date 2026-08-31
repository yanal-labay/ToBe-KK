import { apiRequest } from '../../services/apiClient'

/** GET /api/job-fields — public. Every admin-defined field with its options nested. */
export function listJobFields() {
  return apiRequest('/api/job-fields')
}

/** POST /api/job-fields — admin-only. */
export function createJobField({ name }) {
  return apiRequest('/api/job-fields', { method: 'POST', credentials: 'include', body: { name } })
}

/** PATCH /api/job-fields/:id — admin-only. */
export function renameJobField(id, { name }) {
  return apiRequest(`/api/job-fields/${id}`, { method: 'PATCH', credentials: 'include', body: { name } })
}

/** DELETE /api/job-fields/:id — admin-only. Cascades to every job's fieldSelections server-side. */
export function deleteJobField(id) {
  return apiRequest(`/api/job-fields/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** POST /api/job-fields/:fieldId/options — admin-only. */
export function addJobFieldOption(fieldId, { name }) {
  return apiRequest(`/api/job-fields/${fieldId}/options`, {
    method: 'POST',
    credentials: 'include',
    body: { name },
  })
}

/** DELETE /api/job-fields/:fieldId/options/:optionId — admin-only. */
export function deleteJobFieldOption(fieldId, optionId) {
  return apiRequest(`/api/job-fields/${fieldId}/options/${optionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
