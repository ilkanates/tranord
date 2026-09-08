import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installFatalHandler, showFatal, ErrorBoundary } from './ErrorScreen.jsx'

installFatalHandler()

const root = createRoot(document.getElementById('root'))

// App DİNAMİK import: modül yüklenirken atılan bir hata (TDZ, eksik export…)
// böylece .catch'e düşüp ekranda görünür — siyah ekranda kalmaz.
import('./App.jsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  })
  .catch(showFatal)
