// Vite exposes only VITE_-prefixed variables to the browser, and inlines them
// at BUILD time — so this is baked in when `npm run build` runs, not read from
// the environment when the app starts. Changing it on a host means rebuilding.
//
// The default differs by build, and both halves matter:
//
//   dev   -> the API on localhost:5000, so `npm run dev` needs no .env.
//   build -> "" , i.e. same-origin relative paths like "/api/events".
//
// The empty production default is what makes the deployment work. Vercel
// rewrites /api/* and /uploads/* through to Render (see vercel.json), so the
// browser only ever talks to the Vercel domain. That keeps the session cookie
// first-party: it is SameSite=Lax, and pointing the client straight at
// onrender.com would make every API call cross-site, so the browser would
// refuse to send it and admin login would silently stop working while every
// public page kept loading fine.
//
// `??` rather than `||` on purpose — an explicitly empty VITE_API_URL must
// mean "use relative paths", not fall through to the localhost default.
const configured =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '')

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
