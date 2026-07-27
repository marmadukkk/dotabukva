import React from 'react'
import ReactDOM from 'react-dom/client'

// Self-contained assets (no CDN) — required for Electron offline packaging
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'

import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
