import { apiRequest } from './apiClient'

/** GET /api/schedule — public. Used by both Schedule.jsx and Home.jsx's compact preview. */
export function getScheduleEntries() {
  return apiRequest('/api/schedule')
}

/** POST /api/schedule — admin-only. Creates a manual calendar entry. */
export function createScheduleEntry(values) {
  return apiRequest('/api/schedule', { method: 'POST', credentials: 'include', body: values })
}

/** PATCH /api/schedule/:id — admin-only. */
export function updateScheduleEntry(id, values) {
  return apiRequest(`/api/schedule/${id}`, { method: 'PATCH', credentials: 'include', body: values })
}

/** DELETE /api/schedule/:id — admin-only. */
export function deleteScheduleEntry(id) {
  return apiRequest(`/api/schedule/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** GET /api/schedule/categories — public. Used by both Schedule.jsx and Home.jsx's compact preview. */
export function getScheduleCategories() {
  return apiRequest('/api/schedule/categories')
}

/** POST /api/schedule/categories — admin-only. */
export function createScheduleCategory({ name, colorKey }) {
  return apiRequest('/api/schedule/categories', {
    method: 'POST',
    credentials: 'include',
    body: { name, colorKey },
  })
}

/** PATCH /api/schedule/categories/:id — admin-only. Renames/recolors a category. */
export function renameScheduleCategory(id, { name, colorKey }) {
  return apiRequest(`/api/schedule/categories/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { name, colorKey },
  })
}

/** DELETE /api/schedule/categories/:id — admin-only. */
export function deleteScheduleCategory(id) {
  return apiRequest(`/api/schedule/categories/${id}`, { method: 'DELETE', credentials: 'include' })
}
