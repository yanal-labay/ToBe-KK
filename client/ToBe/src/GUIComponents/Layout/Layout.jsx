import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navbar from './Navbar'
import AdminTopbar from './AdminTopbar'
import { useAdminSession } from '../../hooks/useAdminSession'
import { NAV_LINKS, ADMIN_NAV_LINKS } from '../../navConfig'
import './Layout.css'

/**
 * The single shared chrome for (almost) every route in the app — see
 * App.jsx. Which header/navbar renders is decided purely by the admin
 * session, not by the URL: an authenticated admin sees `AdminTopbar` +
 * `ADMIN_NAV_LINKS` on the exact same routes a guest sees `Header` +
 * `NAV_LINKS` on. This is what keeps the admin chrome (and the "אזור ניהול"
 * badge) visible when an admin clicks a public nav link like אירועים,
 * instead of dropping them into a different guest-only layout.
 */
function Layout() {
  const { isAdmin } = useAdminSession()

  return (
    <div dir="rtl" lang="he">
      <div className="site-topbar">
        {isAdmin ? <AdminTopbar /> : <Header />}
        <Navbar links={isAdmin ? ADMIN_NAV_LINKS : NAV_LINKS} />
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
