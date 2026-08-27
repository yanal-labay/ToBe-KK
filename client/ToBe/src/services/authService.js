import { apiRequest } from './apiClient'

/** GET /api/auth/me — whoever is currently logged in (or a 401 if no one is). */
export function getCurrentAdmin() {
  return apiRequest('/api/auth/me', { credentials: 'include' })
}

/**
 * POST /api/auth/login. `rememberMe` picks the session length server-side —
 * 30 days when true, the usual 8 hours otherwise.
 */
export function login({ email, password, rememberMe = false }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: { email, password, rememberMe },
  })
}

/** POST /api/auth/logout. */
export function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
