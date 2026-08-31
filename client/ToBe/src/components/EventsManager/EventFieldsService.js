import { apiRequest } from '../../services/apiClient'

/** GET /api/event-fields — public. Every admin-defined field with its options nested. */
export function listEventFields() {
  return apiRequest('/api/event-fields')
}

/** POST /api/event-fields — admin-only. */
export function createEventField({ name }) {
  return apiRequest('/api/event-fields', { method: 'POST', credentials: 'include', body: { name } })
}

/** PATCH /api/event-fields/:id — admin-only. */
export function renameEventField(id, { name }) {
  return apiRequest(`/api/event-fields/${id}`, { method: 'PATCH', credentials: 'include', body: { name } })
}

/** DELETE /api/event-fields/:id — admin-only. Cascades to every event's fieldSelections server-side. */
export function deleteEventField(id) {
  return apiRequest(`/api/event-fields/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** POST /api/event-fields/:fieldId/options — admin-only. */
export function addEventFieldOption(fieldId, { name }) {
  return apiRequest(`/api/event-fields/${fieldId}/options`, {
    method: 'POST',
    credentials: 'include',
    body: { name },
  })
}

/** DELETE /api/event-fields/:fieldId/options/:optionId — admin-only. */
export function deleteEventFieldOption(fieldId, optionId) {
  return apiRequest(`/api/event-fields/${fieldId}/options/${optionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
