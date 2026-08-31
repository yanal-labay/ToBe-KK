import { useState } from 'react'
import './LinkItemForm.css'

const EMPTY_FORM = { headline: '', description: '', url: '' }

/**
 * Create/edit form for one link item within a card: headline, description,
 * and the target url — all required (the fixed, complete shape of one
 * item, unlike ContactPersonForm's independently-optional fields). Same
 * dual-mode convention as every other form in this app: no `initialValues`
 * means "create". Submits via `onSubmit(payload)` with a plain object
 * (JSON, no photo).
 *
 * @param {{
 *   initialValues?: {headline: string, description: string, url: string},
 *   submitLabel: string,
 *   onSubmit: (payload: object) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
function LinkItemForm({ initialValues, submitLabel, onSubmit, onCancel }) {
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
      setError(err.message || 'שמירת הקישור נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="link-item-form form-fields" onSubmit={handleSubmit}>
      <label>
        כותרת
        <input value={values.headline} onChange={handleChange('headline')} required />
      </label>
      <label>
        תיאור
        <textarea value={values.description} onChange={handleChange('description')} required />
      </label>
      <label>
        קישור
        <input
          type="url"
          placeholder="https://"
          value={values.url}
          onChange={handleChange('url')}
          required
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

export default LinkItemForm
