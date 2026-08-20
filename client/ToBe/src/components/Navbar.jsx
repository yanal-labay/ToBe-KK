import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../navConfig'
import './Navbar.css'

/** Abstract house icon used for the "home" nav entry instead of text. */
function HomeIcon() {
  return (
    <svg
      className="nav-home-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  )
}

/**
 * Renders one of two link sets depending on who's passed in — `NAV_LINKS`
 * for guests or `ADMIN_NAV_LINKS` for admins (see Layout.jsx, which decides
 * that) — so this component itself has no opinion on auth state. The
 * `icon: 'home'` entry renders `<HomeIcon/>` instead of its label, with
 * `end` matching so it's only marked active on an exact URL match.
 *
 * @param {{links?: Array<{label: string, to?: string, href?: string, icon?: string}>}} props
 */
function Navbar({ links = NAV_LINKS }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="navbar">
      <button
        type="button"
        className="navbar-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="פתח/סגור תפריט"
      >
        ☰
      </button>
      <ul className={`navbar-links ${isOpen ? 'is-open' : ''}`}>
        {links.map((link) => (
          <li key={link.label}>
            {link.to ? (
              <NavLink
                to={link.to}
                end={link.icon === 'home'}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                onClick={() => setIsOpen(false)}
              >
                {link.icon === 'home' ? (
                  <>
                    <HomeIcon />
                    <span className="visually-hidden">{link.label}</span>
                  </>
                ) : (
                  link.label
                )}
              </NavLink>
            ) : (
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navbar
