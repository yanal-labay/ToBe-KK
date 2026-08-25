import { useState } from 'react'
import { registerForEvent } from '../../services/eventsService'
import './formFields.css'
import './RegisterForm.css'

const EMPTY_REGISTER = { name: '', email: '', phone: '' }

/**
 * Guest registration widget for one event. Guests have no accounts, so
 * "already registered" is tracked only in this component's local state —
 * once `status` reaches "success" the form is replaced by a confirmation
 * message and stays that way for the rest of the page session (reloading
 * the page resets it, since there's nothing server-side to check against).
 *
 * @param {{eventId: string}} props
 */
function RegisterForm({ eventId }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY_REGISTER)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await registerForEvent(eventId, values)
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
      <div className="event-register-success">
        <p>✔ נרשמת בהצלחה!</p>
        <p>ניצור איתך קשר :)</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        הרשמה לאירוע
      </button>
    )
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <label>
        שם מלא
        <input value={values.name} onChange={handleChange('name')} required />
      </label>
      <label>
        אימייל
        <input type="email" value={values.email} onChange={handleChange('email')} required />
      </label>
      <label>
        טלפון
        <input type="tel" value={values.phone} onChange={handleChange('phone')} required />
      </label>
      {status === 'error' && <p className="event-form-error">{error}</p>}
      <div className="event-form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'נרשם...' : 'אישור הרשמה'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
          ביטול
        </button>
      </div>
    </form>
  )
}

export default RegisterForm
