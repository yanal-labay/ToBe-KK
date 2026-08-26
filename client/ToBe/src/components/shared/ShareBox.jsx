import { useState } from 'react'
import './ShareBox.css'

/**
 * A ready-to-post invitation for one item, in an editable box with a copy
 * button and a WhatsApp hand-off — opened from the admin action row on an
 * Event/Scholarship/Job card. The text itself is composed by the caller (see
 * `utils/shareText.js`), keeping this component's Hebrew copy limited to its
 * own controls, the same "parent supplies the content" convention as
 * `OptionChipManager`.
 *
 * The textarea is editable so an admin can tweak the wording before posting;
 * it seeds from `text` once, on mount, which is enough because the box only
 * mounts when opened.
 *
 * There's no Facebook button on purpose: Facebook's share dialog only
 * accepts a URL and silently discards any prefilled message, so it would
 * drop the invitation this whole feature exists to write. WhatsApp is the
 * one platform where a prefilled share link genuinely carries the text
 * through.
 *
 * @param {{ text: string }} props
 */
function ShareBox({ text }) {
  const [draft, setDraft] = useState(text)
  // null = idle, 'copied' = just copied, 'failed' = clipboard unavailable.
  const [copyState, setCopyState] = useState(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopyState('copied')
      setTimeout(() => setCopyState(null), 2000)
    } catch {
      // `navigator.clipboard` needs a secure context — fine on localhost and
      // HTTPS, unavailable over a plain-http LAN address. Say so rather than
      // failing silently; the text is right there to select by hand.
      setCopyState('failed')
    }
  }

  return (
    <div className="share-box">
      <textarea
        className="share-box-text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        // Sized to the text so the whole post — the trailing link especially,
        // which is the point of the box — is visible without scrolling. The
        // spare rows absorb long lines that wrap in a narrow card.
        rows={draft.split('\n').length + 3}
        aria-label="טקסט לשיתוף"
      />
      <div className="share-box-actions">
        <button type="button" className="btn btn-outline" onClick={handleCopy}>
          {copyState === 'copied' ? 'הועתק ✓' : 'העתקה'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(draft)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          שיתוף בוואטסאפ ↗
        </a>
      </div>
      {copyState === 'failed' && (
        <p className="share-box-error">ההעתקה נכשלה — אפשר לסמן את הטקסט ולהעתיק ידנית.</p>
      )}
    </div>
  )
}

export default ShareBox
