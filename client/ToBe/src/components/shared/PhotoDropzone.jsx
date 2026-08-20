import { useEffect, useState } from 'react'
import { API_URL } from '../../apiConfig'
import './PhotoDropzone.css'

/**
 * Reusable optional-photo picker for a create/edit form (used by both
 * `EventForm` and `ScholarshipForm`): supports drag-and-drop and
 * click-to-choose, and previews whichever image is currently relevant —
 * a freshly picked file, or the item's existing photo when editing.
 *
 * The parent form owns `photoFile` itself (it needs the raw `File` for its
 * `FormData` submit); this component only owns the drag/preview UI and
 * reports a new selection via `onSelect`.
 *
 * @param {{
 *   photoFile: File|null,
 *   existingPhotoUrl?: string|null,
 *   onSelect: (file: File) => void,
 * }} props
 */
function PhotoDropzone({ photoFile, existingPhotoUrl, onSelect }) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)

  // Derives (and cleans up) an object-URL preview whenever the selected
  // file changes — object URLs must be revoked manually or they leak for
  // the page's lifetime.
  useEffect(() => {
    if (!photoFile) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  return (
    <>
      <img
        src={preview || (existingPhotoUrl ? `${API_URL}${existingPhotoUrl}` : undefined)}
        alt=""
        className="photo-preview"
        hidden={!preview && !existingPhotoUrl}
      />
      <div
        className={`photo-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) onSelect(file)
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onSelect(file)
          }}
        />
        <p className="photo-dropzone-hint">
          {photoFile ? photoFile.name : 'גררו תמונה לכאן או לחצו לבחירה'}
        </p>
      </div>
    </>
  )
}

export default PhotoDropzone
