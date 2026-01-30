import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  
  const user: User | null = useMemo(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="auth-container">
      <div className="auth-card welcome-card">
        <div className="welcome-icon">🎉</div>
        <h1>Welcome to Podcast Directory!</h1>
        <p className="welcome-message">
          Your account has been successfully created.
        </p>
        
        <div className="welcome-info">
          <div className="welcome-detail">
            <span className="welcome-label">Username:</span>
            <span className="welcome-value">@{user.username}</span>
          </div>
          <div className="welcome-detail">
            <span className="welcome-label">Display Name:</span>
            <span className="welcome-value">{user.display_name}</span>
          </div>
        </div>

        <div className="welcome-actions">
          <Link to="/profile" className="btn-primary">
            Go to My Profile
          </Link>
          <Link to="/" className="btn-secondary">
            Start Exploring Podcasts
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
