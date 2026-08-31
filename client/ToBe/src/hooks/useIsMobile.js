import { useSyncExternalStore } from 'react'

/**
 * The app's canonical mobile breakpoint. Duplicated in CSS by Navbar.css and
 * Calendar.css (a media query can't read a JS constant) — keep all three in
 * sync. This is the only JS copy.
 */
export const MOBILE_QUERY = '(max-width: 900px)'

function subscribe(onStoreChange) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onStoreChange)
  return () => mql.removeEventListener('change', onStoreChange)
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches

/**
 * Whether the viewport is currently phone-sized, kept live rather than read
 * once at mount.
 *
 * Being reactive is the whole point: this doesn't pick a default a user can
 * then override, it picks a *layout* (see `useCalendarView`, where it decides
 * between the calendar grid and the mobile agenda). A one-shot read would
 * leave a rotated phone or a resized window rendering the wrong one until a
 * reload.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: matchMedia is
 * precisely the "external store" it exists for. The `useState` version needs
 * a resync inside the effect to cover a resize landing between the initial
 * render and the listener being attached — which is a setState in an effect
 * body, the very thing `react-hooks/set-state-in-effect` warns about. Reading
 * the snapshot on every render closes that window with no extra render at all.
 *
 * @returns {boolean}
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
