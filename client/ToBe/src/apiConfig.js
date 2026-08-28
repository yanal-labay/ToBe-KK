// Vite exposes only VITE_-prefixed variables to the browser, and inlines them
// at BUILD time — so this is baked in when `npm run build` runs, not read from
// the environment when the app starts. Changing it on a host means rebuilding.
// The fallback keeps local dev working with no .env file at all.
const configured = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Base URL for every API request made by the client (see fetch calls
 * throughout hooks/ and pages/), and the prefix for uploaded photo `<img
 * src>` values. Must match the hostname the frontend itself is served from
 * (localhost vs 127.0.0.1) — browsers treat them as different sites, which
 * blocks the SameSite=Lax auth cookie set by the server on login.
 *
 * In a deployment this has to agree with the server's CLIENT_ORIGIN
 * (server/src/index.js) — they're the two halves of the same CORS +
 * credentialed-cookie pairing, and a mismatch breaks login specifically,
 * while leaving every public page working.
 *
 * The trailing slash is stripped because every call site concatenates
 * directly (`${API_URL}${path}`), and this value is typically typed by hand
 * into a host's dashboard where a stray slash would yield `//api/events`.
 */
export const API_URL = configured.replace(/\/+$/, '')
