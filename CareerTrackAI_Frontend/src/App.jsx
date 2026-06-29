import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Applications from './pages/Applications.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Resumes from './pages/Resumes.jsx'
import Interviews from './pages/Interviews.jsx'
import AiStudio from './pages/AiStudio.jsx'
import DataHub from './pages/DataHub.jsx'
import Profile from './pages/Profile.jsx'
import Settings from './pages/Settings.jsx'
import Checkout from './pages/Checkout.jsx'
import Usage from './pages/Usage.jsx'
import Help from './pages/Help.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="ai-studio" element={<AiStudio />} />
        <Route path="data-hub" element={<DataHub />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="checkout/:planId" element={<Checkout />} />
        <Route path="usage" element={<Usage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
