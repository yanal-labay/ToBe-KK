import {
  OTHER_OPTION,
  INTEREST_OPTIONS,
  MILITARY_STATUS_OPTIONS,
  EDUCATION_OPTIONS,
  IS_STUDENT_OPTIONS,
} from './constants'

/**
 * The full set of registry fields, used by the guest-facing
 * `RegistrantForm` (self-managed POST with a success screen). Admin edits
 * happen inline per-cell instead (see `RegistrantsPanel.jsx`), not through
 * this component. This component only renders controlled inputs; it owns
 * no state of its own.
 *
 * When `institution`/`fieldOfStudy` is set to the "אחר" option, an extra
 * free-text box appears (`institutionOther`/`fieldOfStudyOther`) for the
 * guest to specify what's missing from the list.
 *
 * `education` (highest completed level: בגרות/תואר ראשון/שני/שלישי/אחר) and
 * `isStudent` (currently enrolled anywhere, כן/לא) are two independent
 * questions — see registrant.model.js. Only `isStudent === 'yes'` shows the
 * institution/field-of-study/year-of-study boxes; `validateRegistrant` and
 * `buildRegistrantPayload` in constants.js mirror this same condition.
 *
 * `fieldErrors` (a `{fieldName: message}` map from `validateRegistrant`,
 * see constants.js) highlights the matching input/select with a red
 * border via the `is-invalid` class — empty/absent means no error.
 *
 * @param {{
 *   values: object,
 *   onChange: (field: string) => (e: Event) => void,
 *   onToggleInterest: (value: string) => void,
 *   institutions: string[],
 *   fieldsOfStudy: string[],
 *   fieldErrors?: Record<string, string>,
 * }} props
 */
function RegistrantFormFields({
  values,
  onChange,
  onToggleInterest,
  institutions,
  fieldsOfStudy,
  fieldErrors = {},
}) {
  const invalidClass = (field) => (fieldErrors[field] ? 'is-invalid' : '')
  const isCurrentlyStudent = values.isStudent === 'yes'

  return (
    <>
      <div className="registrant-form-row">
        <label>
          שם פרטי
          <input
            className={invalidClass('firstName')}
            value={values.firstName}
            onChange={onChange('firstName')}
            required
          />
        </label>
        <label>
          שם משפחה
          <input
            className={invalidClass('lastName')}
            value={values.lastName}
            onChange={onChange('lastName')}
            required
          />
        </label>
      </div>
      <div className="registrant-form-row">
        <label>
          אימייל
          <input
            type="email"
            className={invalidClass('email')}
            value={values.email}
            onChange={onChange('email')}
            required
          />
        </label>
        <label>
          טלפון
          <input
            type="tel"
            className={invalidClass('phone')}
            value={values.phone}
            onChange={onChange('phone')}
            required
          />
        </label>
      </div>
      <label>
        עיר / אזור מגורים
        <input
          className={invalidClass('city')}
          value={values.city}
          onChange={onChange('city')}
          required
        />
      </label>

      <div className="registrant-form-row">
        <label>
          השכלה
          <select
            className={invalidClass('education')}
            value={values.education}
            onChange={onChange('education')}
            required
          >
            <option value="" disabled>
              בחר/י השכלה
            </option>
            {EDUCATION_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          האם את/ה סטודנט/ית כעת?
          <select
            className={invalidClass('isStudent')}
            value={values.isStudent}
            onChange={onChange('isStudent')}
            required
          >
            <option value="" disabled>
              בחר/י
            </option>
            {IS_STUDENT_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isCurrentlyStudent && (
        <>
          <div className="registrant-form-row">
            <label>
              מוסד לימודים
              <select
                className={invalidClass('institution')}
                value={values.institution}
                onChange={onChange('institution')}
                required
              >
                <option value="" disabled>
                  בחר/י מוסד לימודים
                </option>
                {institutions.map((name) => (
                  <option value={name} key={name}>
                    {name}
                  </option>
                ))}
                <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
              </select>
            </label>
            {values.institution === OTHER_OPTION && (
              <label>
                שם מוסד הלימודים
                <input
                  className={invalidClass('institutionOther')}
                  value={values.institutionOther}
                  onChange={onChange('institutionOther')}
                  required
                />
              </label>
            )}
          </div>

          <div className="registrant-form-row">
            <label>
              מגמת / תחום לימודים
              <select
                className={invalidClass('fieldOfStudy')}
                value={values.fieldOfStudy}
                onChange={onChange('fieldOfStudy')}
                required
              >
                <option value="" disabled>
                  בחר/י תחום לימודים
                </option>
                {fieldsOfStudy.map((name) => (
                  <option value={name} key={name}>
                    {name}
                  </option>
                ))}
                <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
              </select>
            </label>
            {values.fieldOfStudy === OTHER_OPTION && (
              <label>
                שם תחום הלימודים
                <input
                  className={invalidClass('fieldOfStudyOther')}
                  value={values.fieldOfStudyOther}
                  onChange={onChange('fieldOfStudyOther')}
                  required
                />
              </label>
            )}
          </div>

          <label>
            שנת לימודים
            <select
              className={invalidClass('yearOfStudy')}
              value={values.yearOfStudy}
              onChange={onChange('yearOfStudy')}
              required
            >
              <option value="" disabled>
                בחר/י שנת לימודים
              </option>
              {[1, 2, 3, 4, 5, 6].map((year) => (
                <option value={year} key={year}>
                  שנה {year}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label>
        תחומי עניין (לא חובה)
        <div className="registrant-form-checkbox-group">
          {INTEREST_OPTIONS.map((opt) => (
            <label className="registrant-form-checkbox" key={opt.value}>
              <input
                type="checkbox"
                checked={values.interests.includes(opt.value)}
                onChange={() => onToggleInterest(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </label>

      <label>
        רקע שירות צבאי / לאומי (לא חובה)
        <select value={values.militaryStatus} onChange={onChange('militaryStatus')}>
          {MILITARY_STATUS_OPTIONS.map((opt) => (
            <option value={opt.value} key={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

export default RegistrantFormFields
