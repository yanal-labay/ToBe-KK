import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

/**
 * Resolves the theme to use on first render: an explicit choice the user
 * made previously (persisted in localStorage) takes priority, otherwise
 * falls back to the OS-level light/dark preference.
 */
function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Light/dark theme state, shared by every component that renders a
 * <ThemeToggleButton/> (Header, AdminTopbar, AdminLogin). Applying the
 * theme as a `data-theme` attribute on `<html>` is what drives the CSS
 * custom-property overrides defined in index.css.
 *
 * @returns {{theme: 'light'|'dark', toggleTheme: () => void}}
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'))

  return { theme, toggleTheme }
}
