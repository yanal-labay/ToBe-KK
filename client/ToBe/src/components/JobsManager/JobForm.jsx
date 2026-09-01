import { useState } from 'react'
import PhotoDropzone from '../../GUIComponents/Widgets/PhotoDropzone'
import './JobForm.css'

const EMPTY_FORM = {
  title: '',
  company: '',
  location: '',
  description: '',
  salary: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  applicationMethod: 'contact',
  applicationUrl: '',
  isActive: true,
}

// The three ways a visitor can apply. Each reveals different fields below,
// which is why this is a radio group rather than a <select>.
const APPLICATION_METHODS = [
  { value: 'contact', label: 'פרטי קשר' },
  { value: 'link', label: 'קישור חיצוני' },
  { value: 'form', label: 'השארת פרטים באתר' },
]

/**
 * Create/edit form for a job posting, used both for "new posting" (no
 * `initialValues`) and for editing an existing one. Only title/company/
 * location are required — every admin-defined field, description, salary,
 * and the whole contact block are optional, matching `Job`'s
 * nullable-field convention.
 *
 * One `<fieldset>` of checkboxes is rendered per entry in `fields` (see
 * JobFieldsManager.jsx for how those fields/options are managed) — this
 * form only ever *picks* existing options per field, it never creates one
 * inline. A job can hold multiple selections within the same field at once
 * (same convention as ScholarshipForm), so selections are tracked
 * separately from `values` as `fieldValues` (`{ [fieldId]: optionId[] }`)
 * since the set of fields is dynamic, not a fixed shape.
 *
 * @param {{
 *   formId?: string,
 *   initialValues?: {title: string, company: string, location: string, description: string, salary: string, contactName: string, contactEmail: string, contactPhone: string, isActive: boolean},
 *   initialFieldValues?: Record<string, string[]>,
 *   fields: Array<{_id: string, name: string, options: Array<{_id: string, name: string}>}>,
 *   existingPhotoUrl?: string|null,
 *   submitLabel: string,
 *   onSubmit: (formData: FormData) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function JobForm({
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
    // Mirrors the server's superRefine so the admin sees the problem without
    // a round trip; job.controller.js stays the real guard.
    if (
      values.applicationMethod === 'contact' &&
      !values.contactName.trim() &&
      !values.contactEmail.trim() &&
      !values.contactPhone.trim()
    ) {
      setError('יש למלא לפחות דרך התקשרות אחת')
      return
    }
    if (values.applicationMethod === 'link' && !values.applicationUrl.trim()) {
      setError('יש להזין קישור חיצוני')
      return
    }

    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('company', values.company)
      formData.append('location', values.location)
      formData.append('fieldSelections', JSON.stringify(Object.values(fieldValues).flat()))
      formData.append('description', values.description)
      formData.append('salary', values.salary)
      formData.append('contactName', values.contactName)
      formData.append('contactEmail', values.contactEmail)
      formData.append('contactPhone', values.contactPhone)
      formData.append('applicationMethod', values.applicationMethod)
      formData.append('applicationUrl', values.applicationUrl)
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
    <form id={formId} className="job-form form-focus-panel form-fields" onSubmit={handleSubmit}>
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
      {fields.map((field) => (
        <fieldset className="job-field-picker" key={field._id}>
          <legend>{field.name}</legend>
          {field.options.length === 0 ? (
            <p className="job-form-hint">אין עדיין אפשרויות בשדה זה.</p>
          ) : (
            <div className="job-field-checkboxes">
              {field.options.map((option) => (
                <label key={option._id} className="job-field-checkbox">
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
        שכר (לא חובה)
        <input
          placeholder="למשל: 12,000-15,000 ש״ח, לפי ניסיון"
          value={values.salary}
          onChange={handleChange('salary')}
        />
      </label>
      <label>
        תיאור (לא חובה)
        <textarea value={values.description} onChange={handleChange('description')} />
      </label>

      <fieldset className="job-form-contact">
        <legend>שיטת הגשה</legend>
        <div className="job-form-method-options">
          {APPLICATION_METHODS.map((method) => (
            <label key={method.value} className="job-form-method-option">
              <input
                type="radio"
                name="applicationMethod"
                value={method.value}
                checked={values.applicationMethod === method.value}
                onChange={handleChange('applicationMethod')}
              />
              {method.label}
            </label>
          ))}
        </div>

        {values.applicationMethod === 'contact' && (
          <>
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
                <input
                  type="tel"
                  value={values.contactPhone}
                  onChange={handleChange('contactPhone')}
                />
              </label>
            </div>
            <p className="job-form-hint">יש למלא לפחות אחד מהשדות.</p>
          </>
        )}

        {values.applicationMethod === 'link' && (
          <label>
            קישור להגשה
            <input
              type="url"
              placeholder="https://..."
              value={values.applicationUrl}
              onChange={handleChange('applicationUrl')}
            />
          </label>
        )}

        {values.applicationMethod === 'form' && (
          <p className="job-form-hint">
            מבקרים יראו כפתור להשארת פרטים. ההגשות יופיעו בכפתור &quot;מועמדים&quot; בכרטיס.
          </p>
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

      <label className="job-form-active">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        המשרה פעילה (מוצגת לציבור)
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

export default JobForm
