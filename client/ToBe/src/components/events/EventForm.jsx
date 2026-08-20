import { useEffect, useState } from 'react'
import { API_URL } from '../../apiConfig'
import './formFields.css'
import './EventForm.css'

const EMPTY_FORM = { title: '', description: '', date: '', time: '', location: '', price: '' }

function EventForm({ initialValues, existingPhotoUrl, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const selectPhotoFile = (file) => {
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description)
      formData.append('date', values.date)
      formData.append('time', values.time)
      formData.append('location', values.location)
      formData.append('price', values.price)
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת האירוע נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
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
        תמונה (לא חובה)
        <img
          src={photoPreview || (existingPhotoUrl ? `${API_URL}${existingPhotoUrl}` : undefined)}
          alt=""
          className="event-photo-preview"
          hidden={!photoPreview && !existingPhotoUrl}
        />
        <div
          className={`photo-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            selectPhotoFile(e.dataTransfer.files?.[0])
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => selectPhotoFile(e.target.files?.[0])}
          />
          <p className="photo-dropzone-hint">
            {photoFile ? photoFile.name : 'גררו תמונה לכאן או לחצו לבחירה'}
          </p>
        </div>
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
