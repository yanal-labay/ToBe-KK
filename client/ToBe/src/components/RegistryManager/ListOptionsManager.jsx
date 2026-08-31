import { addRegistryOption, deleteRegistryOption } from './RegistryOptionsService'
import OptionChipManager from '../../GUIComponents/Widgets/OptionChipManager'
import './ListOptionsManager.css'

/**
 * Admin-only management of the two registry dropdown lists (institutions,
 * fields of study), deliberately separate from the sign-up form itself —
 * the form only ever *picks* from these lists (or falls back to free text
 * via "אחר"), it never creates an option inline. Deleting an option here
 * has no effect on registrants who already picked it (see
 * listOption.model.js) — it only narrows future choices.
 *
 * The actual add-form-plus-chip-list UI lives in the shared
 * `OptionChipManager` (this used to be its own near-identical copy of that
 * same UI before it was extracted).
 *
 * @param {{
 *   institutions: Array<{_id: string, name: string}>,
 *   fieldsOfStudy: Array<{_id: string, name: string}>,
 *   onOptionsChanged: () => void,
 * }} props
 */
function ListOptionsManager({ institutions, fieldsOfStudy, onOptionsChanged }) {
  const addOption = async (category, name) => {
    const res = await addRegistryOption({ category, name })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    onOptionsChanged()
  }

  const deleteOption = async (option) => {
    const res = await deleteRegistryOption(option._id)
    const data = await res.json()
    if (!data.success) return
    onOptionsChanged()
  }

  return (
    <div className="list-options-manager">
      <OptionChipManager
        title="מוסדות לימוד"
        inputLabel="הוספת אפשרות חדשה"
        items={institutions}
        emptyMessage="אין עדיין אפשרויות ברשימה זו."
        onAdd={(name) => addOption('institution', name)}
        onDelete={deleteOption}
        getDeleteConfirmMessage={(option) => `למחוק את "${option.name}" מהרשימה?`}
        getDeleteAriaLabel={(option) => `מחק את ${option.name}`}
      />
      <OptionChipManager
        title="תחומי לימוד"
        inputLabel="הוספת אפשרות חדשה"
        items={fieldsOfStudy}
        emptyMessage="אין עדיין אפשרויות ברשימה זו."
        onAdd={(name) => addOption('fieldOfStudy', name)}
        onDelete={deleteOption}
        getDeleteConfirmMessage={(option) => `למחוק את "${option.name}" מהרשימה?`}
        getDeleteAriaLabel={(option) => `מחק את ${option.name}`}
      />
    </div>
  )
}

export default ListOptionsManager
