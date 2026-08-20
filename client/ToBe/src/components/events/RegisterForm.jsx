import { useState } from 'react'
import { API_URL } from '../../apiConfig'
import './formFields.css'
import './RegisterForm.css'

const EMPTY_REGISTER = { name: '', email: '', phone: '' }

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
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
