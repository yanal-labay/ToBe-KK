import { useState } from 'react'
import './HomeContentEditor.css'

/**
 * An admin-editable title+body text block for the home page. Guests just
 * see the rendered text; admins get an "עריכה"/"הוספת תוכן" button that
 * swaps it for an inline title+body form, submitting via `onSave`. Used
 * twice on the home page with independent content (see Home.jsx) — once
 * above the photo carousel (the page's required `<h1>` hero heading) and
 * once below it (an optional `<h2>` caption, which may be left or cleared
 * blank) — so this component takes its heading tag, wrapper class, and
 * whether the fields are required as props instead of assuming it's
 * always the page's single required hero block.
 *
 * When `title`/`body` are both empty, a guest sees nothing (no empty
 * heading/paragraph rendered) while an admin still sees the block with a
 * hint and an "הוספת תוכן" button, so there's always a way to add content
 * that hasn't been set yet.
 *
 * @param {{
 *   title: string|null,
 *   body: string|null,
 *   isAdmin: boolean,
 *   onSave: (values: {title: string, body: string}) => Promise<void>,
 *   headingTag?: string,
 *   className?: string,
 *   required?: boolean,
 * }} props
 */
function HomeContentEditor({
  title,
  body,
  isAdmin,
  onSave,
  headingTag = 'h1',
  className = 'home-content',
  required = true,
}) {
  const HeadingTag = headingTag
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({ title: title || '', body: body || '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setValues({ title: title || '', body: body || '' })
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
      <form className={`${className} home-content-form`} onSubmit={handleSubmit}>
        <label>
          כותרת
          <input
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            required={required}
          />
        </label>
        <label>
          טקסט
          <textarea
            value={values.body}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
            required={required}
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

  const hasContent = Boolean(title) || Boolean(body)
  if (!hasContent && !isAdmin) return null

  return (
    <div className={className}>
      {title && <HeadingTag>{title}</HeadingTag>}
      {body && <p className="home-content-body">{body}</p>}
      {!hasContent && <p className="home-content-empty-hint">אין כאן תוכן עדיין</p>}
      {isAdmin && (
        <button type="button" className="btn btn-outline home-content-edit" onClick={startEditing}>
          {hasContent ? 'עריכה' : 'הוספת תוכן'}
        </button>
      )}
    </div>
  )
}

export default HomeContentEditor
