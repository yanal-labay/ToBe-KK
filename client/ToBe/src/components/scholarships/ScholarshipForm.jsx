import { useState } from 'react'
import PhotoDropzone from '../shared/PhotoDropzone'
import './formFields.css'
import './ScholarshipForm.css'

const EMPTY_FORM = { title: '', description: '', deadline: '', url: '', amount: '', volunteerHours: '' }

/**
 * Create/edit form for a scholarship, used both for "new scholarship" (no
 * `initialValues`) and for editing an existing one. Options are chosen from
 * the existing admin-defined fields only — creating a new field/option is a
 * separate admin action (see ScholarshipFieldsManager), not part of this
 * form.
 *
 * One `<fieldset>` of checkboxes is rendered per entry in `fields` (see
 * ScholarshipFieldsManager.jsx for how those fields/options are managed) —
 * unlike Job's one-`<select>`-per-field (single choice), a scholarship can
 * pick several options within the same field at once, so each field stays
 * checkboxes. Selections are tracked separately from `values` as
 * `fieldValues` (`{ [fieldId]: optionId[] }`) since the set of fields is
 * dynamic, not a fixed shape.
 *
 * @param {{
 *   formId?: string,
 *   initialValues?: {title: string, description: string, deadline: string, url: string, amount: string, volunteerHours: string},
 *   initialFieldValues?: Record<string, string[]>,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   existingPhotoUrl?: string|null,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function ScholarshipForm({
  formId,
  initialValues,
  initialFieldValues,
  fields,
  existingPhotoUrl,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [fieldValues, setFieldValues] = useState(initialFieldValues || {})
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const toggleOption = (fieldId, optionId) => {
    setFieldValues((current) => {
      const currentForField = current[fieldId] || []
      const nextForField = currentForField.includes(optionId)
        ? currentForField.filter((id) => id !== optionId)
        : [...currentForField, optionId]
      return { ...current, [fieldId]: nextForField }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description)
      formData.append('deadline', values.deadline)
      formData.append('url', values.url)
      formData.append('amount', values.amount)
      formData.append('volunteerHours', values.volunteerHours)
      formData.append('fieldSelections', JSON.stringify(Object.values(fieldValues).flat()))
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת המלגה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id={formId} className="scholarship-form form-focus-panel" onSubmit={handleSubmit}>
      <label>
        שם המלגה
        <input value={values.title} onChange={handleChange('title')} required />
      </label>
      <label>
        תיאור
        <textarea value={values.description} onChange={handleChange('description')} required />
      </label>
      <label>
        תאריך אחרון להגשה
        <input
          type="date"
          value={values.deadline}
          onChange={handleChange('deadline')}
          required
        />
      </label>
      <label>
        קישור לאתר המלגה
        <input
          type="url"
          placeholder="https://"
          value={values.url}
          onChange={handleChange('url')}
          required
        />
      </label>
      <div className="scholarship-form-row">
        <label>
          סכום המלגה בש״ח (לא חובה)
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="לא צוין"
            value={values.amount}
            onChange={handleChange('amount')}
          />
        </label>
        <label>
          שעות התנדבות נדרשות (לא חובה)
          <input
            type="number"
            min="0"
            step="1"
            placeholder="ללא התנדבות"
            value={values.volunteerHours}
            onChange={handleChange('volunteerHours')}
          />
        </label>
      </div>

      {fields.map((field) => (
        <fieldset className="scholarship-tag-picker" key={field._id}>
          <legend>{field.name}</legend>
          {field.options.length === 0 ? (
            <p className="scholarship-form-hint">אין עדיין אפשרויות בשדה זה.</p>
          ) : (
            <div className="scholarship-tag-checkboxes">
              {field.options.map((option) => (
                <label key={option._id} className="scholarship-tag-checkbox">
                  <input
                    type="checkbox"
                    checked={(fieldValues[field._id] || []).includes(option._id)}
                    onChange={() => toggleOption(field._id, option._id)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      <label>
        תמונה (לא חובה)
        <PhotoDropzone
          photoFile={photoFile}
          existingPhotoUrl={existingPhotoUrl}
          onSelect={setPhotoFile}
        />
      </label>

      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר...' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  )
}

export default ScholarshipForm
