import { useTheme } from '../hooks/useTheme'
import BrandLogo from './BrandLogo'
import ThemeToggleButton from './ThemeToggleButton'
import './Header.css'

function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="site-header">
      <BrandLogo theme={theme} />
      <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
    </header>
  )
}

export default Header
