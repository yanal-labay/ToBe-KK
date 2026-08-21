import { useState } from 'react'
import PhotoDropzone from '../shared/PhotoDropzone'
import './formFields.css'
import './JobForm.css'

const EMPTY_FORM = {
  title: '',
  company: '',
  location: '',
  jobType: '',
  description: '',
  salary: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  isActive: true,
}

/**
 * Create/edit form for a job posting, used both for "new posting" (no
 * `initialValues`) and for editing an existing one. Only title/company/
 * location are required — job type, description, salary, and the whole
 * contact block are optional, matching `Job`'s nullable-field convention.
 *
 * @param {{
 *   initialValues?: {title: string, company: string, location: string, jobType: string, description: string, salary: string, contactName: string, contactEmail: string, contactPhone: string, isActive: boolean},
 *   existingPhotoUrl?: string|null,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function JobForm({ initialValues, existingPhotoUrl, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('company', values.company)
      formData.append('location', values.location)
      formData.append('jobType', values.jobType)
      formData.append('description', values.description)
      formData.append('salary', values.salary)
      formData.append('contactName', values.contactName)
      formData.append('contactEmail', values.contactEmail)
      formData.append('contactPhone', values.contactPhone)
      formData.append('isActive', values.isActive ? 'true' : 'false')
      if (photoFile) formData.append('photo', photoFile)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'שמירת המשרה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <label>
        תפקיד
        <input value={values.title} onChange={handleChange('title')} required />
      </label>
      <div className="job-form-row">
        <label>
          חברה
          <input value={values.company} onChange={handleChange('company')} required />
        </label>
        <label>
          מיקום
          <input value={values.location} onChange={handleChange('location')} required />
        </label>
      </div>
      <div className="job-form-row">
        <label>
          היקף משרה (לא חובה)
          <select value={values.jobType} onChange={handleChange('jobType')}>
            <option value="">לא צוין</option>
            <option value="fulltime">משרה מלאה</option>
            <option value="parttime">משרה חלקית</option>
          </select>
        </label>
        <label>
          שכר (לא חובה)
          <input
            placeholder="למשל: 12,000-15,000 ש״ח, לפי ניסיון"
            value={values.salary}
            onChange={handleChange('salary')}
          />
        </label>
      </div>
      <label>
        תיאור (לא חובה)
        <textarea value={values.description} onChange={handleChange('description')} />
      </label>

      <fieldset className="job-form-contact">
        <legend>פרטי יצירת קשר (לא חובה)</legend>
        <label>
          שם איש/אשת קשר
          <input value={values.contactName} onChange={handleChange('contactName')} />
        </label>
        <div className="job-form-row">
          <label>
            אימייל
            <input
              type="email"
              value={values.contactEmail}
              onChange={handleChange('contactEmail')}
            />
          </label>
          <label>
            טלפון
            <input type="tel" value={values.contactPhone} onChange={handleChange('contactPhone')} />
          </label>
        </div>
      </fieldset>

      <label>
        תמונה (לא חובה)
        <PhotoDropzone
          photoFile={photoFile}
          existingPhotoUrl={existingPhotoUrl}
          onSelect={setPhotoFile}
        />
      </label>

      <label className="job-form-active">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        המשרה פעילה (מוצגת לציבור)
      </label>

      {error && <p className="job-form-error">{error}</p>}
      <div className="job-form-actions">
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

export default JobForm
