import { useEffect, useState } from 'react'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import ContactGroupCard from '../components/contact/ContactGroupCard'
import './Contact.css'

/**
 * The /contact page ("צרו קשר") — one or more colored-header contact
 * tables (see ContactGroupCard), each listing people with their
 * mobile/phone/email/location. Guests only view; admins can create
 * additional groups and manage every group's people.
 */
function Contact() {
  const { isAdmin } = useAdminSession()

  const [groups, setGroups] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')

  const loadContact = () => {
    setLoadState('loading')
    fetch(`${API_URL}/api/contact`)
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
    loadContact()
  }, [])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/contact/groups`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newGroupTitle }),
    })
    const data = await res.json()
    if (!data.success) return
    setNewGroupTitle('')
    setCreatingGroup(false)
    loadContact()
  }

  const handleRenameGroup = async (groupId, title) => {
    const res = await fetch(`${API_URL}/api/contact/groups/${groupId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json()
    if (!data.success) return
    loadContact()
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`למחוק את הקבוצה "${group.title}" וכל אנשי הקשר שבה?`)) return
    const res = await fetch(`${API_URL}/api/contact/groups/${group._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadContact()
  }

  const handleAddPerson = async (groupId, values) => {
    const res = await fetch(`${API_URL}/api/contact/people`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, group: groupId }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    loadContact()
  }

  const handleUpdatePerson = async (personId, values) => {
    const res = await fetch(`${API_URL}/api/contact/people/${personId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    loadContact()
  }

  const handleDeletePerson = async (person) => {
    if (!window.confirm(`למחוק את "${person.name}"?`)) return
    const res = await fetch(`${API_URL}/api/contact/people/${person._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadContact()
  }

  return (
    <div className="contact-page">
      <div className="contact-page-header">
        <h1>צרו קשר</h1>
        {isAdmin && !creatingGroup && (
          <button type="button" className="btn btn-primary" onClick={() => setCreatingGroup(true)}>
            + הוספת קבוצת אנשי קשר
          </button>
        )}
      </div>

      {isAdmin && creatingGroup && (
        <form className="contact-new-group-form" onSubmit={handleCreateGroup}>
          <input
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="שם הקבוצה (למשל: פרטי יצירת קשר)"
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

      {loadState === 'loading' && <p>טוען פרטי יצירת קשר...</p>}
      {loadState === 'error' && <p className="contact-error">לא ניתן לטעון את פרטי יצירת הקשר כרגע</p>}
      {loadState === 'ready' && groups.length === 0 && <p>אין עדיין קבוצות אנשי קשר.</p>}

      {groups.map((group) => (
        <ContactGroupCard
          key={group._id}
          group={group}
          isAdmin={isAdmin}
          onRenameGroup={handleRenameGroup}
          onDeleteGroup={handleDeleteGroup}
          onAddPerson={handleAddPerson}
          onUpdatePerson={handleUpdatePerson}
          onDeletePerson={handleDeletePerson}
        />
      ))}
    </div>
  )
}

export default Contact
