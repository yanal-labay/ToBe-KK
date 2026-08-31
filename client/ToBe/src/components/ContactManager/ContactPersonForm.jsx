import { useState } from 'react'
import './ContactPersonForm.css'

const EMPTY_FORM = { name: '', role: '', mobile: '', phone: '', email: '', location: '' }

/**
 * Create/edit form for one contact person within a group. Only
 * name/role are required — mobile/phone/email/location are all optional.
 * Same dual-mode convention as every other form in this app: no
 * `initialValues` means "create". Submits via `onSubmit(payload)` with a
 * plain object (JSON, no photo).
 *
 * @param {{
 *   initialValues?: {name: string, role: string, mobile: string, phone: string, email: string, location: string},
 *   submitLabel: string,
 *   onSubmit: (payload: object) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function ContactPersonForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues || EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err.message || 'שמירת איש הקשר נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="contact-person-form form-fields" onSubmit={handleSubmit}>
      <div className="contact-person-form-row">
        <label>
          שם
          <input value={values.name} onChange={handleChange('name')} required />
        </label>
        <label>
          תפקיד
          <input value={values.role} onChange={handleChange('role')} required />
        </label>
      </div>
      <div className="contact-person-form-row">
        <label>
          נייד (לא חובה)
          <input value={values.mobile} onChange={handleChange('mobile')} />
        </label>
        <label>
          טלפון (לא חובה)
          <input value={values.phone} onChange={handleChange('phone')} />
        </label>
      </div>
      <div className="contact-person-form-row">
        <label>
          אימייל (לא חובה)
          <input type="email" value={values.email} onChange={handleChange('email')} />
        </label>
        <label>
          כתובת (לא חובה)
          <input value={values.location} onChange={handleChange('location')} />
        </label>
      </div>
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

export default ContactPersonForm
