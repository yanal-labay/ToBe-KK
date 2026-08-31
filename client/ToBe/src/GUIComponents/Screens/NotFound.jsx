import { Link } from 'react-router-dom'
import './NotFound.css'

/**
 * Rendered by the `path="*"` route in App.jsx for any URL matching no other
 * route.
 *
 * It sits *inside* <Layout/> on purpose. Every real route is nested there, so
 * before this page existed an unmatched URL missed the layout too and React
 * Router rendered nothing at all — a blank white page with no header, no
 * navbar, and no way back except the browser's back button.
 *
 * Deliberately not `PlaceholderPage`, whose "העמוד בבנייה" is right for
 * /appointment (a page genuinely planned) but would promise a mistyped URL a
 * page that is never coming.
 */
function NotFound() {
  return (
    <div className="not-found-page">
      <p className="not-found-code">404</p>
      <h1>העמוד לא נמצא</h1>
      <p className="not-found-text">ייתכן שהכתובת שהוקלדה שגויה, או שהעמוד הוסר.</p>
      <Link to="/" className="btn btn-primary not-found-home-link">
        חזרה לדף הבית
      </Link>
    </div>
  )
}

export default NotFound
