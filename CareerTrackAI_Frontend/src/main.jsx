import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

const storedTheme = localStorage.getItem('careertrack_theme') || 'System'
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', storedTheme === 'Dark' || (storedTheme === 'System' && prefersDark))
document.documentElement.classList.add('bg-slate-50', 'overscroll-none', 'dark:bg-slate-950')
document.body.className = 'min-h-screen min-w-80 bg-slate-50 font-sans text-slate-900 antialiased overscroll-none dark:bg-slate-950 dark:text-slate-100'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
