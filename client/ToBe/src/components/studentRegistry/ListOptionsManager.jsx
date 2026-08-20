import { useState } from 'react'
import { API_URL } from '../../apiConfig'
import './formFields.css'
import './ListOptionsManager.css'

/**
 * Admin-only management of the two registry dropdown lists (institutions,
 * fields of study), deliberately separate from the sign-up form itself —
 * the form only ever *picks* from these lists (or falls back to free text
 * via "אחר"), it never creates an option inline. Deleting an option here
 * has no effect on registrants who already picked it (see
 * listOption.model.js) — it only narrows future choices.
 *
 * @param {{
 *   institutions: Array<{_id: string, name: string}>,
 *   fieldsOfStudy: Array<{_id: string, name: string}>,
 *   onOptionsChanged: () => void,
 * }} props
 */
function ListOptionsManager({ institutions, fieldsOfStudy, onOptionsChanged }) {
  return (
    <div className="list-options-manager">
      <ListOptionSection
        title="מוסדות לימוד"
        category="institution"
        options={institutions}
        onOptionsChanged={onOptionsChanged}
      />
      <ListOptionSection
        title="תחומי לימוד"
        category="fieldOfStudy"
        options={fieldsOfStudy}
        onOptionsChanged={onOptionsChanged}
      />
    </div>
  )
}

function ListOptionSection({ title, category, options, onOptionsChanged }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/student-registry-options`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setName('')
      onOptionsChanged()
    } catch (err) {
      setError(err.message || 'ההוספה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (option) => {
    if (!window.confirm(`למחוק את "${option.name}" מהרשימה?`)) return
    const res = await fetch(`${API_URL}/api/student-registry-options/${option._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    onOptionsChanged()
  }

  return (
    <div className="list-options-section">
      <h3>{title}</h3>
      <form className="list-options-form" onSubmit={handleAdd}>
        <label>
          הוספת אפשרות חדשה
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'מוסיף...' : 'הוספה'}
        </button>
      </form>
      {error && <p className="registrant-form-error">{error}</p>}

      <div className="list-options-list">
        {options.length === 0 ? (
          <p>אין עדיין אפשרויות ברשימה זו.</p>
        ) : (
          options.map((option) => (
            <span className="list-options-chip" key={option._id}>
              {option.name}
              <button
                type="button"
                className="list-options-remove"
                onClick={() => handleDelete(option)}
                aria-label={`מחק את ${option.name}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default ListOptionsManager
