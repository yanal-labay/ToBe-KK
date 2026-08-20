import { useEffect, useState } from 'react'
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
 * Guest sign-up form for the student registry ("רישום למאגר הצעירים").
 * Unlike Events' RegisterForm, this is always rendered open — signing up
 * *is* the point of this page, not an optional action tucked behind a
 * button. Guests have no accounts, so "already registered" is tracked only
 * in local state once `status` reaches "success" (reloading the page
 * resets it — there's nothing server-side to check against beyond the
 * duplicate-email rejection on a repeat submit).
 */
function RegistrantForm() {
  const [institutions, setInstitutions] = useState([])
  const [fieldsOfStudy, setFieldsOfStudy] = useState([])
  const [values, setValues] = useState(EMPTY_REGISTRANT)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/student-registry-options`)
      .then((res) => (res.ok ? res.json() : { institutions: [], fieldsOfStudy: [] }))
      .then((data) => {
        setInstitutions(data.institutions.map((o) => o.name))
        setFieldsOfStudy(data.fieldsOfStudy.map((o) => o.name))
      })
      .catch(() => {})
  }, [])

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
    setStatus('submitting')
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/student-registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRegistrantPayload(values)),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'ההרשמה נכשלה')
    }
  }

  if (status === 'success') {
    return (
      <div className="registrant-register-success">
        <p>✔ נרשמת בהצלחה למאגר הצעירים!</p>
        <p>ניצור איתך קשר :)</p>
      </div>
    )
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

      {status === 'error' && <p className="registrant-form-error">{error}</p>}
      <div className="registrant-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === 'submitting' || values.interests.length === 0}
        >
          {status === 'submitting' ? 'נרשם...' : 'הרשמה למאגר'}
        </button>
      </div>
    </form>
  )
}

export default RegistrantForm
