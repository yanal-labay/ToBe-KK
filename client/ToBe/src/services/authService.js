import { apiRequest } from './apiClient'

/** GET /api/auth/me — whoever is currently logged in (or a 401 if no one is). */
export function getCurrentAdmin() {
  return apiRequest('/api/auth/me', { credentials: 'include' })
}

/** POST /api/auth/login. */
export function login({ email, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: { email, password },
  })
}

/** POST /api/auth/logout. */
export function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
