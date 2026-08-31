import { Link } from 'react-router-dom'
import './BrandLogo.css'

/** Logo + site name, swapping the logo asset for readability against the dark theme. Always links to the shared home page, for guests and admins alike. */
function BrandLogo({ theme }) {
  const logoSrc = theme === 'dark' ? '/logodark.png' : '/logo.png'

  return (
    <Link to="/" className="brand-logo">
      <img src={logoSrc} alt="לוגו מרכז צעירים כפר כמא" className="brand-logo-img" />
      <span className="brand-logo-title">מרכז צעירים כפר כמא</span>
    </Link>
  )
}

export default BrandLogo
