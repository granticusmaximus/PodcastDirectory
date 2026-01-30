import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Search from './pages/Search'
import Discover from './pages/Discover'
import PodcastDetail from './pages/PodcastDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Welcome from './pages/Welcome'
import Profile from './pages/Profile'
import AudioPlayer from './components/AudioPlayer'
import Queue from './components/Queue'
import './App.css'

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

function App() {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Listen for authentication events
    const handleAuthChange = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    };

    window.addEventListener('userAuthenticated', handleAuthChange);
    return () => window.removeEventListener('userAuthenticated', handleAuthChange);
  }, []);

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-content">
            <Link to="/" className="logo-link">
              <img src="/favicon.svg" alt="GWS Podcasts" className="logo-icon" />
              <h1 className="logo">GWS Podcast Directory</h1>
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Search</Link>
              {user ? (
                <Link to="/profile" className="nav-link user-greeting">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className="nav-avatar" />
                  ) : (
                    <div className="nav-avatar-placeholder">
                      {user.display_name.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>Hey, {user.display_name}</span>
                </Link>
              ) : (
                <Link to="/login" className="nav-link btn-login">
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Search />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/podcast/:id" element={<PodcastDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <AudioPlayer onQueueOpen={() => setIsQueueOpen(true)} />
        <Queue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      </div>
    </Router>
  )
}

export default App
