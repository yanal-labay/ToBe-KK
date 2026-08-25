import { useState } from 'react'
import './ScholarshipFilterSidebar.css'

/**
 * One admin-defined field's checkbox group in the filter sidebar (e.g.
 * "תגיות" or any new field), independently collapsible — collapsing one
 * field leaves every other field's group untouched. Mirrors
 * `components/jobs/JobFilterSidebar.jsx`'s `JobFilterFieldGroup` exactly.
 * Fields with no options yet render nothing — there'd be nothing to check.
 *
 * @param {{
 *   field: {_id: string, name: string, options: Array<{_id: string, name: string}>},
 *   selected: string[],
 *   onToggleOption: (optionId: string) => void,
 * }} props
 */
function ScholarshipFilterFieldGroup({ field, selected, onToggleOption }) {
  const [collapsed, setCollapsed] = useState(false)

  if (field.options.length === 0) return null

  return (
    <div className="scholarship-filter-group">
      <div
        className="scholarship-filter-field-header"
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
        <span className={`scholarship-filter-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`}>▾</span>
        <h4>{field.name}</h4>
      </div>
      {!collapsed && (
        <div className="scholarship-filter-field-options">
          {field.options.map((option) => (
            <label className="scholarship-filter-checkbox" key={option._id}>
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
 * The scholarships page's search box + per-field filter checkboxes,
 * rendered in the right-hand sidebar (see Scholarships.css's
 * `.scholarships-page-layout` grid). Fully controlled by the parent
 * (`Scholarships.jsx` owns the search term and every selected filter) —
 * mirrors `JobFilterSidebar.jsx` minus the student-position checkbox
 * (scholarships have no equivalent fixed boolean flag).
 *
 * Search is always visible; each admin-defined field (see
 * ScholarshipFieldsManager.jsx) gets its own independent collapsible group.
 *
 * @param {{
 *   searchTerm: string,
 *   onSearchChange: (value: string) => void,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   selectedOptionIds: Record<string, string[]>,
 *   onToggleOption: (fieldId: string, optionId: string) => void,
 *   hasActiveFilters: boolean,
 *   onClearFilters: () => void,
 * }} props
 */
function ScholarshipFilterSidebar({
  searchTerm,
  onSearchChange,
  fields,
  selectedOptionIds,
  onToggleOption,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="scholarship-filter-sidebar">
      <label className="scholarship-filter-search">
        חיפוש לפי שם מלגה
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="לדוגמה: מלגת מצוינות..."
        />
      </label>

      {fields.map((field) => (
        <ScholarshipFilterFieldGroup
          key={field._id}
          field={field}
          selected={selectedOptionIds[field._id] || []}
          onToggleOption={(optionId) => onToggleOption(field._id, optionId)}
        />
      ))}

      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-outline scholarship-filter-clear"
          onClick={onClearFilters}
        >
          נקה סינון
        </button>
      )}
    </div>
  )
}

export default ScholarshipFilterSidebar
