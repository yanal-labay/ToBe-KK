import { useState } from 'react'
import { createScheduleCategory, renameScheduleCategory, deleteScheduleCategory } from './ScheduleService'
import { CATEGORY_COLOR_KEYS } from './categoryPalette'
import './CategoryManager.css'

/**
 * A row of clickable color swatches (see categoryPalette.js for the fixed
 * list) — shared by both the "new category" form and each row's own edit
 * form below, so create and recolor use the exact same picker.
 */
function SwatchPicker({ value, onChange }) {
  return (
    <div className="category-swatch-picker">
      {CATEGORY_COLOR_KEYS.map(({ key, labelHe }) => (
        <button
          type="button"
          key={key}
          className={`category-swatch-option schedule-color-category-${key} ${value === key ? 'is-selected' : ''}`}
          title={labelHe}
          aria-label={labelHe}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        />
      ))}
    </div>
  )
}

/**
 * Admin-only management of manual-entry categories — a genuine dynamic list
 * (any number of categories, no fixed cap), each with a name and a color
 * chosen from `CATEGORY_COLOR_KEYS`. Multiple categories may share a color;
 * nothing here treats a color as a scarce resource. See `ScheduleEntryForm`'s
 * category select, which only ever offers categories created here.
 *
 * @param {{
 *   categories: Array<{_id: string, name: string, colorKey: string}>,
 *   onCategoriesChanged: () => void,
 * }} props
 */
function CategoryManager({ categories, onCategoriesChanged }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColorKey, setNewColorKey] = useState(CATEGORY_COLOR_KEYS[0].key)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColorKey, setEditColorKey] = useState('')

  const [error, setError] = useState('')
  // Which single button is mid-request — 'new' for the create form, or a
  // category's own _id for that row's rename form — so only that one button
  // shows "שומר..." even if another row's form happens to be open too.
  const [savingTarget, setSavingTarget] = useState(null)

  const startEditing = (category) => {
    setEditingId(category._id)
    setEditName(category.name)
    setEditColorKey(category.colorKey)
    setError('')
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setSavingTarget('new')
    setError('')
    try {
      const res = await createScheduleCategory({ name, colorKey: newColorKey })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setNewName('')
      setNewColorKey(CATEGORY_COLOR_KEYS[0].key)
      setCreating(false)
      onCategoriesChanged()
    } catch (err) {
      setError(err.message || 'הוספת הקטגוריה נכשלה')
    } finally {
      setSavingTarget(null)
    }
  }

  const handleRename = async (category) => {
    const name = editName.trim()
    if (!name) return
    setSavingTarget(category._id)
    setError('')
    try {
      const res = await renameScheduleCategory(category._id, { name, colorKey: editColorKey })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setEditingId(null)
      onCategoriesChanged()
    } catch (err) {
      setError(err.message || 'עדכון הקטגוריה נכשל')
    } finally {
      setSavingTarget(null)
    }
  }

  const handleDelete = async (category) => {
    if (!window.confirm(`למחוק את הקטגוריה "${category.name}"?`)) return
    setError('')
    const res = await deleteScheduleCategory(category._id)
    const data = await res.json()
    if (!data.success) {
      setError(data.message || 'מחיקת הקטגוריה נכשלה')
      return
    }
    onCategoriesChanged()
  }

  return (
    <div className="category-manager">
      {categories.map((category) => {
        const isEditing = editingId === category._id

        return (
          <div className="category-manager-row" key={category._id}>
            <span className={`category-manager-swatch schedule-color-category-${category.colorKey}`} />
            {isEditing ? (
              <div className="category-manager-form">
                <input
                  placeholder="שם קטגוריה (למשל: חופשות)"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <SwatchPicker value={editColorKey} onChange={setEditColorKey} />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingTarget === category._id}
                  onClick={() => handleRename(category)}
                >
                  {savingTarget === category._id ? 'שומר...' : 'שמירה'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>
                  ביטול
                </button>
              </div>
            ) : (
              <div className="category-manager-row-content">
                <span className="category-manager-name">{category.name}</span>
                <button type="button" className="btn btn-outline" onClick={() => startEditing(category)}>
                  עריכה
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleDelete(category)}>
                  מחיקה
                </button>
              </div>
            )}
          </div>
        )
      })}

      {categories.length === 0 && !creating && (
        <p className="category-manager-empty">אין עדיין קטגוריות — יש להוסיף אחת לפני שניתן להוסיף רשומות ידניות ללוח.</p>
      )}

      {creating ? (
        <div className="category-manager-row category-manager-add">
          <div className="category-manager-form">
            <input
              placeholder="שם קטגוריה (למשל: חופשות)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <SwatchPicker value={newColorKey} onChange={setNewColorKey} />
            <button type="button" className="btn btn-primary" disabled={savingTarget === 'new'} onClick={handleCreate}>
              {savingTarget === 'new' ? 'שומר...' : 'שמירה'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary category-manager-add-toggle" onClick={() => setCreating(true)}>
          + קטגוריה חדשה
        </button>
      )}

      {error && <p className="category-manager-error">{error}</p>}
    </div>
  )
}

export default CategoryManager
