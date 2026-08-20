import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../navConfig'
import './Navbar.css'

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
