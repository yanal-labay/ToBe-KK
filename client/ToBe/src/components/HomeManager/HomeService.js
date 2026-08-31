import { apiRequest } from '../../services/apiClient'

/** GET /api/home — public. */
export function getHome() {
  return apiRequest('/api/home')
}

/** PATCH /api/home/content — admin-only. Saves the hero title/body. */
export function saveHomeContent({ title, body }) {
  return apiRequest('/api/home/content', {
    method: 'PATCH',
    credentials: 'include',
    body: { title, body },
  })
}

/** PATCH /api/home/content — admin-only. Saves the carousel caption fields. */
export function saveHomeCaption({ captionTitle, captionText }) {
  return apiRequest('/api/home/content', {
    method: 'PATCH',
    credentials: 'include',
    body: { captionTitle, captionText },
  })
}

/** POST /api/home/photos — admin-only. */
export function addHomePhoto(formData) {
  return apiRequest('/api/home/photos', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    isFormData: true,
  })
}

/** DELETE /api/home/photos/:id — admin-only. */
export function deleteHomePhoto(id) {
  return apiRequest(`/api/home/photos/${id}`, { method: 'DELETE', credentials: 'include' })
}
