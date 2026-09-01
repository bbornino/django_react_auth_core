import { Routes, Route } from 'react-router'
import { ProtectedRoute } from './components/protected-route'
import { Welcome } from './pages/welcome-page'
import { RegisterPage} from './pages/register-page'
import { Dashboard } from './pages/dashboard-page'
import { NavBar } from './components/nav-bar'
import { LoginPage } from './pages/login-page'
import { EditUserPage } from './pages/edit-user-page'
import { GoogleCallbackPage } from './pages/google-callback-page'
import { useThemeSync } from './hooks/use-theme-sync'
import { ListUsersPage } from './pages/list-users-page'

function App() {
  useThemeSync()
  return (
    <div>
      <NavBar />

      <Routes>
        <Route path="/" element={<Welcome /> } />
        <Route path="/register" element={<RegisterPage /> } />
        <Route path="/login" element={<LoginPage /> } />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage /> } />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard /> } />
          <Route path="/edit-profile" element={<EditUserPage /> } />
          <Route path="/edit-profile/:userId" element={<EditUserPage /> } />
          <Route path="/list-users" element={<ListUsersPage /> } />
        </Route>
      </Routes>
    </div>

  )
}

export default App
