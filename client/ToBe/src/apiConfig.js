/**
 * Base URL for every API request made by the client (see fetch calls
 * throughout hooks/ and pages/). Must match the hostname the frontend
 * itself is served from (localhost vs 127.0.0.1) — browsers treat them as
 * different sites, which blocks the SameSite=Lax auth cookie set by the
 * server on login.
 */
export const API_URL = 'http://localhost:5000'
