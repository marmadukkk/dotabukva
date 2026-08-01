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

/** Prevent a single render crash from leaving a blank white page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#e0d2b0',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#d4af37', fontSize: 20, fontWeight: 700 }}>
            DOTA-BUKVA
          </div>
          <div style={{ maxWidth: 420, fontSize: 14, lineHeight: 1.5, color: '#aaa' }}>
            Ошибка загрузки интерфейса. Попробуй сбросить локальные данные.
          </div>
          <pre
            style={{
              maxWidth: 520,
              overflow: 'auto',
              fontSize: 11,
              color: '#c23c2a',
              background: '#111',
              padding: 12,
              borderRadius: 8,
              textAlign: 'left',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              height: 40,
              padding: '0 20px',
              borderRadius: 10,
              border: '1px solid #d4af37',
              background: '#c23c2a',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => {
              try {
                localStorage.removeItem('dota_bukva_nav');
              } catch {}
              window.location.href = '/';
            }}
          >
            Сбросить и перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
