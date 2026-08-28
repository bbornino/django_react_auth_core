import { Routes, Route } from 'react-router'
import { Welcome } from './pages/welcome-page'
import { NavBar } from './components/nav-bar'

function App() {
  return (
    <div>
      <NavBar />

      <Routes>
        <Route path="/" element={<Welcome /> } />
      </Routes>
    </div>

  )
}

export default App
