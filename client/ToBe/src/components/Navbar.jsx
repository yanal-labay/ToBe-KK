import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../navConfig'
import './Navbar.css'

function Navbar() {
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
        {NAV_LINKS.map((link) => (
          <li key={link.label}>
            {link.to ? (
              <NavLink
                to={link.to}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
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
