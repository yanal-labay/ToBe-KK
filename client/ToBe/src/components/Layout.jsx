import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navbar from './Navbar'
import AdminTopbar from './AdminTopbar'
import { useAdminSession } from '../hooks/useAdminSession'
import { NAV_LINKS, ADMIN_NAV_LINKS } from '../navConfig'
import './Layout.css'

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
