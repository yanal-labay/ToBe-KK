import { useState } from 'react'
import './EventFilterSidebar.css'

/**
 * One admin-defined field's checkbox group in the filter sidebar (e.g.
 * "סוג אירוע" or "קהל יעד"), independently collapsible — collapsing one field
 * leaves every other field's group untouched. The collapse mechanics
 * (arrow rotate, `aria-expanded`, Enter/Space keyboard support) mirror
 * `LinksManager/LinkGroupCard.jsx`'s header collapse exactly. Fields
 * with no options yet render nothing — there'd be nothing to check.
 *
 * @param {{
 *   field: {_id: string, name: string, options: Array<{_id: string, name: string}>},
 *   selected: string[],
 *   onToggleOption: (optionId: string) => void,
 * }} props
 */
function EventFilterFieldGroup({ field, selected, onToggleOption }) {
  const [collapsed, setCollapsed] = useState(false)

  if (field.options.length === 0) return null

  return (
    <div className="event-filter-group">
      <div
        className="event-filter-field-header"
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
        <span className={`event-filter-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`}>▾</span>
        <h4>{field.name}</h4>
      </div>
      {!collapsed && (
        <div className="event-filter-field-options">
          {field.options.map((option) => (
            <label className="event-filter-checkbox" key={option._id}>
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
 * The events page's search box + per-field filter checkboxes, rendered in
 * the right-hand sidebar (see Events.css's `.events-page-layout` grid). Fully
 * controlled by the parent (`Events.jsx` owns the search term and every
 * selected filter) — this component only renders the UI and calls the
 * provided callbacks, same "dumb component, parent owns state" convention
 * used throughout this app.
 *
 * Search and the student-position checkbox are always visible; each
 * admin-defined field (see EventFieldsManager.jsx) gets its own independent
 * collapsible group instead of one shared collapsible wrapper around
 * everything.
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
function EventFilterSidebar({
  searchTerm,
  onSearchChange,
  fields,
  selectedOptionIds,
  onToggleOption,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="event-filter-sidebar">
      <label className="event-filter-search">
        חיפוש לפי שם האירוע
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="לדוגמה: סדנה, הרצאה..."
        />
      </label>

      {fields.map((field) => (
        <EventFilterFieldGroup
          key={field._id}
          field={field}
          selected={selectedOptionIds[field._id] || []}
          onToggleOption={(optionId) => onToggleOption(field._id, optionId)}
        />
      ))}

      {hasActiveFilters && (
        <button type="button" className="btn btn-outline event-filter-clear" onClick={onClearFilters}>
          נקה סינון
        </button>
      )}
    </div>
  )
}

export default EventFilterSidebar
