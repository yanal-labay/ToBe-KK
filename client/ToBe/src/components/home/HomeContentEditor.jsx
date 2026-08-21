import { useState } from 'react'
import './HomeContentEditor.css'

/**
 * The home page's admin-editable title+body text block. Guests just see
 * the rendered text; admins get an "עריכה" button that swaps it for an
 * inline title+body form, submitting via `onSave`.
 *
 * @param {{
 *   title: string,
 *   body: string,
 *   isAdmin: boolean,
 *   onSave: (values: {title: string, body: string}) => Promise<void>,
 * }} props
 */
function HomeContentEditor({ title, body, isAdmin, onSave }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({ title, body })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setValues({ title, body })
    setError('')
    setEditing(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(values)
      setEditing(false)
    } catch (err) {
      setError(err.message || 'שמירת התוכן נכשלה')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form className="home-content home-content-form" onSubmit={handleSubmit}>
        <label>
          כותרת
          <input
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            required
          />
        </label>
        <label>
          טקסט
          <textarea
            value={values.body}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
            required
          />
        </label>
        {error && <p className="home-content-error">{error}</p>}
        <div className="home-content-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'שומר...' : 'שמירה'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
            ביטול
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="home-content">
      <div className="home-content-header">
        <h2>{title}</h2>
        {isAdmin && (
          <button type="button" className="btn btn-outline" onClick={startEditing}>
            עריכה
          </button>
        )}
      </div>
      <p className="home-content-body">{body}</p>
    </div>
  )
}

export default HomeContentEditor
