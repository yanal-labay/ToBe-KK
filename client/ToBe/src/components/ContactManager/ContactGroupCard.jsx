import { useState } from 'react'
import ContactPersonForm from './ContactPersonForm'
import './ContactGroupCard.css'

/**
 * One contact "table": a gold header bar naming the group, with each
 * person listed below (name/role on one side, mobile/phone/email/location
 * on the other — each only rendered when set). Admins get rename/delete
 * on the group itself, and add/edit/delete per person.
 *
 * @param {{
 *   group: {_id: string, title: string, people: Array<object>},
 *   isAdmin: boolean,
 *   onRenameGroup: (groupId: string, title: string) => Promise<void>,
 *   onDeleteGroup: (group: object) => void,
 *   onAddPerson: (groupId: string, values: object) => Promise<void>,
 *   onUpdatePerson: (personId: string, values: object) => Promise<void>,
 *   onDeletePerson: (person: object) => void,
 * }} props
 */
function ContactGroupCard({
  group,
  isAdmin,
  onRenameGroup,
  onDeleteGroup,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}) {
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(group.title)
  const [addingPerson, setAddingPerson] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState(null)

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    await onRenameGroup(group._id, titleDraft)
    setRenaming(false)
  }

  return (
    <div className="contact-group-card">
      <div className="contact-group-header">
        {renaming ? (
          <form className="contact-group-rename-form" onSubmit={handleRenameSubmit}>
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
            <h2>{group.title}</h2>
            {isAdmin && (
              <div className="contact-group-header-actions">
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

      {group.people.map((person) =>
        isAdmin && editingPersonId === person._id ? (
          <div className="contact-person-row" key={person._id}>
            <ContactPersonForm
              initialValues={{
                name: person.name,
                role: person.role,
                mobile: person.mobile || '',
                phone: person.phone || '',
                email: person.email || '',
                location: person.location || '',
              }}
              submitLabel="עדכון"
              onSubmit={async (values) => {
                await onUpdatePerson(person._id, values)
                setEditingPersonId(null)
              }}
              onCancel={() => setEditingPersonId(null)}
            />
          </div>
        ) : (
          <div className="contact-person-row" key={person._id}>
            <div className="contact-person-info">
              <div className="contact-person-name">{person.name}</div>
              <div className="contact-person-role">{person.role}</div>
              {person.location && (
                <div className="contact-person-location">📍 {person.location}</div>
              )}
              {isAdmin && (
                <div className="contact-person-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setAddingPerson(false)
                      setEditingPersonId(person._id)
                    }}
                  >
                    עריכה
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => onDeletePerson(person)}>
                    מחיקה
                  </button>
                </div>
              )}
            </div>
            <div className="contact-person-details">
              {person.mobile && (
                <span className="contact-person-detail">
                  {person.mobile}
                  <span className="contact-icon-circle is-mobile">📱</span>
                </span>
              )}
              {person.phone && (
                <span className="contact-person-detail">
                  {person.phone}
                  <span className="contact-icon-circle is-phone">📞</span>
                </span>
              )}
              {person.email && (
                <span className="contact-person-detail">
                  {person.email}
                  <span className="contact-icon-circle is-email">📧</span>
                </span>
              )}
            </div>
          </div>
        )
      )}

      {isAdmin && (
        <div className="contact-group-add-person">
          {addingPerson ? (
            <ContactPersonForm
              submitLabel="הוספה"
              onSubmit={async (values) => {
                await onAddPerson(group._id, values)
                setAddingPerson(false)
              }}
              onCancel={() => setAddingPerson(false)}
            />
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setAddingPerson(true)}>
              + הוספת איש קשר
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ContactGroupCard
