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
 *   initialValues?: {title: string, description: string, date: string, time: string, location: string, price: string, registrationDeadline: string},
 *   existingPhotoUrl?: string|null,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function EventForm({ formId, initialValues, existingPhotoUrl, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

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
      <label>
        תמונה (לא חובה)
        <PhotoDropzone
          photoFile={photoFile}
          existingPhotoUrl={existingPhotoUrl}
          onSelect={setPhotoFile}
        />
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
