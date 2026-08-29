import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { AuthBootstrap } from './components/auth-bootstrap.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </BrowserRouter>
  </StrictMode>,
)
