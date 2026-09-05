import { useState } from 'react'
import './FilterSidebar.css'

/**
 * One admin-defined field's checkbox group, independently collapsible —
 * collapsing one field leaves every other field's group untouched, which is
 * why `collapsed` lives here per-group rather than as a map in the parent.
 * Fields with no options yet render nothing: there'd be nothing to check.
 *
 * The collapse mechanics (arrow rotate, `aria-expanded`, Enter/Space keyboard
 * support) mirror `LinksManager/LinkGroupCard.jsx`'s header collapse.
 *
 * @param {{
 *   field: {_id: string, name: string, options: Array<{_id: string, name: string}>},
 *   selected: string[],
 *   onToggleOption: (optionId: string) => void,
 * }} props
 */
function FilterFieldGroup({ field, selected, onToggleOption }) {
  // Collapsed by default: several fields' worth of checkboxes pushed the search
  // box and the clear button off a phone screen, so the sidebar opens as a stack
  // of headers instead. A group that already has selections starts open, so an
  // applied filter is never hidden behind a closed header.
  //
  // An initial value only — clearing a filter must not re-collapse the group out
  // from under the user. Per-visit rather than persisted, matching
  // `LinksManager/LinkGroupCard.jsx`, whose cards also begin collapsed on every
  // visit.
  const [collapsed, setCollapsed] = useState(selected.length === 0)

  if (field.options.length === 0) return null

  return (
    <div className="filter-group">
      <div
        className="filter-field-header"
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
        <span className={`filter-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`}>▾</span>
        <h4>{field.name}</h4>
      </div>
      {!collapsed && (
        <div className="filter-field-options">
          {field.options.map((option) => (
            <label className="filter-checkbox" key={option._id}>
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
 * The search box + per-field filter checkboxes shown in a listing page's
 * sidebar. Shared by /events, /jobs and /scholarships, which previously each
 * carried their own byte-identical copy differing only in a class prefix and
 * two Hebrew strings.
 *
 * Fully controlled: the parent page owns the search term and every selected
 * option, and this only renders the UI and calls back — the same "dumb
 * component, parent owns state" convention used throughout the app.
 *
 * The page supplies `searchLabel`/`searchPlaceholder` because only the wording
 * differs between the three; everything else is identical by construction.
 *
 * Note this component styles the sidebar *box*. Where that box sits in the
 * page grid is the page's own business, via the wrapping `<aside>`'s
 * `.events-filter-sidebar` / `.jobs-filter-sidebar` /
 * `.scholarships-filter-sidebar` class (defined in each page's stylesheet).
 * Those are deliberately separate from this widget's `.filter-*` classes.
 *
 * @param {{
 *   searchLabel: string,
 *   searchPlaceholder: string,
 *   searchTerm: string,
 *   onSearchChange: (value: string) => void,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   selectedOptionIds: Record<string, string[]>,
 *   onToggleOption: (fieldId: string, optionId: string) => void,
 *   hasActiveFilters: boolean,
 *   onClearFilters: () => void,
 * }} props
 */
function FilterSidebar({
  searchLabel,
  searchPlaceholder,
  searchTerm,
  onSearchChange,
  fields,
  selectedOptionIds,
  onToggleOption,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="filter-sidebar">
      <label className="filter-search">
        {searchLabel}
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>

      {fields.map((field) => (
        <FilterFieldGroup
          key={field._id}
          field={field}
          selected={selectedOptionIds[field._id] || []}
          onToggleOption={(optionId) => onToggleOption(field._id, optionId)}
        />
      ))}

      {hasActiveFilters && (
        <button type="button" className="btn btn-outline filter-clear" onClick={onClearFilters}>
          נקה סינון
        </button>
      )}
    </div>
  )
}

export default FilterSidebar
