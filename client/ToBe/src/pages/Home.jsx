import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'
import { useCalendarView } from '../hooks/useCalendarView'
import { getHome, saveHomeContent, saveHomeCaption, addHomePhoto, deleteHomePhoto } from '../services/homeService'
import { getScheduleEntries, getScheduleCategories } from '../services/scheduleService'
import PhotoCarousel from '../components/home/PhotoCarousel'
import HomeContentEditor from '../components/home/HomeContentEditor'
import QuickLinks from '../components/home/QuickLinks'
import Calendar from '../components/schedule/Calendar'
import './Home.css'

/**
 * The shared home page at "/" — the same page for guests and admins (see
 * Layout.jsx, which picks guest vs admin chrome around it but never a
 * different page). Admins get extra edit affordances layered directly onto
 * this page (adding/removing carousel photos, editing the title/body text
 * above the carousel and the independent caption title/text below it, via
 * two `HomeContentEditor` instances) rather than a separate admin-only
 * view, matching the Events/Scholarships/Jobs pattern used everywhere else
 * in this app.
 */
function Home() {
  const { isAdmin } = useAdminSession()

  const [home, setHome] = useState({ title: '', body: '', captionTitle: '', captionText: '', photos: [] })
  const [homeLoadState, setHomeLoadState] = useState('loading') // loading | ready | error

  const [scheduleEntries, setScheduleEntries] = useState([])
  const [scheduleCategories, setScheduleCategories] = useState([])

  // This preview always opens on a short range regardless of what the
  // /schedule page has saved — a whole month is too dense to read at this
  // size — and switching it here stays local to the visit rather than
  // changing what /schedule opens with. On a phone `useCalendarView` returns
  // 'agenda' instead, which this renders as a short upcoming list.
  const { viewType, selectViewType, anchor, handlePrev, handleNext, handleToday } = useCalendarView({
    persist: false,
    defaultViewType: 'sevenDay',
  })

  const loadHome = () => {
    setHomeLoadState('loading')
    getHome()
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        setHome(data)
        setHomeLoadState('ready')
      })
      .catch(() => setHomeLoadState('error'))
  }

  const loadSchedule = () => {
    getScheduleEntries()
      .then((res) => (res.ok ? res.json() : []))
      .then(setScheduleEntries)
      .catch(() => {})
    getScheduleCategories()
      .then((res) => (res.ok ? res.json() : []))
      .then(setScheduleCategories)
      .catch(() => {})
  }

  useEffect(() => {
    loadHome()
    loadSchedule()
  }, [])

  const handleSaveContent = async (values) => {
    const res = await saveHomeContent(values)
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setHome((current) => ({ ...current, title: data.content.title, body: data.content.body }))
  }

  const handleSaveCaption = async (values) => {
    const res = await saveHomeCaption({ captionTitle: values.title, captionText: values.body })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setHome((current) => ({
      ...current,
      captionTitle: data.content.captionTitle,
      captionText: data.content.captionText,
    }))
  }

  const handleAddPhoto = async (file) => {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await addHomePhoto(formData)
    const data = await res.json()
    if (!data.success) return
    loadHome()
  }

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('למחוק את התמונה?')) return
    const res = await deleteHomePhoto(photo._id)
    const data = await res.json()
    if (!data.success) return
    loadHome()
  }

  return (
    <div className="home-page">
      {homeLoadState === 'loading' && <p className="home-loading">טוען תוכן...</p>}
      {homeLoadState === 'error' && <p className="home-error">לא ניתן לטעון את תוכן העמוד כרגע</p>}
      {homeLoadState === 'ready' && (
        <HomeContentEditor
          title={home.title}
          body={home.body}
          isAdmin={isAdmin}
          onSave={handleSaveContent}
        />
      )}

      <PhotoCarousel
        photos={home.photos}
        isAdmin={isAdmin}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDeletePhoto}
      />

      {homeLoadState === 'ready' && (
        <HomeContentEditor
          title={home.captionTitle}
          body={home.captionText}
          isAdmin={isAdmin}
          onSave={handleSaveCaption}
          headingTag="h2"
          className="home-content home-content-caption"
          required={false}
        />
      )}

      <div>
        <h2 className="home-section-title">קיצורי דרך</h2>
        <QuickLinks />
      </div>

      <div className="home-schedule-preview">
        <h2 className="home-section-title">לוח זמנים</h2>
        <Calendar
          entries={scheduleEntries}
          categories={scheduleCategories}
          isAdmin={isAdmin}
          anchor={anchor}
          viewType={viewType}
          onSelectViewType={selectViewType}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          compact
        />
        <Link to="/schedule" className="btn btn-outline home-schedule-preview-link">
          לוח הזמנים המלא ↗
        </Link>
      </div>
    </div>
  )
}

export default Home
