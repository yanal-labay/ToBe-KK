// Must match the hostname the frontend itself is served from (localhost vs 127.0.0.1) —
// browsers treat them as different sites, which blocks the SameSite=Lax auth cookie.
export const API_URL = 'http://localhost:5000'
