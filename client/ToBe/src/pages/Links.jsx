import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import {
  getLinks,
  createLinkGroup,
  renameLinkGroup,
  deleteLinkGroup,
  createLinkItem,
  updateLinkItem,
  deleteLinkItem,
  reorderLinkGroups,
  reorderLinkItems,
} from '../services/linksService'
import LinkGroupCard from '../components/links/LinkGroupCard'
import './Links.css'

/**
 * The /links page ("לינקים שימושיים") — one or more colored-header cards
 * (see LinkGroupCard), each listing headline/description/link items.
 * Guests only view; admins can create additional cards and manage every
 * card's items. Structurally a near-exact mirror of Contact.jsx.
 */
function Links() {
  const { isAdmin } = useAdminSession()

  const [groups, setGroups] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [reorderMode, setReorderMode] = useState(false)

  const loadLinks = () => {
    setLoadState('loading')
    getLinks()
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setGroups(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  useEffect(() => {
    loadLinks()
  }, [])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    const res = await createLinkGroup({ title: newGroupTitle })
    const data = await res.json()
    if (!data.success) return
    setNewGroupTitle('')
    setCreatingGroup(false)
    loadLinks()
  }

  const handleRenameGroup = async (groupId, title) => {
    const res = await renameLinkGroup(groupId, { title })
    const data = await res.json()
    if (!data.success) return
    loadLinks()
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`למחוק את הכרטיס "${group.title}" וכל הקישורים שבו?`)) return
    const res = await deleteLinkGroup(group._id)
    const data = await res.json()
    if (!data.success) return
    loadLinks()
  }

  const handleAddItem = async (groupId, values) => {
    const res = await createLinkItem({ ...values, group: groupId })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    loadLinks()
  }

  const handleUpdateItem = async (itemId, values) => {
    const res = await updateLinkItem(itemId, values)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    loadLinks()
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`למחוק את "${item.headline}"?`)) return
    const res = await deleteLinkItem(item._id)
    const data = await res.json()
    if (!data.success) return
    loadLinks()
  }

  // Drag-to-reorder for cards (only active while reorderMode is on, see the
  // toggle button below). Updates local state immediately for a smooth drag
  // experience, then persists the new order in the background.
  const handleGroupDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleGroupDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = Number(e.dataTransfer.getData('text/plain'))
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return

    const next = [...groups]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    setGroups(next)

    reorderLinkGroups(next.map((g) => g._id))
  }

  // Drag-to-reorder for items within one card — same immediate-local-update
  // + background-persist approach, scoped to a single group's item list.
  const handleReorderItems = (groupId, orderedItemIds) => {
    setGroups((current) =>
      current.map((group) => {
        if (group._id !== groupId) return group
        const itemsById = new Map(group.items.map((item) => [item._id, item]))
        return { ...group, items: orderedItemIds.map((id) => itemsById.get(id)) }
      })
    )

    reorderLinkItems(orderedItemIds)
  }

  return (
    <div className="links-page">
      <div className="links-page-header">
        <h1>לינקים שימושיים</h1>
        {isAdmin && (
          <div className="links-page-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setReorderMode((current) => !current)}
            >
              {reorderMode ? 'סיום סידור' : 'סידור מחדש'}
            </button>
            {!creatingGroup && (
              <button type="button" className="btn btn-primary" onClick={() => setCreatingGroup(true)}>
                + הוספת כרטיס קישורים
              </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && creatingGroup && (
        <form className="links-new-group-form" onSubmit={handleCreateGroup}>
          <input
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="שם הכרטיס (למשל: אתרים שימושיים)"
            required
          />
          <button type="submit" className="btn btn-primary">
            שמירה
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setCreatingGroup(false)}>
            ביטול
          </button>
        </form>
      )}

      {loadState === 'loading' && <p>טוען לינקים שימושיים...</p>}
      {loadState === 'error' && <p className="links-error">לא ניתן לטעון את הלינקים כרגע</p>}
      {loadState === 'ready' && groups.length === 0 && <p>אין עדיין כרטיסי קישורים.</p>}

      {groups.map((group, index) => (
        <div
          key={group._id}
          onDragOver={reorderMode ? (e) => e.preventDefault() : undefined}
          onDrop={reorderMode ? (e) => handleGroupDrop(e, index) : undefined}
        >
          <LinkGroupCard
            group={group}
            isAdmin={isAdmin}
            reorderMode={reorderMode}
            onGroupDragHandleStart={(e) => handleGroupDragStart(e, index)}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onReorderItems={handleReorderItems}
          />
        </div>
      ))}
    </div>
  )
}

export default Links
