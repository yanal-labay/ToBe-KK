import { useState } from 'react'
import './OptionChipManager.css'

/**
 * Generic admin-managed named list: an add-form (single text input) plus a
 * removable-chip list below it. Every "admin adds/removes named values
 * independently of any post" list in this app shares this exact UI —
 * student registry's institutions/fields of study, and each admin-defined
 * field's options for both Jobs and Scholarships — so this replaces several
 * near-identical hand-rolled copies with one. Copy (labels, confirm/
 * aria-label wording, empty-state
 * message) stays fully parameterized so each caller's existing wording is
 * unchanged.
 *
 * Owns no fetch logic itself — `onAdd`/`onDelete` are async callbacks
 * supplied by the parent, which owns the actual data/API calls (same
 * "dumb component, parent supplies handlers" convention as
 * `ExportExcelButton`).
 *
 * @param {{
 *   title?: string,
 *   inputLabel: string,
 *   items: Array<{_id: string, name: string}>,
 *   emptyMessage: string,
 *   onAdd: (name: string) => Promise<void>,
 *   onDelete: (item: {_id: string, name: string}) => Promise<void>,
 *   getDeleteConfirmMessage: (item: {_id: string, name: string}) => string,
 *   getDeleteAriaLabel: (item: {_id: string, name: string}) => string,
 * }} props
 */
function OptionChipManager({
  title,
  inputLabel,
  items,
  emptyMessage,
  onAdd,
  onDelete,
  getDeleteConfirmMessage,
  getDeleteAriaLabel,
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onAdd(name)
      setName('')
    } catch (err) {
      setError(err.message || 'ההוספה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(getDeleteConfirmMessage(item))) return
    await onDelete(item)
  }

  return (
    <div className="option-chip-section">
      {title && <h3>{title}</h3>}
      <form className="option-chip-form" onSubmit={handleAdd}>
        <label>
          {inputLabel}
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'מוסיף...' : 'הוספה'}
        </button>
      </form>
      {error && <p className="option-chip-error">{error}</p>}

      <div className="option-chip-list">
        {items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <span className="option-chip" key={item._id}>
              {item.name}
              <button
                type="button"
                className="option-chip-remove"
                onClick={() => handleDelete(item)}
                aria-label={getDeleteAriaLabel(item)}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default OptionChipManager
