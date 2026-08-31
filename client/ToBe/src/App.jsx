import { Routes, Route } from 'react-router-dom'
import Layout from './GUIComponents/Layout/Layout'
import Home from './components/HomeManager/Home'
import Events from './components/EventsManager/Events'
import Scholarships from './components/ScholarshipsManager/Scholarships'
import Jobs from './components/JobsManager/Jobs'
import Schedule from './components/ScheduleManager/Schedule'
import Contact from './components/ContactManager/Contact'
import Links from './components/LinksManager/Links'
import StudentRegistry from './components/RegistryManager/StudentRegistry'
import StyleGuide from './GUIComponents/Screens/StyleGuide'
import PlaceholderPage from './GUIComponents/Screens/PlaceholderPage'
import NotFound from './GUIComponents/Screens/NotFound'
import AdminLogin from './components/UsersManager/AdminLogin'
import AdminActivity from './components/ActivityManager/AdminActivity'
import './styles/components.css'

/**
 * Route tree. Nearly every route (including public pages like /events)
 * shares one <Layout/>, which decides its own chrome (guest vs. admin) from
 * the session context — see useAdminSession.jsx and Layout.jsx. There is no
 * separate admin dashboard route: an authenticated admin sees the same "/"
 * as everyone else, just with admin-only controls layered on (see Home.jsx).
 * Only /admin/login sits outside Layout, since it needs no chrome ambiguity
 * for anonymous visitors.
 *
 * The trailing `path="*"` is nested inside Layout like the rest: an unmatched
 * URL used to match nothing at all, which meant Layout didn't render either
 * and the visitor got a blank page with no way to navigate away.
 */
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/scholarships" element={<Scholarships />} />
        <Route path="/events" element={<Events />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/links" element={<Links />} />
        <Route path="/student-registry" element={<StudentRegistry />} />
        <Route path="/appointment" element={<PlaceholderPage title="בקשה לתאום פגישה" />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/style-guide" element={<StyleGuide />} />
        {/* Inside Layout so it gets the admin chrome — unlike
            /admin/login, which sits outside precisely because it must not.
            The page guards itself on session status; the API enforces it. */}
        <Route path="/admin/activity" element={<AdminActivity />} />

        {/* Catch-all for unknown URLs. Inside Layout on purpose — see NotFound.jsx */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Login page has its own standalone chrome, deliberately outside Layout */}
      <Route path="/admin/login" element={<AdminLogin />} />
    </Routes>
  )
}

export default App
