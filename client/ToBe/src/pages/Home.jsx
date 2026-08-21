import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'
import { API_URL } from '../apiConfig'
import PhotoCarousel from '../components/home/PhotoCarousel'
import HomeContentEditor from '../components/home/HomeContentEditor'
import QuickLinks from '../components/home/QuickLinks'
import Calendar from '../components/schedule/Calendar'
import './Home.css'

/**
 * The shared home page at "/" — the same page for guests and admins (see
 * Layout.jsx, which picks guest vs admin chrome around it but never a
 * different page). Admins get extra edit affordances layered directly onto
 * this page (adding/removing carousel photos, editing the title/body text)
 * rather than a separate admin-only view, matching the Events/Scholarships/
 * Jobs pattern used everywhere else in this app.
 */
function Home() {
  const { isAdmin } = useAdminSession()

  const [home, setHome] = useState({ title: '', body: '', photos: [] })
  const [homeLoadState, setHomeLoadState] = useState('loading') // loading | ready | error

  const [scheduleEntries, setScheduleEntries] = useState([])
  const [scheduleCategories, setScheduleCategories] = useState([])

  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const loadHome = () => {
    setHomeLoadState('loading')
    fetch(`${API_URL}/api/home`)
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
    fetch(`${API_URL}/api/schedule`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setScheduleEntries)
      .catch(() => {})
    fetch(`${API_URL}/api/schedule/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setScheduleCategories)
      .catch(() => {})
  }

  useEffect(() => {
    loadHome()
    loadSchedule()
  }, [])

  const handleSaveContent = async (values) => {
    const res = await fetch(`${API_URL}/api/home/content`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setHome((current) => ({ ...current, title: data.content.title, body: data.content.body }))
  }

  const handleAddPhoto = async (file) => {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch(`${API_URL}/api/home/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (!data.success) return
    loadHome()
  }

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('למחוק את התמונה?')) return
    const res = await fetch(`${API_URL}/api/home/photos/${photo._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!data.success) return
    loadHome()
  }

  const handlePrevMonth = () => {
    setView(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))
  }

  const handleNextMonth = () => {
    setView(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))
  }

  const handleToday = () => {
    const now = new Date()
    setView({ year: now.getFullYear(), month: now.getMonth() })
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>מרכז הצעירים כפר כמא</h1>
        <p>מקום אחד לכל מה שקורה: מלגות, אירועים, משרות ולוח זמנים למען הצעירים בכפר כמא.</p>
      </div>

      <PhotoCarousel
        photos={home.photos}
        isAdmin={isAdmin}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDeletePhoto}
      />

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
          viewYear={view.year}
          viewMonth={view.month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
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
