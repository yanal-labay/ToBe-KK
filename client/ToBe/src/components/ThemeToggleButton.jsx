import './ThemeToggleButton.css'

function ThemeToggleButton({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default ThemeToggleButton
