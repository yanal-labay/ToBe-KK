import { apiRequest } from './apiClient'

/**
 * GET /api/jobs (guest) or /api/jobs/admin (admin, includes inactive
 * postings). Sends credentials unconditionally, matching today's Jobs.jsx
 * behavior exactly (the one public GET in the app that does this).
 */
export function listJobs({ isAdmin } = {}) {
  return apiRequest(`/api/jobs${isAdmin ? '/admin' : ''}`, { credentials: 'include' })
}

/** POST /api/jobs — admin-only. */
export function createJob(formData) {
  return apiRequest('/api/jobs', { method: 'POST', credentials: 'include', body: formData, isFormData: true })
}

/** PATCH /api/jobs/:id — admin-only. */
export function updateJob(id, formData) {
  return apiRequest(`/api/jobs/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
    isFormData: true,
  })
}

/** DELETE /api/jobs/:id — admin-only. */
export function deleteJob(id) {
  return apiRequest(`/api/jobs/${id}`, { method: 'DELETE', credentials: 'include' })
}
