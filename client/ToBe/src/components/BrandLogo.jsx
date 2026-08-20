import './BrandLogo.css'

/** Logo + site name, swapping the logo asset for readability against the dark theme. */
function BrandLogo({ theme }) {
  const logoSrc = theme === 'dark' ? '/logodark.png' : '/logo.png'

  return (
    <div className="brand-logo">
      <img src={logoSrc} alt="לוגו מרכז צעירים כפר כמא" className="brand-logo-img" />
      <span className="brand-logo-title">מרכז צעירים כפר כמא</span>
    </div>
  )
}

export default BrandLogo
