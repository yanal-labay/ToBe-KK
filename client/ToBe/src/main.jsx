import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminSessionProvider } from './hooks/useAdminSession'
import './index.css'
import App from './App.jsx'

// AdminSessionProvider wraps the whole app (inside the router, since it
// doesn't need routing) so every page/component reads the same session
// state via useAdminSession() — see hooks/useAdminSession.jsx.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminSessionProvider>
        <App />
      </AdminSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
