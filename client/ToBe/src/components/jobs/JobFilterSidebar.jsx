import { useState } from 'react'
import './JobFilterSidebar.css'

/**
 * One admin-defined field's checkbox group in the filter sidebar (e.g.
 * "סוג משרה" or "תחום"), independently collapsible — collapsing one field
 * leaves every other field's group untouched. The collapse mechanics
 * (arrow rotate, `aria-expanded`, Enter/Space keyboard support) mirror
 * `components/links/LinkGroupCard.jsx`'s header collapse exactly. Fields
 * with no options yet render nothing — there'd be nothing to check.
 *
 * @param {{
 *   field: {_id: string, name: string, options: Array<{_id: string, name: string}>},
 *   selected: string[],
 *   onToggleOption: (optionId: string) => void,
 * }} props
 */
function JobFilterFieldGroup({ field, selected, onToggleOption }) {
  const [collapsed, setCollapsed] = useState(false)

  if (field.options.length === 0) return null

  return (
    <div className="job-filter-group">
      <div
        className="job-filter-field-header"
        onClick={() => setCollapsed((current) => !current)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCollapsed((current) => !current)
          }
        }}
      >
        <span className={`job-filter-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`}>▾</span>
        <h4>{field.name}</h4>
      </div>
      {!collapsed && (
        <div className="job-filter-field-options">
          {field.options.map((option) => (
            <label className="job-filter-checkbox" key={option._id}>
              <input
                type="checkbox"
                checked={selected.includes(option._id)}
                onChange={() => onToggleOption(option._id)}
              />
              {option.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The jobs page's search box + per-field filter checkboxes, rendered in
 * the right-hand sidebar (see Jobs.css's `.jobs-page-layout` grid). Fully
 * controlled by the parent (`Jobs.jsx` owns the search term and every
 * selected filter) — this component only renders the UI and calls the
 * provided callbacks, same "dumb component, parent owns state" convention
 * used throughout this app.
 *
 * Search and the student-position checkbox are always visible; each
 * admin-defined field (see JobFieldsManager.jsx) gets its own independent
 * collapsible group instead of one shared collapsible wrapper around
 * everything.
 *
 * @param {{
 *   searchTerm: string,
 *   onSearchChange: (value: string) => void,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   selectedOptionIds: Record<string, string[]>,
 *   onToggleOption: (fieldId: string, optionId: string) => void,
 *   studentOnly: boolean,
 *   onToggleStudentOnly: () => void,
 *   hasActiveFilters: boolean,
 *   onClearFilters: () => void,
 * }} props
 */
function JobFilterSidebar({
  searchTerm,
  onSearchChange,
  fields,
  selectedOptionIds,
  onToggleOption,
  studentOnly,
  onToggleStudentOnly,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="job-filter-sidebar">
      <label className="job-filter-search">
        חיפוש לפי שם משרה
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="לדוגמה: מדריך/ה, מזכיר/ה..."
        />
      </label>

      <label className="job-filter-checkbox job-filter-student-only">
        <input type="checkbox" checked={studentOnly} onChange={onToggleStudentOnly} />
        משרות סטודנטים בלבד
      </label>

      {fields.map((field) => (
        <JobFilterFieldGroup
          key={field._id}
          field={field}
          selected={selectedOptionIds[field._id] || []}
          onToggleOption={(optionId) => onToggleOption(field._id, optionId)}
        />
      ))}

      {hasActiveFilters && (
        <button type="button" className="btn btn-outline job-filter-clear" onClick={onClearFilters}>
          נקה סינון
        </button>
      )}
    </div>
  )
}

export default JobFilterSidebar
