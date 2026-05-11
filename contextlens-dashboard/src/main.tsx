import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { AppRouter } from './routes'
import { AuthProvider } from './context/AuthContext'
import { OfflineBanner } from './components/OfflineBanner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OfflineBanner />
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>,
)
