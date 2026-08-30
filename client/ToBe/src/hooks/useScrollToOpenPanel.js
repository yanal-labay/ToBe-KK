import { useEffect } from 'react'

/**
 * Scrolls the element with id `panelId` into view when a panel opens; does
 * nothing while `panelId` is null. Admin create/edit forms render in place of
 * their card, which may sit far down the list or entirely off-screen, so
 * without this the click can look like it did nothing.
 *
 * `block: 'start'` rather than 'center': these panels are tall, and centering
 * one taller than the viewport pushes its first field off the top. Clearance
 * under the sticky top bar comes from `scroll-margin-top` on .form-focus-panel
 * (see styles/components.css).
 *
 * Call it once per independently-openable panel rather than passing a single
 * merged id — that way each panel scrolls only when it is the one that opened,
 * with no precedence rules between them.
 */
export function useScrollToOpenPanel(panelId) {
  useEffect(() => {
    if (!panelId) return
    document.getElementById(panelId)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }, [panelId])
}
