import { useState } from 'react'
import OptionChipManager from './OptionChipManager'
import './FieldsManager.css'

/**
 * Admin-only management of one feature's fields — "סוג אירוע" and "קהל יעד"
 * on Events, "מתאים ל" on Jobs, "זכאות" on Scholarships, plus whatever else
 * an admin creates. Shared by all three: the panel was written once and
 * copied twice, and the copies only ever differed in their endpoint.
 *
 * Each field's checkbox values are managed via the sibling
 * `OptionChipManager` (same as the student registry's institution and
 * field-of-study lists), but a field's own NAME can also be renamed here,
 * unlike those other admin-managed lists — mirrors
 * `LinksManager/LinkGroupCard.jsx`'s inline card-title rename pattern.
 *
 * `api` is what makes this feature-agnostic: each page passes its own
 * `*FieldsService` functions, so the component never knows whether it is
 * editing event, job or scholarship fields. Build it at module scope in the
 * page rather than inline in JSX — it has no reason to be rebuilt per render.
 * `list` is deliberately not part of it: the *page* loads the fields and
 * passes them in, and re-loads them through `onFieldsChanged` after a write.
 *
 * Every action here saves immediately; there is no draft state to cancel.
 * `onFieldsChanged` is what refreshes the list afterwards.
 *
 * Deleting a field cascades server-side into every document's
 * `fieldSelections`, which is why `handleDeleteField` confirms first.
 *
 * @param {{
 *   panelId?: string,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   onFieldsChanged: () => void,
 *   onClose: () => void,
 *   api: {
 *     create: ({name: string}) => Promise<Response>,
 *     rename: (id: string, body: {name: string}) => Promise<Response>,
 *     remove: (id: string) => Promise<Response>,
 *     addOption: (fieldId: string, body: {name: string}) => Promise<Response>,
 *     removeOption: (fieldId: string, optionId: string) => Promise<Response>,
 *   },
 * }} props
 */
function FieldsManager({ panelId, fields, onFieldsChanged, onClose, api }) {
  const [newFieldName, setNewFieldName] = useState('')
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const handleAddField = async (e) => {
    e.preventDefault()
    setAddSaving(true)
    setAddError('')
    try {
      const res = await api.create({ name: newFieldName })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setNewFieldName('')
      onFieldsChanged()
    } catch (err) {
      setAddError(err.message || 'הוספת השדה נכשלה')
    } finally {
      setAddSaving(false)
    }
  }

  const handleRenameField = async (fieldId, name) => {
    const res = await api.rename(fieldId, { name })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onFieldsChanged()
  }

  const handleDeleteField = async (field) => {
    if (!window.confirm(`למחוק את השדה "${field.name}" ואת כל האפשרויות שבו?`)) return
    const res = await api.remove(field._id)
    const data = await res.json()
    if (!data.success) return
    onFieldsChanged()
  }

  const handleAddOption = async (fieldId, name) => {
    const res = await api.addOption(fieldId, { name })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onFieldsChanged()
  }

  const handleDeleteOption = async (fieldId, option) => {
    const res = await api.removeOption(fieldId, option._id)
    const data = await res.json()
    if (!data.success) return
    onFieldsChanged()
  }

  return (
    <div id={panelId} className="fields-manager form-focus-panel">
      <form className="fields-add-form" onSubmit={handleAddField}>
        <label>
          שדה חדש
          <input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={addSaving}>
          {addSaving ? 'מוסיף...' : 'הוספת שדה'}
        </button>
      </form>
      {addError && <p className="fields-error">{addError}</p>}

      {fields.map((field) => (
        <FieldSection
          key={field._id}
          field={field}
          onRename={(name) => handleRenameField(field._id, name)}
          onDeleteField={() => handleDeleteField(field)}
          onAddOption={(name) => handleAddOption(field._id, name)}
          onDeleteOption={(option) => handleDeleteOption(field._id, option)}
        />
      ))}

      {/* The header's "סגירת ניהול שדות" toggle sits behind the focus overlay
          while this panel is open, so the way out has to live in here. Labelled
          "סגירה", not "ביטול": every action above saves immediately, so there
          is nothing to undo — this only closes the panel. */}
      <div className="fields-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          סגירה
        </button>
      </div>
    </div>
  )
}

function FieldSection({ field, onRename, onDeleteField, onAddOption, onDeleteOption }) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(field.name)
  const [renameError, setRenameError] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    setRenameSaving(true)
    setRenameError('')
    try {
      await onRename(nameDraft)
      setRenaming(false)
    } catch (err) {
      setRenameError(err.message || 'שינוי השם נכשל')
    } finally {
      setRenameSaving(false)
    }
  }

  return (
    <div className="field-section">
      <div className="field-section-header">
        {renaming ? (
          <form className="field-rename-form" onSubmit={handleRenameSubmit}>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} required />
            <button type="submit" className="btn btn-primary" disabled={renameSaving}>
              {renameSaving ? 'שומר...' : 'שמירה'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setNameDraft(field.name)
                setRenaming(false)
              }}
            >
              ביטול
            </button>
          </form>
        ) : (
          <>
            <h3>{field.name}</h3>
            <div className="field-section-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setNameDraft(field.name)
                  setRenaming(true)
                }}
              >
                שינוי שם
              </button>
              <button type="button" className="btn btn-secondary" onClick={onDeleteField}>
                מחיקת שדה
              </button>
            </div>
          </>
        )}
      </div>
      {renameError && <p className="fields-error">{renameError}</p>}

      <OptionChipManager
        inputLabel="הוספת אפשרות חדשה"
        items={field.options}
        emptyMessage="אין עדיין אפשרויות בשדה זה."
        onAdd={onAddOption}
        onDelete={onDeleteOption}
        getDeleteConfirmMessage={(option) => `למחוק את "${option.name}" מהרשימה?`}
        getDeleteAriaLabel={(option) => `מחק את ${option.name}`}
      />
    </div>
  )
}

export default FieldsManager
