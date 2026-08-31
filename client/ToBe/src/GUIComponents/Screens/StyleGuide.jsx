import './StyleGuide.css'

const PALETTE = [
  { name: 'Primary (צהוב)', varName: '--color-primary' },
  { name: 'Primary Dark', varName: '--color-primary-dark' },
  { name: 'Primary Light', varName: '--color-primary-light' },
  { name: 'Surface', varName: '--color-surface' },
  { name: 'Text', varName: '--color-text' },
  { name: 'Text Muted', varName: '--color-text-muted' },
]

/**
 * Internal reference page (/style-guide, no nav link) showing the color
 * palette, typography, buttons, and card component — a living reference for
 * the CSS custom properties and utility classes defined in index.css and
 * styles/components.css.
 */
function StyleGuide() {
  return (
    <div className="style-guide">
      <header className="sg-header">
        <p className="sg-subtitle">לוח סגנון (Style Guide) — ערכת צבעים צהוב-לבן</p>
      </header>

      <section className="sg-section">
        <h2>פלטת צבעים</h2>
        <div className="swatch-row">
          {PALETTE.map((color) => (
            <div className="swatch" key={color.varName}>
              <div className="swatch-color" style={{ background: `var(${color.varName})` }} />
              <div className="swatch-label">
                <span>{color.name}</span>
                <code>{color.varName}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-section">
        <h2>טיפוגרפיה</h2>
        <div className="type-sample">
          <h1>כותרת ראשית H1</h1>
          <h2>כותרת משנית H2</h2>
          <h3>כותרת שלישית H3</h3>
          <p className="sg-body-text">
            טקסט רגיל לדוגמה — כך ייראה טקסט תוכן רגיל באתר, על רקע לבן.
          </p>
          <p className="sg-small-text">טקסט קטן / הערה לדוגמה</p>
        </div>
      </section>

      <section className="sg-section">
        <h2>כפתורים</h2>
        <div className="button-row">
          <button className="btn btn-primary">כפתור ראשי</button>
          <button className="btn btn-secondary">כפתור משני</button>
          <button className="btn btn-outline">כפתור מתאר</button>
          <button className="btn btn-primary" disabled>
            לא פעיל
          </button>
        </div>
      </section>

      <section className="sg-section">
        <h2>כרטיס לדוגמה</h2>
        <div className="card-row">
          <div className="card">
            <div className="card-icon">🎓</div>
            <h3>מלגות</h3>
            <p>הגשת מועמדות למלגות ומעקב אחר סטטוס הבקשה.</p>
            <button className="btn btn-primary">לפרטים</button>
          </div>
          <div className="card">
            <div className="card-icon">📅</div>
            <h3>סדנאות ואירועים</h3>
            <p>הרשמה לסדנאות ומעקב אחר פעילויות קרובות.</p>
            <button className="btn btn-primary">לפרטים</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default StyleGuide
