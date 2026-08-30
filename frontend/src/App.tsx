import { Routes, Route } from 'react-router'
import { ProtectedRoute } from './components/protected-route'
import { Welcome } from './pages/welcome-page'
import { RegisterPage} from './pages/register-page'
import { Dashboard } from './pages/dashboard-page'
import { NavBar } from './components/nav-bar'
import { LoginPage } from './pages/login-page'
import { EditUserPage } from './pages/edit-user-page'

function App() {
  return (
    <div>
      <NavBar />

      <Routes>
        <Route path="/" element={<Welcome /> } />
        <Route path="/register" element={<RegisterPage /> } />
        <Route path="/login" element={<LoginPage /> } />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard /> } />
          <Route path="/edit-profile" element={<EditUserPage /> } />
        </Route>
      </Routes>
    </div>

  )
}

export default App
