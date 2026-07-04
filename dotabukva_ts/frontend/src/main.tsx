import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// styles are embedded in index.html for 1:1 fidelity with original (Tailwind CDN + custom tavern CSS)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
