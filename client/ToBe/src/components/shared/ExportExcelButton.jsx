import './ExportExcelButton.css'

/**
 * A small abstract "spreadsheet with a download arrow" icon, colored via
 * fixed fills rather than `currentColor` (green reads as "Excel" the way
 * red reads as "delete" for TrashIcon in RegistrationsPanel.jsx) — not a
 * literal reproduction of any brand's logo, just evocative of one, matching
 * this app's existing hand-drawn-SVG icon style.
 */
function ExcelExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2" width="14" height="20" rx="2" fill="#1D6F42" />
      <path d="M6.5 7h6M6.5 11h6M6.5 15h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17.5" cy="17.5" r="6" fill="#185C37" stroke="var(--color-surface)" strokeWidth="1.5" />
      <path
        d="M17.5 15v5m-2.3-2.3 2.3 2.3 2.3-2.3"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * An icon-only "export to Excel" button (spreadsheet + download-arrow
 * icon, no visible text) shared by the student-registry table
 * (RegistrantsPanel.jsx) and the per-event registrants table
 * (RegistrationsPanel.jsx). `label` sets the accessible name and tooltip
 * text since the icon alone carries no text of its own.
 *
 * @param {{ onClick: () => void, disabled?: boolean, label?: string }} props
 */
function ExportExcelButton({ onClick, disabled = false, label = 'ייצוא לאקסל' }) {
  return (
    <button
      type="button"
      className="btn btn-outline export-excel-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <ExcelExportIcon />
    </button>
  )
}

export default ExportExcelButton
