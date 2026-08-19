import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import StyleGuide from './pages/StyleGuide'
import PlaceholderPage from './pages/PlaceholderPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import RequireAdminAuth from './components/admin/RequireAdminAuth'
import AdminLayout from './components/admin/AdminLayout'
import './styles/components.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/scholarships" element={<PlaceholderPage title="מלגות" />} />
        <Route path="/events" element={<PlaceholderPage title="אירועים" />} />
        <Route path="/schedule" element={<PlaceholderPage title="לוח זמנים" />} />
        <Route path="/jobs" element={<PlaceholderPage title="לוח משרות" />} />
        <Route path="/links" element={<PlaceholderPage title="לינקים שימושיים" />} />
        <Route
          path="/student-registry"
          element={<PlaceholderPage title="רישום למאגר הסטודנטים" />}
        />
        <Route path="/appointment" element={<PlaceholderPage title="בקשה לתאום פגישה" />} />
        <Route path="/contact" element={<PlaceholderPage title="צרו קשר" />} />
        <Route path="/style-guide" element={<StyleGuide />} />
      </Route>

      {/* Admin routes: no link from the public nav, reached only by direct URL */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<RequireAdminAuth />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
