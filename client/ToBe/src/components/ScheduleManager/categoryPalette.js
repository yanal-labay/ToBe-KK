/**
 * The fixed set of color keys an admin can choose from for a manual-entry
 * category (see CategoryManager.jsx) — order here is the order swatches are
 * offered in the picker. The actual hex values live only in Calendar.css as
 * `--schedule-category-{key}-color`; this file just needs the valid keys and
 * their Hebrew labels. Keep in sync with the server's zod enum in
 * schedule.controller.js (`CategoryInputSchema`).
 */
export const CATEGORY_COLOR_KEYS = [
  { key: 'orange', labelHe: 'כתום' },
  { key: 'teal', labelHe: 'טורקיז' },
  { key: 'pink', labelHe: 'ורוד' },
  { key: 'purple', labelHe: 'סגול' },
  { key: 'red', labelHe: 'אדום' },
  { key: 'fuchsia', labelHe: 'פוקסיה' },
  { key: 'indigo', labelHe: 'אינדיגו' },
  { key: 'slate', labelHe: 'אפור-כחול' },
  { key: 'cyan', labelHe: 'ציאן' },
  { key: 'stone', labelHe: 'חום-אפור' },
]
