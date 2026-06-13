import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setupFetchInterceptor } from './utils/session'
import App from './App.tsx'

setupFetchInterceptor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
