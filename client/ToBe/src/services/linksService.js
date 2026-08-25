import { apiRequest } from './apiClient'

/** GET /api/links — public. */
export function getLinks() {
  return apiRequest('/api/links')
}

/** POST /api/links/groups — admin-only. */
export function createLinkGroup({ title }) {
  return apiRequest('/api/links/groups', { method: 'POST', credentials: 'include', body: { title } })
}

/** PATCH /api/links/groups/:id — admin-only. */
export function renameLinkGroup(id, { title }) {
  return apiRequest(`/api/links/groups/${id}`, { method: 'PATCH', credentials: 'include', body: { title } })
}

/** DELETE /api/links/groups/:id — admin-only. */
export function deleteLinkGroup(id) {
  return apiRequest(`/api/links/groups/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** POST /api/links/items — admin-only. */
export function createLinkItem(values) {
  return apiRequest('/api/links/items', { method: 'POST', credentials: 'include', body: values })
}

/** PATCH /api/links/items/:id — admin-only. */
export function updateLinkItem(id, values) {
  return apiRequest(`/api/links/items/${id}`, { method: 'PATCH', credentials: 'include', body: values })
}

/** DELETE /api/links/items/:id — admin-only. */
export function deleteLinkItem(id) {
  return apiRequest(`/api/links/items/${id}`, { method: 'DELETE', credentials: 'include' })
}

/** PATCH /api/links/groups/reorder — admin-only. Fire-and-forget after an optimistic local reorder, same as today. */
export function reorderLinkGroups(orderedIds) {
  return apiRequest('/api/links/groups/reorder', {
    method: 'PATCH',
    credentials: 'include',
    body: { orderedIds },
  })
}

/** PATCH /api/links/items/reorder — admin-only. Fire-and-forget, same as today. */
export function reorderLinkItems(orderedIds) {
  return apiRequest('/api/links/items/reorder', {
    method: 'PATCH',
    credentials: 'include',
    body: { orderedIds },
  })
}
