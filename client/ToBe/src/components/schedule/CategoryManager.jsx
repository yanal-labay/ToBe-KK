import { useState } from 'react'
import { API_URL } from '../../apiConfig'
import './CategoryManager.css'

const SLOTS = [0, 1, 2]

/**
 * Admin-only management of the calendar's 3 free color slots. The
 * calendar has exactly 5 colors total: 2 are permanently reserved for
 * Events and Scholarships (never shown here), and these 3 remaining ones
 * must each be named as a category before any manual calendar entry can
 * use that color — see `ScheduleEntryForm`'s category select, which only
 * ever offers categories created here, and `ScheduleCategory` on the
 * server (colorSlot is unique, so at most one category per slot).
 *
 * @param {{
 *   categories: Array<{_id: string, name: string, colorSlot: number}>,
 *   onCategoriesChanged: () => void,
 * }} props
 */
function CategoryManager({ categories, onCategoriesChanged }) {
  const bySlot = new Map(categories.map((category) => [category.colorSlot, category]))
  const [drafts, setDrafts] = useState({}) // { [slot]: nameBeingTyped }
  const [editingSlot, setEditingSlot] = useState(null)
  const [error, setError] = useState('')
  const [savingSlot, setSavingSlot] = useState(null)

  const handleCreate = async (slot) => {
    const name = (drafts[slot] || '').trim()
    if (!name) return
    setSavingSlot(slot)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/schedule/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colorSlot: slot }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setDrafts((current) => ({ ...current, [slot]: '' }))
      onCategoriesChanged()
    } catch (err) {
      setError(err.message || 'הוספת הקטגוריה נכשלה')
    } finally {
      setSavingSlot(null)
    }
  }

  const handleRename = async (category) => {
    const name = (drafts[category.colorSlot] ?? category.name).trim()
    if (!name) return
    setSavingSlot(category.colorSlot)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/schedule/categories/${category._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colorSlot: category.colorSlot }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setEditingSlot(null)
      onCategoriesChanged()
    } catch (err) {
      setError(err.message || 'עדכון הקטגוריה נכשל')
    } finally {
      setSavingSlot(null)
    }
  }

  const handleDelete = async (category) => {
    if (!window.confirm(`למחוק את הקטגוריה "${category.name}"?`)) return
    setError('')
    const res = await fetch(`${API_URL}/api/schedule/categories/${category._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) {
      setError(data.message || 'מחיקת הקטגוריה נכשלה')
      return
    }
    onCategoriesChanged()
  }

  return (
    <div className="category-manager">
      {SLOTS.map((slot) => {
        const category = bySlot.get(slot)
        const isEditing = editingSlot === slot

        return (
          <div className="category-manager-row" key={slot}>
            <span className={`category-manager-swatch schedule-color-category-${slot}`} />
            {category && !isEditing ? (
              <div className="category-manager-row-content">
                <span className="category-manager-name">{category.name}</span>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditingSlot(slot)
                    setDrafts((current) => ({ ...current, [slot]: category.name }))
                  }}
                >
                  עריכה
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleDelete(category)}>
                  מחיקה
                </button>
              </div>
            ) : (
              <div className="category-manager-form">
                <input
                  placeholder="שם קטגוריה (למשל: חופשות)"
                  value={drafts[slot] ?? ''}
                  onChange={(e) => setDrafts((current) => ({ ...current, [slot]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingSlot === slot}
                  onClick={() => (category ? handleRename(category) : handleCreate(slot))}
                >
                  {savingSlot === slot ? 'שומר...' : 'שמירה'}
                </button>
                {isEditing && (
                  <button type="button" className="btn btn-outline" onClick={() => setEditingSlot(null)}>
                    ביטול
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      {error && <p className="category-manager-error">{error}</p>}
    </div>
  )
}

export default CategoryManager
