/**
 * Shared enum options and labels for the student registry feature — used by
 * the form fields, the admin table, and the pie chart, so the three never
 * drift out of sync.
 */

export const OTHER_OPTION = 'אחר'

export const INTEREST_OPTIONS = [
  { value: 'scholarships', label: 'מלגות' },
  { value: 'jobs', label: 'משרות' },
  { value: 'events', label: 'אירועים' },
]
export const INTEREST_LABELS = Object.fromEntries(
  INTEREST_OPTIONS.map((o) => [o.value, o.label])
)

export const MILITARY_STATUS_OPTIONS = [
  { value: '', label: 'לא צוין' },
  { value: 'discharged', label: 'משוחרר/ת משירות צבאי/לאומי' },
  { value: 'currently_serving', label: 'משרת/ת כיום' },
  { value: 'did_not_serve', label: 'לא שירתתי' },
]
export const MILITARY_STATUS_LABELS = Object.fromEntries(
  MILITARY_STATUS_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
)

// The registrant's highest *completed* education level — independent of
// whether they're currently enrolled anywhere (see IS_STUDENT_OPTIONS
// below for that separate question).
export const EDUCATION_OPTIONS = [
  { value: 'high_school', label: 'בגרות' },
  { value: 'bachelor', label: 'תואר ראשון' },
  { value: 'master', label: 'תואר שני' },
  { value: 'doctorate', label: 'תואר שלישי (דוקטורט)' },
  { value: 'other', label: 'אחר' },
]
export const EDUCATION_LABELS = Object.fromEntries(
  EDUCATION_OPTIONS.map((o) => [o.value, o.label])
)

// Whether the registrant is *currently* a student anywhere — a separate
// question from `education` above. Modeled as the strings 'yes'/'no' in
// local form state (matching every other enum-like field in this form),
// converted to a real boolean in buildRegistrantPayload. Only 'yes' shows/
// requires the institution/fieldOfStudy/yearOfStudy boxes.
export const IS_STUDENT_OPTIONS = [
  { value: 'yes', label: 'כן' },
  { value: 'no', label: 'לא' },
]

/**
 * Resolves a stored free-text value (e.g. `registrant.institution`) against
 * an admin-managed option list: if it matches an existing option, that
 * option is selected and the "other" text box stays empty; otherwise it
 * falls back to the "אחר" option with the stored value shown in the text
 * box. This lets editing gracefully handle values whose original list
 * option has since been deleted by an admin — and, since a non-student
 * registrant has `institution`/`fieldOfStudy: null`, also normalizes that
 * to `''` rather than handing a controlled input a `null` value.
 */
export function resolveOptionValue(list, value) {
  if (list.includes(value)) {
    return { selected: value, other: '' }
  }
  return { selected: OTHER_OPTION, other: value || '' }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Mirrors the server's phone regex exactly (registrant.controller.js's
// RegistrantInputSchema) — validating here too lets the guest form
// highlight a malformed phone number immediately, instead of only finding
// out after a round trip to the server.
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/

/**
 * Validates `RegistrantFormFields`' local `values` state client-side,
 * mirroring the server's `RegistrantInputSchema` closely enough to catch
 * the same problems before submitting. Returns a `{fieldName: message}`
 * map — empty means valid — so the form can highlight exactly the invalid
 * boxes in red rather than showing one generic error.
 */
export function validateRegistrant(values) {
  const errors = {}

  if (!values.firstName.trim()) errors.firstName = 'שדה חובה'
  if (!values.lastName.trim()) errors.lastName = 'שדה חובה'
  if (!values.email.trim() || !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'כתובת אימייל לא תקינה'
  }
  if (!PHONE_REGEX.test(values.phone.trim())) errors.phone = 'מספר טלפון לא תקין'
  if (!values.city.trim()) errors.city = 'שדה חובה'
  if (!values.education) errors.education = 'שדה חובה'
  if (!values.isStudent) errors.isStudent = 'שדה חובה'

  // The institution/field-of-study/year-of-study boxes only exist for a
  // currently-enrolled student (see RegistrantFormFields.jsx) — they stay
  // optional here to match.
  if (values.isStudent === 'yes') {
    if (!values.institution) errors.institution = 'שדה חובה'
    if (values.institution === OTHER_OPTION && !values.institutionOther.trim()) {
      errors.institutionOther = 'שדה חובה'
    }
    if (!values.fieldOfStudy) errors.fieldOfStudy = 'שדה חובה'
    if (values.fieldOfStudy === OTHER_OPTION && !values.fieldOfStudyOther.trim()) {
      errors.fieldOfStudyOther = 'שדה חובה'
    }
    if (!values.yearOfStudy) errors.yearOfStudy = 'שדה חובה'
  }

  return errors
}

/**
 * Builds the JSON payload the API expects from `RegistrantFormFields`'
 * local `values` state: resolves "אחר" selections down to their typed-in
 * text, coerces `yearOfStudy` to a number, and omits `militaryStatus`
 * entirely when left blank (so the server's `.optional()` treats it as
 * "not specified" rather than failing enum validation on an empty string).
 *
 * A registrant who isn't currently a student (`isStudent === 'no'`) sends
 * `institution`/`fieldOfStudy`/`yearOfStudy` as `null` regardless of
 * whatever's left in those boxes from before switching away from "כן" —
 * the fields are hidden in that case (see RegistrantFormFields.jsx), so
 * nothing typed into them beforehand should be sent. `isStudent` itself
 * converts from the form's 'yes'/'no' string to a real boolean here.
 */
export function buildRegistrantPayload(values) {
  const isStudent = values.isStudent === 'yes'

  const payload = {
    ...values,
    isStudent,
    institution: isStudent
      ? values.institution === OTHER_OPTION
        ? values.institutionOther.trim()
        : values.institution
      : null,
    fieldOfStudy: isStudent
      ? values.fieldOfStudy === OTHER_OPTION
        ? values.fieldOfStudyOther.trim()
        : values.fieldOfStudy
      : null,
    yearOfStudy: isStudent ? Number(values.yearOfStudy) : null,
  }
  delete payload.institutionOther
  delete payload.fieldOfStudyOther
  if (!payload.militaryStatus) delete payload.militaryStatus
  return payload
}
