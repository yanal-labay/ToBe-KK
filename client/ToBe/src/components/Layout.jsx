import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navbar from './Navbar'
import './Layout.css'

function Layout() {
  return (
    <div dir="rtl" lang="he">
      <div className="site-topbar">
        <Header />
        <Navbar />
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
