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

/**
 * POST /api/jobs/:id/apply — public, no credentials. Shared by the
 * visitor-facing SignupForm and SubmissionsPanel's admin "add" convenience,
 * mirroring registerForEvent. The server rejects this for any job whose
 * applicationMethod isn't "form".
 */
export function applyToJob(jobId, { name, email, phone }) {
  return apiRequest(`/api/jobs/${jobId}/apply`, {
    method: 'POST',
    body: { name, email, phone },
  })
}

/** GET /api/jobs/:id/applications — admin-only. */
export function listApplications(jobId) {
  return apiRequest(`/api/jobs/${jobId}/applications`, { credentials: 'include' })
}

/** PATCH /api/jobs/:id/applications/:applicationId — admin-only. */
export function updateApplicationStatus(jobId, applicationId, { status }) {
  return apiRequest(`/api/jobs/${jobId}/applications/${applicationId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { status },
  })
}

/** DELETE /api/jobs/:id/applications/:applicationId — admin-only. */
export function deleteApplication(jobId, applicationId) {
  return apiRequest(`/api/jobs/${jobId}/applications/${applicationId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
