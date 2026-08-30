import { useState } from 'react'
import {
  createScholarshipField,
  renameScholarshipField,
  deleteScholarshipField,
  addScholarshipFieldOption,
  deleteScholarshipFieldOption,
} from '../../services/scholarshipFieldsService'
import OptionChipManager from '../shared/OptionChipManager'
import './ScholarshipFieldsManager.css'

/**
 * Admin-only management of scholarship fields — e.g. "תגיות", or any new
 * field the admin creates. Each field's checkbox values are managed via the
 * shared `OptionChipManager` (same as the student registry's institution/
 * field-of-study lists and Job's fields), but a field's own NAME can also be
 * renamed here — mirrors `components/jobs/JobFieldsManager.jsx` exactly.
 *
 * @param {{
 *   panelId?: string,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   onFieldsChanged: () => void,
 *   onClose: () => void,
 * }} props
 */
function ScholarshipFieldsManager({ panelId, fields, onFieldsChanged, onClose }) {
  const [newFieldName, setNewFieldName] = useState('')
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const handleAddField = async (e) => {
    e.preventDefault()
    setAddSaving(true)
    setAddError('')
    try {
      const res = await createScholarshipField({ name: newFieldName })
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
    const res = await renameScholarshipField(fieldId, { name })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onFieldsChanged()
  }

  const handleDeleteField = async (field) => {
    if (!window.confirm(`למחוק את השדה "${field.name}" ואת כל האפשרויות שבו?`)) return
    const res = await deleteScholarshipField(field._id)
    const data = await res.json()
    if (!data.success) return
    onFieldsChanged()
  }

  const handleAddOption = async (fieldId, name) => {
    const res = await addScholarshipFieldOption(fieldId, { name })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onFieldsChanged()
  }

  const handleDeleteOption = async (fieldId, option) => {
    const res = await deleteScholarshipFieldOption(fieldId, option._id)
    const data = await res.json()
    if (!data.success) return
    onFieldsChanged()
  }

  return (
    <div id={panelId} className="scholarship-fields-manager form-focus-panel">
      <form className="scholarship-fields-add-form" onSubmit={handleAddField}>
        <label>
          שדה חדש
          <input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={addSaving}>
          {addSaving ? 'מוסיף...' : 'הוספת שדה'}
        </button>
      </form>
      {addError && <p className="scholarship-fields-error">{addError}</p>}

      {fields.map((field) => (
        <ScholarshipFieldSection
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
      <div className="scholarship-fields-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          סגירה
        </button>
      </div>
    </div>
  )
}

function ScholarshipFieldSection({ field, onRename, onDeleteField, onAddOption, onDeleteOption }) {
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
    <div className="scholarship-field-section">
      <div className="scholarship-field-section-header">
        {renaming ? (
          <form className="scholarship-field-rename-form" onSubmit={handleRenameSubmit}>
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
            <div className="scholarship-field-section-actions">
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
      {renameError && <p className="scholarship-fields-error">{renameError}</p>}

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

export default ScholarshipFieldsManager
