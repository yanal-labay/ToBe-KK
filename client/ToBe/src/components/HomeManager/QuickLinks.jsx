import { Link } from 'react-router-dom'
import './QuickLinks.css'

const LINKS = [
  { to: '/events', icon: '📅', title: 'אירועים', description: 'האירועים הקרובים במרכז הצעירים' },
  { to: '/scholarships', icon: '🎓', title: 'מלגות', description: 'מלגות פתוחות להגשה' },
  { to: '/jobs', icon: '💼', title: 'לוח משרות', description: 'משרות פנויות לצעירים' },
  { to: '/schedule', icon: '🗓️', title: 'לוח זמנים', description: 'כל התאריכים החשובים במקום אחד' },
  { to: '/student-registry', icon: '📋', title: 'מאגר הצעירים', description: 'הרשמה למאגר הצעירים' },
]

/** A row of quick-link tiles to the app's main pages, reusing the shared .card/.card-row classes from shared.css. */
function QuickLinks() {
  return (
    <div className="card-row quick-links">
      {LINKS.map((link) => (
        <Link to={link.to} key={link.to} className="card">
          <div className="card-icon">{link.icon}</div>
          <h3>{link.title}</h3>
          <p>{link.description}</p>
        </Link>
      ))}
    </div>
  )
}

export default QuickLinks
