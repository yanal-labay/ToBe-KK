import { useEffect, useMemo, useRef, useState } from 'react'
import { listRegistrants, updateRegistrant, deleteRegistrant } from './RegistryService'
import {
  OTHER_OPTION,
  INTEREST_OPTIONS,
  INTEREST_LABELS,
  MILITARY_STATUS_OPTIONS,
  MILITARY_STATUS_LABELS,
  EDUCATION_OPTIONS,
  EDUCATION_LABELS,
  resolveOptionValue,
} from './constants'
import PieChart from './PieChart'
import RegistrantForm from './RegistrantForm'
import ExportExcelButton from '../../GUIComponents/Widgets/ExportExcelButton'
import { exportRowsToExcel } from '../../utils/exportToExcel'
import './RegistrantsPanel.css'

// The admin table's isStudent cell is a plain select like every other enum
// column, but its stored value is a real boolean — so unlike
// IS_STUDENT_OPTIONS in constants.js (which models the guest form's local
// state as 'yes'/'no' strings), this one's option values are the strings
// "true"/"false" that RegistrantInputSchema's isStudent union accepts
// directly from a native <select>.
const IS_STUDENT_COLUMN_OPTIONS = [
  { value: 'true', label: 'כן' },
  { value: 'false', label: 'לא' },
]

// Categorical fields worth charting — deliberately excludes identity fields
// like name/email/phone/city, which have no meaningful "distribution".
const CHARTABLE_FIELDS = [
  { value: 'education', label: 'השכלה' },
  { value: 'institution', label: 'מוסד לימודים' },
  { value: 'fieldOfStudy', label: 'תחום לימודים' },
  { value: 'yearOfStudy', label: 'שנת לימודים' },
  { value: 'interests', label: 'תחומי עניין' },
  { value: 'militaryStatus', label: 'רקע שירות צבאי/לאומי' },
]

const MAX_PIE_SLICES = 7

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6].map((year) => ({ value: year, label: `שנה ${year}` }))

// Every editable table column: `kind` picks which inline editor
// `renderCell` uses below. `institution`/`fieldOfStudy` are handled
// separately (their editor needs the admin-managed option list).
const EDITABLE_COLUMNS = [
  { field: 'firstName', label: 'שם פרטי', kind: 'text' },
  { field: 'lastName', label: 'שם משפחה', kind: 'text' },
  { field: 'email', label: 'אימייל', kind: 'text', inputType: 'email' },
  { field: 'phone', label: 'טלפון', kind: 'text', inputType: 'tel' },
  { field: 'city', label: 'עיר', kind: 'text' },
  { field: 'education', label: 'השכלה', kind: 'select', options: EDUCATION_OPTIONS },
  { field: 'isStudent', label: 'סטודנט/ית כעת', kind: 'select', options: IS_STUDENT_COLUMN_OPTIONS },
  { field: 'institution', label: 'מוסד לימודים', kind: 'listSelect' },
  { field: 'fieldOfStudy', label: 'תחום לימודים', kind: 'listSelect' },
  { field: 'yearOfStudy', label: 'שנה', kind: 'select', options: YEAR_OPTIONS },
  { field: 'interests', label: 'תחומי עניין', kind: 'multiselect' },
  { field: 'militaryStatus', label: 'רקע צבאי/לאומי', kind: 'select', options: MILITARY_STATUS_OPTIONS },
]

// Registration time is assigned automatically by the server (Registrant.createdAt)
// — never user-entered, so it's display/sort/search-only, never editable.
const REGISTERED_AT_COLUMN = { field: 'createdAt', label: 'תאריך רישום', kind: 'readonly' }

const ALL_COLUMNS = [...EDITABLE_COLUMNS, REGISTERED_AT_COLUMN]

