import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Events from './pages/Events'
import Scholarships from './pages/Scholarships'
import StudentRegistry from './pages/StudentRegistry'
import StyleGuide from './pages/StyleGuide'
import PlaceholderPage from './pages/PlaceholderPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import RequireAdminAuth from './components/admin/RequireAdminAuth'
import './styles/components.css'

/**
 * Route tree. Nearly every route (including public pages like /events and
 * the admin dashboard) shares one <Layout/>, which decides its own chrome
 * (guest vs. admin) from the session context — see useAdminSession.jsx and
 * Layout.jsx. Only /admin/login sits outside it, since it needs no chrome
 * ambiguity for anonymous visitors.
 */
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/scholarships" element={<Scholarships />} />
        <Route path="/events" element={<Events />} />
        <Route path="/schedule" element={<PlaceholderPage title="לוח זמנים" />} />
        <Route path="/jobs" element={<PlaceholderPage title="לוח משרות" />} />
        <Route path="/links" element={<PlaceholderPage title="לינקים שימושיים" />} />
        <Route path="/student-registry" element={<StudentRegistry />} />
        <Route path="/appointment" element={<PlaceholderPage title="בקשה לתאום פגישה" />} />
        <Route path="/contact" element={<PlaceholderPage title="צרו קשר" />} />
        <Route path="/style-guide" element={<StyleGuide />} />

        {/* Admin dashboard stays inside the shared Layout so its chrome matches every other page */}
        <Route element={<RequireAdminAuth />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Login page has its own standalone chrome, deliberately outside Layout */}
      <Route path="/admin/login" element={<AdminLogin />} />
    </Routes>
  )
}

export default App
