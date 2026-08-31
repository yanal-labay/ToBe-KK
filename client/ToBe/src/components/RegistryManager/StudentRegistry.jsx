import { useEffect, useState } from 'react'
import { useAdminSession } from '../../hooks/useAdminSession'
import { getRegistryOptions } from './RegistryOptionsService'
import RegistrantForm from './RegistrantForm'
import RegistrantsPanel from './RegistrantsPanel'
import ListOptionsManager from './ListOptionsManager'
import './StudentRegistry.css'

/**
 * The /student-registry page ("רישום למאגר הצעירים"). Unlike Events or
 * Scholarships, there are no admin-authored posts here — guests sign
 * themselves up into one shared registry, and the admin's privileges are
 * viewing/editing who signed up (RegistrantsPanel) and managing the
 * institution/field-of-study dropdown lists (ListOptionsManager),
 * independent of any registrant submission — same separation as
 * Scholarships' ScholarshipFieldsManager. `isAdmin` alone decides which
 * branch renders.
 */
function StudentRegistry() {
  const { isAdmin } = useAdminSession()
  const [showRegistrants, setShowRegistrants] = useState(true)
  const [showOptionsManager, setShowOptionsManager] = useState(false)
  const [institutions, setInstitutions] = useState([])
  const [fieldsOfStudy, setFieldsOfStudy] = useState([])

  const loadOptions = () => {
    getRegistryOptions()
      .then((res) => (res.ok ? res.json() : { institutions: [], fieldsOfStudy: [] }))
      .then((data) => {
        setInstitutions(data.institutions)
        setFieldsOfStudy(data.fieldsOfStudy)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadOptions()
  }, [])

  return (
    <div className="student-registry-page">
      <div className="student-registry-page-header">
        <h1>רישום למאגר הצעירים</h1>
        {isAdmin && (
          <div className="student-registry-page-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowOptionsManager((current) => !current)}
            >
              {showOptionsManager ? 'סגירת ניהול רשימות' : 'ניהול רשימות'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRegistrants((current) => !current)}
            >
              {showRegistrants ? 'הסתרת נרשמים' : 'צפייה ברישומים'}
            </button>
          </div>
        )}
      </div>

      {isAdmin && showOptionsManager && (
        <ListOptionsManager
          institutions={institutions}
          fieldsOfStudy={fieldsOfStudy}
          onOptionsChanged={loadOptions}
        />
      )}

      {isAdmin ? (
        showRegistrants && (
          <RegistrantsPanel
            institutions={institutions.map((o) => o.name)}
            fieldsOfStudy={fieldsOfStudy.map((o) => o.name)}
          />
        )
      ) : (
        <RegistrantForm />
      )}
    </div>
  )
}

export default StudentRegistry