/** Formats `createdAt` (ISO string from the API) for display in Hebrew. */
function formatDateTime(value) {
  return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

/** The plain display text for one column's value — shared by the table, search, and CSV-ish sort. */
function displayValue(registrant, field) {
  switch (field) {
    case 'education':
      return EDUCATION_LABELS[registrant.education] || registrant.education
    case 'isStudent':
      return registrant.isStudent ? 'כן' : 'לא'
    case 'militaryStatus':
      return registrant.militaryStatus ? MILITARY_STATUS_LABELS[registrant.militaryStatus] : '—'
    case 'interests':
      return registrant.interests.map((i) => INTEREST_LABELS[i] || i).join(', ')
    case 'yearOfStudy':
      return registrant.yearOfStudy ? `שנה ${registrant.yearOfStudy}` : '—'
    case 'createdAt':
      return formatDateTime(registrant.createdAt)
    default:
      return registrant[field]
  }
}

/** A single lowercased blob of every column's display text, for the search box. */
function searchableText(registrant) {
  return ALL_COLUMNS.map((col) => displayValue(registrant, col.field))
    .join(' ')
    .toLowerCase()
}

/** A sortable value per column — ranked order for enums, numeric for year/date, text otherwise. */
function sortValue(registrant, field) {
  switch (field) {
    case 'education':
      return EDUCATION_OPTIONS.findIndex((o) => o.value === registrant.education)
    case 'isStudent':
      return registrant.isStudent ? 1 : 0
    case 'militaryStatus':
      return registrant.militaryStatus
        ? MILITARY_STATUS_OPTIONS.findIndex((o) => o.value === registrant.militaryStatus)
        : -1
    case 'yearOfStudy':
      return registrant.yearOfStudy ?? -1
    case 'createdAt':
      return new Date(registrant.createdAt).getTime()
    case 'interests':
      return registrant.interests
        .map((i) => INTEREST_LABELS[i] || i)
        .sort()
        .join(', ')
    default:
      return (registrant[field] || '').toString().toLowerCase()
  }
}

function compareSortValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'he')
}

/** Extracts the display label(s) a single registrant contributes to a chart field. */
function valuesForChartField(registrant, field) {
  switch (field) {
    case 'education':
      return [EDUCATION_LABELS[registrant.education] || registrant.education]
    case 'yearOfStudy':
      return [`שנה ${registrant.yearOfStudy}`]
    case 'militaryStatus':
      return [
        registrant.militaryStatus
          ? MILITARY_STATUS_LABELS[registrant.militaryStatus] || registrant.militaryStatus
          : 'לא צוין',
      ]
    case 'interests':
      return registrant.interests.map((i) => INTEREST_LABELS[i] || i)
    default:
      return [registrant[field]]
  }
}

/** Groups registrants by a chart field into {label, count} rows, capping long tails into "שאר". */
function computeCounts(registrants, field) {
  const counts = new Map()
  for (const registrant of registrants) {
    for (const label of valuesForChartField(registrant, field)) {
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  if (sorted.length <= MAX_PIE_SLICES) return sorted

  const top = sorted.slice(0, MAX_PIE_SLICES - 1)
  const restCount = sorted.slice(MAX_PIE_SLICES - 1).reduce((sum, d) => sum + d.count, 0)
  return [...top, { label: 'שאר', count: restCount }]
}

/** A single-line text input that commits on blur/Enter and discards on Escape. */
function TextCellEditor({ initialValue, inputType = 'text', onCommit, onCancel }) {
  const [value, setValue] = useState(initialValue)
  const cancelledRef = useRef(false)

  return (
    <input
      autoFocus
      type={inputType}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (!cancelledRef.current) onCommit(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelledRef.current = true
          onCancel()
        }
      }}
    />
  )
}

