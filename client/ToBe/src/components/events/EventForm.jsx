import { useState } from 'react'
import PhotoDropzone from '../shared/PhotoDropzone'
import './formFields.css'
import './EventForm.css'

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  location: '',
  price: '',
  registrationDeadline: '',
  isActive: true,
}

/**
 * Create/edit form for an event, used both for "new event" (no
 * `initialValues`) and for editing an existing one. The photo field is
 * optional and supports both drag-and-drop and click-to-choose; on edit,
 * leaving it untouched keeps the event's existing photo (the server only
 * replaces `photoUrl` when a new file is actually uploaded).
 *
 * Submits via `onSubmit(formData)` with a `FormData` (not JSON) because the
 * optional photo file has to travel as `multipart/form-data`.
 *
 * `formId` becomes the form's DOM id. The Events page uses it to scroll the
 * form into view on open — an edit form replaces its card mid-list, so the
 * card's own id is gone by the time we need something to scroll to.
 *
 * @param {{
 *   formId?: string,
 *   initialValues?: {title: string, description: string, date: string, time: string, location: string, price: string, registrationDeadline: string, isActive: boolean},
 *   initialFieldValues?: Record<string, string[]>,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   existingPhotoUrl?: string|null,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function EventForm({
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

  const toggleFieldOption = (fieldId, optionId) => {
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
    setError('')

    if (values.registrationDeadline && values.date && values.registrationDeadline > values.date) {
      setError('תאריך סגירת ההרשמה לא יכול להיות מאוחר מתאריך האירוע')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description)
      formData.append('date', values.date)
      formData.append('time', values.time)
      formData.append('location', values.location)
      formData.append('price', values.price)
      formData.append('registrationDeadline', values.registrationDeadline)
      formData.append('fieldSelections', JSON.stringify(Object.values(fieldValues).flat()))
      formData.append('isActive', values.isActive ? 'true' : 'false')
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת האירוע נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id={formId} className="event-form form-focus-panel" onSubmit={handleSubmit}>
      <label>
        כותרת
        <input value={values.title} onChange={handleChange('title')} required />
      </label>
      <label>
        תיאור
        <textarea value={values.description} onChange={handleChange('description')} required />
      </label>
      <div className="event-form-row">
        <label>
          תאריך
          <input type="date" value={values.date} onChange={handleChange('date')} required />
        </label>
        <label>
          שעה
          <input type="time" value={values.time} onChange={handleChange('time')} required />
        </label>
      </div>
      <label>
        מיקום
        <input value={values.location} onChange={handleChange('location')} required />
      </label>
      <label>
        מחיר בש״ח (לא חובה)
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="ללא עלות"
          value={values.price}
          onChange={handleChange('price')}
        />
      </label>
      <label>
        תאריך אחרון להרשמה
        <input
          type="date"
          value={values.registrationDeadline}
          onChange={handleChange('registrationDeadline')}
          max={values.date || undefined}
          required
        />
      </label>
      {fields.map((field) => (
        <fieldset className="event-field-picker" key={field._id}>
          <legend>{field.name}</legend>
          {field.options.length === 0 ? (
            <p className="event-form-hint">אין עדיין אפשרויות בשדה זה.</p>
          ) : (
            <div className="event-field-checkboxes">
              {field.options.map((option) => (
                <label key={option._id} className="event-field-checkbox">
                  <input
                    type="checkbox"
                    checked={(fieldValues[field._id] || []).includes(option._id)}
                    onChange={() => toggleFieldOption(field._id, option._id)}
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
      <label className="event-form-active">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        האירוע פעיל (מוצג לציבור)
      </label>

      {error && <p className="event-form-error">{error}</p>}
      <div className="event-form-actions">
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

export default EventForm
