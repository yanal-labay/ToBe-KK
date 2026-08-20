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

export const ACADEMIC_STATUS_OPTIONS = [
  { value: 'bachelor', label: 'תואר ראשון' },
  { value: 'master', label: 'תואר שני' },
  { value: 'doctorate', label: 'תואר שלישי (דוקטורט)' },
  { value: 'other', label: 'אחר' },
]
export const ACADEMIC_STATUS_LABELS = Object.fromEntries(
  ACADEMIC_STATUS_OPTIONS.map((o) => [o.value, o.label])
)

/**
 * Resolves a stored free-text value (e.g. `registrant.institution`) against
 * an admin-managed option list: if it matches an existing option, that
 * option is selected and the "other" text box stays empty; otherwise it
 * falls back to the "אחר" option with the stored value shown in the text
 * box. This lets editing gracefully handle values whose original list
 * option has since been deleted by an admin.
 */
export function resolveOptionValue(list, value) {
  if (list.includes(value)) {
    return { selected: value, other: '' }
  }
  return { selected: OTHER_OPTION, other: value }
}

/**
 * Builds the JSON payload the API expects from `RegistrantFormFields`'
 * local `values` state: resolves "אחר" selections down to their typed-in
 * text, coerces `yearOfStudy` to a number, and omits `militaryStatus`
 * entirely when left blank (so the server's `.optional()` treats it as
 * "not specified" rather than failing enum validation on an empty string).
 */
export function buildRegistrantPayload(values) {
  const payload = {
    ...values,
    institution: values.institution === OTHER_OPTION ? values.institutionOther.trim() : values.institution,
    fieldOfStudy:
      values.fieldOfStudy === OTHER_OPTION ? values.fieldOfStudyOther.trim() : values.fieldOfStudy,
    yearOfStudy: Number(values.yearOfStudy),
  }
  delete payload.institutionOther
  delete payload.fieldOfStudyOther
  if (!payload.militaryStatus) delete payload.militaryStatus
  return payload
}