/** A dropdown from an admin-managed list, falling back to a free-text box when "אחר" is chosen. */
function ListSelectCellEditor({ list, initialSelected, initialOther, onCommit, onCancel }) {
  const [selected, setSelected] = useState(initialSelected)
  const [other, setOther] = useState(initialOther)
  const [forceList, setForceList] = useState(false)
  const cancelledRef = useRef(false)

  // If the admin clicks a cell before the institutions/fieldsOfStudy list
  // has finished loading, `initialSelected` starts out as "אחר" (nothing
  // matches an empty list yet). Re-sync once the real list arrives instead
  // of getting stuck showing the free-text box forever.
  useEffect(() => {
    setSelected(initialSelected)
    setOther(initialOther)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelected, initialOther])

  if (selected === OTHER_OPTION && !forceList) {
    return (
      <div className="registrant-cell-other-editor">
        <input
          autoFocus
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onBlur={() => {
            if (!cancelledRef.current) onCommit(other)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              cancelledRef.current = true
              onCancel()
            }
          }}
        />
        {/* The stored value doesn't match any option in the admin-managed
            list (e.g. legacy data, or a genuine "אחר" answer) — this link
            lets the admin switch to the dropdown instead of being stuck
            with only a free-text box. */}
        <button
          type="button"
          className="registrant-cell-switch-to-list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setForceList(true)}
        >
          בחירה מהרשימה
        </button>
      </div>
    )
  }

  return (
    <select
      autoFocus
      value={selected}
      onChange={(e) => {
        const value = e.target.value
        setSelected(value)
        if (value !== OTHER_OPTION) onCommit(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      {list.map((name) => (
        <option value={name} key={name}>
          {name}
        </option>
      ))}
      <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
    </select>
  )
}

/** A checkbox group for `interests`, with explicit save/cancel since a single toggle isn't a complete edit. */
function InterestsCellEditor({ initialValues, onCommit, onCancel }) {
  const [values, setValues] = useState(initialValues)

  const toggle = (value) => {
    setValues((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    )
  }

  return (
    <div className="registrant-cell-interests-editor">
      {INTEREST_OPTIONS.map((opt) => (
        <label key={opt.value}>
          <input
            type="checkbox"
            checked={values.includes(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          {opt.label}
        </label>
      ))}
      <div className="registrant-cell-interests-actions">
        <button type="button" className="btn btn-primary" onClick={() => onCommit(values)}>
          ✓
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Admin-only view of everyone signed up to the student registry: a
 * show/hide pie chart, add/delete controls, a search box that matches
 * against every column, sortable column headers, and a table where
 * clicking any cell turns it into an inline editor that saves in place —
 * the table itself never disappears while editing (unlike Events'/
 * Scholarships' card-swaps-for-a-form pattern). Institution/field-of-study
 * cells show in red when their value isn't in the admin-managed
 * `institutions`/`fieldsOfStudy` list — a nudge that the guest typed a
 * custom "אחר" answer worth adding via "ניהול רשימות".
 *
 * @param {{institutions: string[], fieldsOfStudy: string[]}} props
 */
function RegistrantsPanel({ institutions, fieldsOfStudy }) {
  const [registrants, setRegistrants] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [showChart, setShowChart] = useState(false)
  const [chartField, setChartField] = useState(CHARTABLE_FIELDS[0].value)
  const [editingCell, setEditingCell] = useState(null) // {id, field} | null
  const [cellError, setCellError] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState({ column: null, direction: null }) // direction: 'asc' | 'desc' | null

  const load = () => {
    setLoadState('loading')
    listRegistrants()
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setRegistrants(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  useEffect(() => {
    load()
  }, [])

  // A registrant who isn't currently a student (isStudent === false) is
  // excluded from every chart entirely (never a slice on any of the six
  // fields, education included) rather than just having blank institution/
  // fieldOfStudy/yearOfStudy dilute those distributions. The table below
  // still lists them — only the charts filter them out.
  const chartData = useMemo(
    () => computeCounts(registrants.filter((r) => r.isStudent), chartField),
    [registrants, chartField]
  )

  const visibleRegistrants = useMemo(() => {
    let list = registrants
    const term = searchTerm.trim().toLowerCase()
    if (term) list = list.filter((r) => searchableText(r).includes(term))

    if (sort.column && sort.direction) {
      list = [...list].sort((a, b) => {
        const cmp = compareSortValues(sortValue(a, sort.column), sortValue(b, sort.column))
        return sort.direction === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [registrants, searchTerm, sort])

  const handleHeaderClick = (field) => {
    setSort((current) => {
      if (current.column !== field) return { column: field, direction: 'asc' }
      if (current.direction === 'asc') return { column: field, direction: 'desc' }
      return { column: null, direction: null }
    })
  }

  const startEdit = (cell) => {
    setCellError('')
    setEditingCell(cell)
  }
  const cancelEdit = () => setEditingCell(null)

  /**
   * Merges one field's new value into the registrant's own current record
   * and PATCHes it. Updates local state in place from the PATCH response
   * (which already returns the saved registrant) rather than calling
   * `load()` — refetching the whole list here would flip `loadState` back
   * to "loading" and briefly unmount the entire table on every single cell
   * edit, which is exactly what made saves look like they weren't taking
   * effect.
   */
  const commitCell = async (registrant, field, rawValue) => {
    const { _id, __v, createdAt, ...rest } = registrant
    const payload = { ...rest, [field]: rawValue }
    // yearOfStudy is null for a "לימודים תיכוניים" (non-student) registrant
    // — coercing unconditionally would turn that null into Number(null) = 0,
    // which fails validation (0 is neither null nor >= 1).
    payload.yearOfStudy =
      payload.yearOfStudy === null || payload.yearOfStudy === '' ? null : Number(payload.yearOfStudy)
    if (!payload.militaryStatus) delete payload.militaryStatus

    try {
      const res = await updateRegistrant(_id, payload)
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setRegistrants((current) => current.map((r) => (r._id === _id ? data.registrant : r)))
      setEditingCell(null)
      setCellError('')
    } catch (err) {
      setCellError(err.message || 'העדכון נכשל')
    }
  }

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((current) =>
      current.size === visibleRegistrants.length
        ? new Set()
        : new Set(visibleRegistrants.map((r) => r._id))
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`למחוק ${selectedIds.size} רשומות נבחרות מהמאגר?`)) return
    await Promise.all([...selectedIds].map((id) => deleteRegistrant(id)))
    setSelectedIds(new Set())
    load()
  }

  /** Exports exactly what's currently visible in the table (search-filtered, same column set/labels) to an .xlsx file. */
  const handleExport = () => {
    const headers = ALL_COLUMNS.map((col) => col.label)
    const rows = visibleRegistrants.map((r) => ALL_COLUMNS.map((col) => displayValue(r, col.field)))
    exportRowsToExcel({
      filename: `מאגר-צעירים-${new Date().toISOString().slice(0, 10)}.xlsx`,
      headers,
      rows,
    })
  }

  const chartToggle = (
    <div className="registrants-chart-toggle">
      <button type="button" className="btn btn-outline" onClick={() => setShowChart((v) => !v)}>
        {showChart ? 'הסתרת תרשים' : 'הצגת תרשים'}
      </button>
      {showChart && (
        <label>
          תרשים לפי:{' '}
          <select value={chartField} onChange={(e) => setChartField(e.target.value)}>
            {CHARTABLE_FIELDS.map((f) => (
              <option value={f.value} key={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )

  const headerControls = (
    <div className="registrants-header-controls">
      {!creating && (
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + רישום חדש
        </button>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        disabled={selectedIds.size === 0}
        onClick={handleDeleteSelected}
      >
        מחיקה{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
      </button>
      <ExportExcelButton onClick={handleExport} disabled={registrants.length === 0} />
    </div>
  )

  if (creating) {
    return (
      <div className="registrants-panel">
        {headerControls}
        <RegistrantForm
          onSuccess={() => {
            setCreating(false)
            load()
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="registrants-panel">
        {headerControls}
        <p>טוען נרשמים...</p>
      </div>
    )
  }
  if (loadState === 'error') {
    return (
      <div className="registrants-panel">
        {headerControls}
        <p className="form-error">לא ניתן לטעון את הנרשמים</p>
      </div>
    )
  }
  if (registrants.length === 0) {
    return (
      <div className="registrants-panel">
        {headerControls}
        <p>עדיין אין נרשמים למאגר.</p>
      </div>
    )
  }

  const renderCell = (registrant, col) => {
    const isEditing =
      editingCell && editingCell.id === registrant._id && editingCell.field === col.field

    if (col.kind === 'readonly') {
      return (
        <td key={col.field} className="registrants-readonly-cell">
          {displayValue(registrant, col.field)}
        </td>
      )
    }

    if (!isEditing) {
      let flagged = false
      const display = displayValue(registrant, col.field)
      if (col.field === 'institution' || col.field === 'fieldOfStudy') {
        // A null value here means "not currently a student" (isStudent is
        // false), not a stale/legacy value — only flag an actual value
        // that doesn't match the current admin-managed list.
        const list = col.field === 'institution' ? institutions : fieldsOfStudy
        flagged = Boolean(registrant[col.field]) && !list.includes(registrant[col.field])
      }
      return (
        <td
          key={col.field}
          className={flagged ? 'registrant-flagged-value' : ''}
          onClick={() => startEdit({ id: registrant._id, field: col.field })}
        >
          {display}
        </td>
      )
    }

    if (col.kind === 'text') {
      return (
        <td key={col.field}>
          <TextCellEditor
            initialValue={registrant[col.field]}
            inputType={col.inputType}
            onCommit={(value) => commitCell(registrant, col.field, value)}
            onCancel={cancelEdit}
          />
        </td>
      )
    }

    if (col.kind === 'select') {
      return (
        <td key={col.field}>
          <select
            autoFocus
            // String(...) since isStudent's stored value is a real boolean
            // — a <select>'s defaultValue must match an <option>'s (always
            // string) value attribute, and "true"/"false" strings are what
            // IS_STUDENT_COLUMN_OPTIONS uses.
            defaultValue={registrant[col.field] == null ? '' : String(registrant[col.field])}
            onChange={(e) => commitCell(registrant, col.field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit()
            }}
          >
            {col.options.map((opt) => (
              <option value={opt.value} key={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
      )
    }

    if (col.kind === 'listSelect') {
      const list = col.field === 'institution' ? institutions : fieldsOfStudy
      const resolved = resolveOptionValue(list, registrant[col.field])
      return (
        <td key={col.field}>
          <ListSelectCellEditor
            list={list}
            initialSelected={resolved.selected}
            initialOther={resolved.other}
            onCommit={(value) => commitCell(registrant, col.field, value)}
            onCancel={cancelEdit}
          />
        </td>
      )
    }

    // multiselect (interests)
    return (
      <td key={col.field}>
        <InterestsCellEditor
          initialValues={registrant.interests}
          onCommit={(values) => commitCell(registrant, col.field, values)}
          onCancel={cancelEdit}
        />
      </td>
    )
  }

  return (
    <div className="registrants-panel">
      {chartToggle}

      {showChart && <PieChart data={chartData} />}

      {headerControls}

      <input
        type="search"
        className="registrants-search"
        placeholder="חיפוש בכל העמודות..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {cellError && <p className="form-error">{cellError}</p>}

      <div className="registrants-table-wrap">
        <table className="registrants-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size > 0 && selectedIds.size === visibleRegistrants.length
                  }
                  onChange={toggleSelectAll}
                  aria-label="בחר את כל הנרשמים"
                />
              </th>
              {ALL_COLUMNS.map((col) => (
                <th
                  key={col.field}
                  className="registrants-sortable-th"
                  onClick={() => handleHeaderClick(col.field)}
                >
                  {col.label}
                  <span className="registrants-sort-indicator">
                    {sort.column === col.field
                      ? sort.direction === 'asc'
                        ? ' ▲'
                        : ' ▼'
                      : ' ⇅'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRegistrants.length === 0 ? (
              <tr>
                <td colSpan={ALL_COLUMNS.length + 1}>לא נמצאו נרשמים התואמים את החיפוש.</td>
              </tr>
            ) : (
              visibleRegistrants.map((r) => (
                <tr key={r._id}>
                  <td className="registrants-select-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r._id)}
                      onChange={() => toggleSelected(r._id)}
                      aria-label={`בחר את ${r.firstName} ${r.lastName}`}
                    />
                  </td>
                  {ALL_COLUMNS.map((col) => renderCell(r, col))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RegistrantsPanel
