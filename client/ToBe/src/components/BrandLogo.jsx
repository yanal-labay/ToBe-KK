import './BrandLogo.css'

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
