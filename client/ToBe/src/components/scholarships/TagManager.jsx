import { useState } from 'react'
import { API_URL } from '../../apiConfig'
import './formFields.css'
import './TagManager.css'

/**
 * Admin-only tag management, deliberately separate from
 * `ScholarshipForm` — creating a scholarship only ever *picks* from this
 * list, it never creates a tag inline. Deleting a tag here also removes it
 * from every scholarship that had it (handled server-side, see
 * tag.controller.js's `deleteTag`).
 *
 * @param {{tags: Array<{_id: string, name: string}>, onTagsChanged: () => void}} props
 */
function TagManager({ tags, onTagsChanged }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/tags`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setName('')
      onTagsChanged()
    } catch (err) {
      setError(err.message || 'הוספת התגית נכשלה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tag) => {
    if (!window.confirm(`למחוק את התגית "${tag.name}"?`)) return
    const res = await fetch(`${API_URL}/api/tags/${tag._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    onTagsChanged()
  }

  return (
    <div className="tag-manager">
      <form className="tag-manager-form" onSubmit={handleAdd}>
        <label>
          תגית חדשה
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'מוסיף...' : 'הוספה'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <div className="tag-manager-list">
        {tags.length === 0 ? (
          <p>אין עדיין תגיות.</p>
        ) : (
          tags.map((tag) => (
            <span className="tag-manager-chip" key={tag._id}>
              {tag.name}
              <button
                type="button"
                className="tag-manager-remove"
                onClick={() => handleDelete(tag)}
                aria-label={`מחק את התגית ${tag.name}`}
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

export default TagManager
