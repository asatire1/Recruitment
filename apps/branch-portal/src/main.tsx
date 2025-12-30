import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Register service worker for PWA
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update prompt to user if needed
    if (confirm('New version available. Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
