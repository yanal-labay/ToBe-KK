import { API_URL } from '../../apiConfig'
import OptionChipManager from '../shared/OptionChipManager'
import './TagManager.css'

/**
 * Admin-only tag management, deliberately separate from
 * `ScholarshipForm` — creating a scholarship only ever *picks* from this
 * list, it never creates a tag inline. Deleting a tag here also removes it
 * from every scholarship that had it (handled server-side, see
 * tag.controller.js's `deleteTag`).
 *
 * The actual add-form-plus-chip-list UI lives in the shared
 * `OptionChipManager` (this used to be its own near-identical copy of that
 * same UI before it was extracted).
 *
 * @param {{tags: Array<{_id: string, name: string}>, onTagsChanged: () => void}} props
 */
function TagManager({ tags, onTagsChanged }) {
  const handleAdd = async (name) => {
    const res = await fetch(`${API_URL}/api/tags`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onTagsChanged()
  }

  const handleDelete = async (tag) => {
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
      <OptionChipManager
        inputLabel="תגית חדשה"
        items={tags}
        emptyMessage="אין עדיין תגיות."
        onAdd={handleAdd}
        onDelete={handleDelete}
        getDeleteConfirmMessage={(tag) => `למחוק את התגית "${tag.name}"?`}
        getDeleteAriaLabel={(tag) => `מחק את התגית ${tag.name}`}
      />
    </div>
  )
}

export default TagManager
