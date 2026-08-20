import { useState } from 'react'
import { API_URL } from '../../apiConfig'
import { buildRegistrantPayload } from './constants'
import RegistrantFormFields from './RegistrantFormFields'
import './formFields.css'
import './RegistrantForm.css'

const EMPTY_REGISTRANT = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  city: '',
  institution: '',
  institutionOther: '',
  fieldOfStudy: '',
  fieldOfStudyOther: '',
  academicStatus: '',
  yearOfStudy: '',
  interests: [],
  militaryStatus: '',
}

/**
 * Admin-only "add a registrant" form, opened from RegistrantsPanel's
 * header. Shares `RegistrantFormFields` with the guest-facing
 * `RegistrantForm`, but — unlike that one — there's no self-managed
 * success screen: submitting POSTs the same way a guest sign-up would,
 * then hands control back to the parent (which closes the form and
 * reloads the table), and a cancel button is available throughout.
 *
 * @param {{
 *   institutions: string[],
 *   fieldsOfStudy: string[],
 *   onCreated: () => void,
 *   onCancel: () => void,
 * }} props
 */
function AdminRegistrantForm({ institutions, fieldsOfStudy, onCreated, onCancel }) {
  const [values, setValues] = useState(EMPTY_REGISTRANT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const toggleInterest = (value) => {
    setValues((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((v) => v !== value)
        : [...current.interests, value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/student-registry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRegistrantPayload(values)),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      onCreated()
    } catch (err) {
      setError(err.message || 'ההוספה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="registrant-form" onSubmit={handleSubmit}>
      <RegistrantFormFields
        values={values}
        onChange={handleChange}
        onToggleInterest={toggleInterest}
        institutions={institutions}
        fieldsOfStudy={fieldsOfStudy}
      />

      {error && <p className="registrant-form-error">{error}</p>}
      <div className="registrant-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || values.interests.length === 0}
        >
          {saving ? 'שומר...' : 'הוספה'}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  )
}

export default AdminRegistrantForm
