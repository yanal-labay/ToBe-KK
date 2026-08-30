/**
 * Splits `text` into a leading preview of at most `maxChars` characters
 * (including spaces) plus whether it was actually longer than that, so a card
 * can offer to expand only when there's really more to show.
 *
 * The cut backs up to the last whole word, so a preview never ends mid-word —
 * it comes in at or under `maxChars`, never over. A single word longer than
 * the whole budget has no space to back up to, so that one case cuts hard
 * rather than returning an empty preview.
 */
export function previewText(text, maxChars) {
  if (text.length <= maxChars) {
    return { preview: text, isTruncated: false }
  }
  // Look one character past the budget: if that character is a space, the
  // budget already ended on a clean word boundary, and searching only within
  // the budget itself would drop a word that actually fit.
  const withLookahead = text.slice(0, maxChars + 1)
  const lastSpace = withLookahead.lastIndexOf(' ')
  const preview = lastSpace > 0 ? withLookahead.slice(0, lastSpace) : text.slice(0, maxChars)
  return { preview: preview.trimEnd(), isTruncated: true }
}
