/**
 * The sort control shown above each listing page's results (events,
 * scholarships, jobs). Fully controlled by the parent, which owns both the
 * option list and the current selection — this component knows nothing
 * about what any option means.
 *
 * Each page defines its own `SORT_OPTIONS` because the useful orderings
 * differ per model (jobs, for instance, can't sort by salary at all — it's
 * a free-text field). The comparators themselves come from
 * utils/sortComparators.js.
 *
 * @param {{
 *   options: Array<{value: string, label: string}>,
 *   value: string,
 *   onChange: (value: string) => void,
 * }} props
 */
function SortBar({ options, value, onChange }) {
  return (
    <div className="sort-bar">
      <label className="sort-bar-label">
        מיון
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default SortBar
