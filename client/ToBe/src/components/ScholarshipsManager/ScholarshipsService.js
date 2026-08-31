import { apiRequest } from '../../services/apiClient'

/** GET /api/scholarships — public. */
export function listScholarships() {
  return apiRequest('/api/scholarships')
}

/** POST /api/scholarships — admin-only. */
export function createScholarship(formData) {
  return apiRequest('/api/scholarships', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    isFormData: true,
  })
}

/** PATCH /api/scholarships/:id — admin-only. */
export function updateScholarship(id, formData) {
  return apiRequest(`/api/scholarships/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
    isFormData: true,
  })
}

/** DELETE /api/scholarships/:id — admin-only. */
export function deleteScholarship(id) {
  return apiRequest(`/api/scholarships/${id}`, { method: 'DELETE', credentials: 'include' })
}
