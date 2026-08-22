import { useEffect, useState } from 'react'
import { API_URL } from '../../apiConfig'
import { buildRegistrantPayload, validateRegistrant } from './constants'
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
  education: '',
  isStudent: '',
  yearOfStudy: '',
  interests: [],
  militaryStatus: '',
}

/**
 * Sign-up form for the student registry ("רישום למאגר הצעירים"), shared by
 * both the guest-facing page (rendered as `<RegistrantForm />`, no props)
 * and the admin's "add a registrant" flow in `RegistrantsPanel`. Which of
 * those two contexts this is running in is expressed entirely by whether
 * the parent passes `onSuccess`/`onCancel` — not a separate mode flag, and
 * not a second copy of this component. (It used to be two near-identical
 * components; that split let a validation fix land in one and not the
 * other, so they were merged back into this one.)
 *
 * - No `onSuccess` (guest): shows its own inline "thank you" screen after a
 *   successful submit and stays mounted — guests have no account/page to
 *   navigate back to.
 * - `onSuccess` provided (admin): calls it instead of showing that screen,
 *   letting the parent close the form and reload its table.
 * - `onCancel` provided (admin only): renders a "ביטול" button next to
 *   submit, and doubles as the signal for which submit-button label/loading
 *   text to use ("הוספה"/"שומר..." vs "הרשמה למאגר"/"נרשם...").
 *
 * @param {{ onSuccess?: () => void, onCancel?: () => void }} props
 */
function RegistrantForm({ onSuccess, onCancel }) {
  const [institutions, setInstitutions] = useState([])
  const [fieldsOfStudy, setFieldsOfStudy] = useState([])
  const [values, setValues] = useState(EMPTY_REGISTRANT)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    fetch(`${API_URL}/api/student-registry-options`)
      .then((res) => (res.ok ? res.json() : { institutions: [], fieldsOfStudy: [] }))
      .then((data) => {
        setInstitutions(data.institutions.map((o) => o.name))
        setFieldsOfStudy(data.fieldsOfStudy.map((o) => o.name))
      })
      .catch(() => {})
  }, [])

  const handleChange = (field) => (e) => {
    setValues({ ...values, [field]: e.target.value })
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

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
    setError('')

    const errors = validateRegistrant(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setStatus('error')
      setError('יש לתקן את השדות המסומנים באדום')
      return
    }
    setFieldErrors({})
    setStatus('submitting')

    try {
      const res = await fetch(`${API_URL}/api/student-registry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRegistrantPayload(values)),
      })
      const data = await res.json()
      if (!data.success) {
        // The one server-side check the client can't replicate is email
        // uniqueness — highlight the email box specifically for that case.
        if (data.message?.includes('מייל')) setFieldErrors({ email: data.message })
        throw new Error(data.message)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        setStatus('success')
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'ההרשמה נכשלה')
    }
  }

  if (status === 'success') {
    return (
      <div className="registrant-register-success">
        <p>✔ נרשמת בהצלחה למאגר הצעירים!</p>
      </div>
    )
  }

  const isSubmitting = status === 'submitting'

  return (
    // noValidate: without it, the browser's own HTML5 constraint validation
    // (from the fields' `required` attributes) can silently block the
    // submit event entirely whenever *any* required field is empty — before
    // our onSubmit handler ever runs. `validateRegistrant` owns all of this
    // instead, so it always runs and always shows a red highlight.
    <form className="registrant-form" onSubmit={handleSubmit} noValidate>
      <RegistrantFormFields
        values={values}
        onChange={handleChange}
        onToggleInterest={toggleInterest}
        institutions={institutions}
        fieldsOfStudy={fieldsOfStudy}
        fieldErrors={fieldErrors}
      />

      {status === 'error' && <p className="registrant-form-error">{error}</p>}
      <div className="registrant-form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (onCancel ? 'שומר...' : 'נרשם...') : onCancel ? 'הוספה' : 'הרשמה למאגר'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            ביטול
          </button>
        )}
      </div>
    </form>
  )
}

export default RegistrantForm
