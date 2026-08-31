import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminSessionProvider } from './hooks/useAdminSession'
import { ActivityProvider } from './hooks/useActivity'
import './index.css'
import App from './App.jsx'

// AdminSessionProvider wraps the whole app (inside the router, since it
// doesn't need routing) so every page/component reads the same session
// state via useAdminSession() — see hooks/useAdminSession.jsx.
//
// ActivityProvider sits inside it (it reads isAdmin) and gives the topbar
// bell and the /admin/activity tree one shared view of what is unread, so
// clearing a notification in either place updates the other.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminSessionProvider>
        <ActivityProvider>
          <App />
        </ActivityProvider>
      </AdminSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
