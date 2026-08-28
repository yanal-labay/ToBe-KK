import { useEffect, useMemo, useRef, useState } from 'react'
import { resolvePhotoUrl } from '../../utils/photoUrl'
import './PhotoCarousel.css'

const ROTATE_INTERVAL_MS = 5000

/**
 * The home page's single rotating-photo box. Renders every photo from
 * `GET /api/home`, oldest first (originally seeded with the two launch
 * photos, migrated into this same collection so there's nothing hardcoded
 * left to special-case). Auto-advances on a timer, with manual prev/next
 * arrows and dot indicators that reset it.
 *
 * @param {{
 *   photos: Array<{_id: string, photoUrl: string}>,
 *   isAdmin: boolean,
 *   onAddPhoto: (file: File) => Promise<void>,
 *   onDeletePhoto: (photo: {_id: string, photoUrl: string}) => Promise<void>,
 * }} props
 */
function PhotoCarousel({ photos, isAdmin, onAddPhoto, onDeletePhoto }) {
  const slides = useMemo(
    () => photos.map((photo) => ({ src: resolvePhotoUrl(photo.photoUrl), photo })),
    [photos]
  )

  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)

  // Clamp the index if the slide count shrinks (e.g. a photo gets deleted
  // while it's showing) so it never points past the end of the array.
  useEffect(() => {
    setIndex((current) => (current >= slides.length ? 0 : current))
  }, [slides.length])

  const resetTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, ROTATE_INTERVAL_MS)
  }

  useEffect(() => {
    if (slides.length <= 1) return undefined
    resetTimer()
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length])

  const goTo = (nextIndex) => {
    setIndex((nextIndex + slides.length) % slides.length)
    if (slides.length > 1) resetTimer()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await onAddPhoto(file)
  }

  return (
    <div className="photo-carousel">
      {slides.map((slide, i) => (
        <img
          key={slide.photo._id}
          src={slide.src}
          alt=""
          className={`photo-carousel-slide ${i === index ? 'is-active' : ''}`}
        />
      ))}

      {slides.length > 1 && (
        <>
          <button type="button" className="photo-carousel-arrow is-prev" onClick={() => goTo(index - 1)} aria-label="תמונה קודמת">
            ‹
          </button>
          <button type="button" className="photo-carousel-arrow is-next" onClick={() => goTo(index + 1)} aria-label="תמונה הבאה">
            ›
          </button>
          <div className="photo-carousel-dots">
            {slides.map((slide, i) => (
              <span className="photo-carousel-dot-wrapper" key={slide.photo._id}>
                <button
                  type="button"
                  className={`photo-carousel-dot ${i === index ? 'is-active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`תמונה ${i + 1}`}
                />
                {isAdmin && (
                  <button
                    type="button"
                    className="photo-carousel-dot-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePhoto(slide.photo)
                    }}
                    aria-label={`מחיקת תמונה ${i + 1}`}
                    title="מחיקת תמונה"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <label className="photo-carousel-add btn btn-primary">
          + הוספת תמונה
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
      )}
    </div>
  )
}

export default PhotoCarousel
