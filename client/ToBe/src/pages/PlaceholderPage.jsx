import './PlaceholderPage.css'

/**
 * "Coming soon" stand-in used for every nav page that doesn't have real
 * content yet (מלגות, לוח זמנים, etc.) — see App.jsx. `Events` is the first
 * page to graduate from this into a real implementation; the rest are
 * expected to follow the same pattern later.
 *
 * @param {{title: string}} props
 */
function PlaceholderPage({ title }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>העמוד בבנייה — בקרוב יתווסף כאן תוכן.</p>
    </div>
  )
}

export default PlaceholderPage
