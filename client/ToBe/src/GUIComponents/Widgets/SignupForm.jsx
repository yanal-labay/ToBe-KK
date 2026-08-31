import { useState } from 'react'
import './SignupForm.css'

const EMPTY_VALUES = { name: '', email: '', phone: '' }

/**
 * Collapsed-by-default widget that expands into a name/email/phone form and
 * submits it — used for event registration and for job "leave your details"
 * applications. Visitors have no accounts, so "already submitted" is tracked
 * only in this component's local state: once `status` reaches "success" the
 * form is replaced by a confirmation and stays that way for the rest of the
 * page session (reloading resets it, since there's nothing server-side to
 * check against).
 *
 * The caller supplies `onSubmit` already bound to whichever parent record
 * this is for, plus every visible string — this component knows nothing
 * about events or jobs.
 *
 * @param {{
 *   onSubmit: (values: {name: string, email: string, phone: string}) => Promise<Response>,
 *   openLabel: string,
 *   submitLabel: string,
 *   submittingLabel: string,
 *   errorFallback: string,
 *   successLines: string[],
 * }} props
 */
function SignupForm({
  onSubmit,
  openLabel,
  submitLabel,
  submittingLabel,
  errorFallback,
  successLines,
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY_VALUES)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await onSubmit(values)
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err.message || errorFallback)
    }
  }

  if (status === 'success') {
    return (
      <div className="signup-form-success">
        {successLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        {openLabel}
      </button>
    )
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit}>
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
      {status === 'error' && <p className="signup-form-error">{error}</p>}
      <div className="signup-form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? submittingLabel : submitLabel}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
          ביטול
        </button>
      </div>
    </form>
  )
}

export default SignupForm
