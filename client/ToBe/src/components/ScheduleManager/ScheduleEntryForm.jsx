import { useState } from 'react'
import './ScheduleEntryForm.css'

const EMPTY_FORM = { title: '', startDate: '', endDate: '', categoryId: '' }

/**
 * Create/edit form for an admin-added manual calendar entry (title + date
 * range + category, no link to any Event/Scholarship). Same dual-mode
 * convention as every other form in this app: no `initialValues` means
 * "create". A category is required — its color is what the entry's pill
 * shows on the calendar — so the select only ever offers categories
 * already defined in `CategoryManager`; when none exist yet, the form
 * can't be submitted meaningfully, so it shows a hint instead.
 *
 * Submits via `onSubmit(payload)` with a plain object (not FormData) since
 * there's no file upload here.
 *
 * @param {{
 *   categories: Array<{_id: string, name: string, colorKey: string}>,
 *   initialValues?: {title: string, startDate: string, endDate: string, categoryId: string},
 *   submitLabel: string,
 *   onSubmit: (payload: {title: string, startDate: string, endDate: string, categoryId: string}) => Promise<void>,
 *   onCancel: () => void,
 *   onDelete?: () => void,
 * }} props
 */
function ScheduleEntryForm({ categories, initialValues, submitLabel, onSubmit, onCancel, onDelete }) {
  const [values, setValues] = useState(
    initialValues || { ...EMPTY_FORM, categoryId: categories[0]?._id || '' }
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => setValues({ ...values, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      setError('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה')
      return
    }

    setSaving(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err.message || 'שמירת הרשומה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  if (categories.length === 0) {
    return (
      <div className="schedule-entry-form">
        <p>יש להגדיר לפחות קטגוריה אחת (בניהול הקטגוריות) לפני הוספת רשומה ללוח.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            סגירה
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="schedule-entry-form form-fields" onSubmit={handleSubmit}>
      <label>
        כותרת
        <input value={values.title} onChange={handleChange('title')} required />
      </label>
      <div className="schedule-entry-form-row">
        <label>
          תאריך התחלה
          <input type="date" value={values.startDate} onChange={handleChange('startDate')} required />
        </label>
        <label>
          תאריך סיום
          <input
            type="date"
            value={values.endDate}
            onChange={handleChange('endDate')}
            min={values.startDate || undefined}
            required
          />
        </label>
      </div>
      <label>
        קטגוריה
        <select value={values.categoryId} onChange={handleChange('categoryId')} required>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר...' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          ביטול
        </button>
        {onDelete && (
          <button type="button" className="btn btn-secondary" onClick={onDelete}>
            מחיקה
          </button>
        )}
      </div>
    </form>
  )
}

export default ScheduleEntryForm
