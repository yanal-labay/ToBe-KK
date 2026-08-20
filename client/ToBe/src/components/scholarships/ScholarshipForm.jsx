import { useState } from 'react'
import PhotoDropzone from '../shared/PhotoDropzone'
import './formFields.css'
import './ScholarshipForm.css'

const EMPTY_FORM = { title: '', description: '', deadline: '', url: '', amount: '', volunteerHours: '' }

/**
 * Create/edit form for a scholarship, used both for "new scholarship" (no
 * `initialValues`) and for editing an existing one. Tags are chosen from
 * the existing list only — creating a new tag is a separate admin action
 * (see TagManager), not part of this form.
 *
 * @param {{
 *   initialValues?: {title: string, description: string, deadline: string, url: string, amount: string, volunteerHours: string},
 *   initialTagIds?: string[],
 *   existingPhotoUrl?: string|null,
 *   tags: Array<{_id: string, name: string}>,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function ScholarshipForm({
  initialValues,
  initialTagIds,
  existingPhotoUrl,
  tags,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [selectedTagIds, setSelectedTagIds] = useState(initialTagIds || [])
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const toggleTag = (tagId) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    )
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
      selectedTagIds.forEach((tagId) => formData.append('tags', tagId))
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת המלגה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="scholarship-form" onSubmit={handleSubmit}>
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

      <fieldset className="scholarship-tag-picker">
        <legend>תגיות</legend>
        {tags.length === 0 ? (
          <p className="scholarship-form-hint">
            אין עדיין תגיות — ניתן להוסיף דרך "ניהול תגיות".
          </p>
        ) : (
          <div className="scholarship-tag-checkboxes">
            {tags.map((tag) => (
              <label key={tag._id} className="scholarship-tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag._id)}
                  onChange={() => toggleTag(tag._id)}
                />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

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
