import { useState } from 'react'
import LinkItemForm from './LinkItemForm'
import './LinkGroupCard.css'

/**
 * One links "card": a gold header bar naming the group, with each link
 * item listed below (headline + description + a fixed-icon button linking
 * out). An arrow button in the header collapses/expands the item list
 * (local UI state only, not persisted). Cards begin collapsed, so the page
 * opens as a list of headers and each visit to the tab starts closed again.
 * Admins get rename/delete on the
 * card itself, and add/edit/delete per item — mirrors ContactGroupCard's
 * structure exactly.
 *
 * When `reorderMode` is on (toggled from Links.jsx), admins get a drag
 * handle on the card itself (bubbles a dragstart up via
 * `onGroupDragHandleStart` — the actual drop target is the wrapper Links.jsx
 * renders around each card) and on every item row (handled entirely inside
 * this component, since reordering items only ever affects this one card).
 *
 * @param {{
 *   group: {_id: string, title: string, items: Array<object>},
 *   isAdmin: boolean,
 *   reorderMode?: boolean,
 *   onGroupDragHandleStart?: (e: React.DragEvent) => void,
 *   onRenameGroup: (groupId: string, title: string) => Promise<void>,
 *   onDeleteGroup: (group: object) => void,
 *   onAddItem: (groupId: string, values: object) => Promise<void>,
 *   onUpdateItem: (itemId: string, values: object) => Promise<void>,
 *   onDeleteItem: (item: object) => void,
 *   onReorderItems?: (groupId: string, orderedItemIds: string[]) => void,
 * }} props
 */
function LinkGroupCard({
  group,
  isAdmin,
  reorderMode,
  onGroupDragHandleStart,
  onRenameGroup,
  onDeleteGroup,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}) {
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(group.title)
  const [addingItem, setAddingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  // Cards start collapsed so the page opens as a scannable list of card
  // headers rather than every group's full link list at once. Local state, so
  // this resets to collapsed on every visit to the tab.
  const [collapsed, setCollapsed] = useState(true)

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    await onRenameGroup(group._id, titleDraft)
    setRenaming(false)
  }

  const canReorderItems = isAdmin && reorderMode

  const handleItemDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleItemDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = Number(e.dataTransfer.getData('text/plain'))
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return
    const next = [...group.items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    onReorderItems(group._id, next.map((item) => item._id))
  }

  return (
    <div className="link-group-card">
      <div
        className="link-group-header"
        onClick={() => !renaming && setCollapsed((current) => !current)}
        role="button"
        tabIndex={0}
        aria-label={collapsed ? 'הצגת הכרטיס' : 'כיווץ הכרטיס'}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (!renaming && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setCollapsed((current) => !current)
          }
        }}
      >
        {renaming ? (
          <form
            className="link-group-rename-form"
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} required />
            <button type="submit" className="btn btn-primary">
              שמירה
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setRenaming(false)}>
              ביטול
            </button>
          </form>
        ) : (
          <>
            <div className="link-group-header-title">
              {isAdmin && reorderMode && (
                <span
                  className="link-group-drag-handle"
                  draggable
                  onDragStart={onGroupDragHandleStart}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="גרירה לשינוי סדר הכרטיסים"
                  title="גרירה לשינוי סדר"
                >
                  ⠿
                </span>
              )}
              <span className={`link-group-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`}>▾</span>
              <h2>{group.title}</h2>
            </div>
            {isAdmin && (
              <div className="link-group-header-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setTitleDraft(group.title)
                    setRenaming(true)
                  }}
                >
                  עריכה
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => onDeleteGroup(group)}>
                  מחיקה
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!collapsed && group.items.map((item, index) =>
        isAdmin && editingItemId === item._id ? (
          <div className="link-item-row" key={item._id}>
            <LinkItemForm
              initialValues={{
                headline: item.headline,
                description: item.description,
                url: item.url,
              }}
              submitLabel="עדכון"
              onSubmit={async (values) => {
                await onUpdateItem(item._id, values)
                setEditingItemId(null)
              }}
              onCancel={() => setEditingItemId(null)}
            />
          </div>
        ) : (
          <div
            className="link-item-row"
            key={item._id}
            onDragOver={canReorderItems ? (e) => e.preventDefault() : undefined}
            onDrop={canReorderItems ? (e) => handleItemDrop(e, index) : undefined}
          >
            {canReorderItems && (
              <span
                className="link-item-drag-handle"
                draggable
                onDragStart={(e) => handleItemDragStart(e, index)}
                aria-label="גרירה לשינוי סדר הקישורים"
                title="גרירה לשינוי סדר"
              >
                ⠿
              </span>
            )}
            <div className="link-item-headline">{item.headline}</div>
            <div className="link-item-description">{item.description}</div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              מעבר לקישור ↗
            </a>
            {isAdmin && (
              <div className="link-item-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setAddingItem(false)
                    setEditingItemId(item._id)
                  }}
                >
                  עריכה
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => onDeleteItem(item)}>
                  מחיקה
                </button>
              </div>
            )}
          </div>
        )
      )}

      {!collapsed && isAdmin && (
        <div className="link-group-add-item">
          {addingItem ? (
            <LinkItemForm
              submitLabel="הוספה"
              onSubmit={async (values) => {
                await onAddItem(group._id, values)
                setAddingItem(false)
              }}
              onCancel={() => setAddingItem(false)}
            />
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setAddingItem(true)}>
              + הוספת קישור
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LinkGroupCard
