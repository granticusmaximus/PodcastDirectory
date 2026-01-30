import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Podcast, ListeningHistory, Episode } from '../types/podcast';
import PodcastCard from '../components/PodcastCard';
import { getApiUrl } from '../services/api';
import './Profile.css';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  twitter_handle?: string;
  facebook_id?: string;
  instagram_handle?: string;
}

interface EnrichedListeningHistory extends ListeningHistory {
  episode?: Episode;
  last_listened_at?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [favorites, setFavorites] = useState<Podcast[]>([]);
  const [listeningHistory, setListeningHistory] = useState<EnrichedListeningHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'favorites' | 'history'>('library');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    twitter_handle: '',
    facebook_id: '',
    instagram_handle: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setEditForm({
      display_name: parsedUser.display_name || '',
      avatar_url: parsedUser.avatar_url || '',
      bio: parsedUser.bio || '',
      twitter_handle: parsedUser.twitter_handle || '',
      facebook_id: parsedUser.facebook_id || '',
      instagram_handle: parsedUser.instagram_handle || ''
    });
    loadProfileData(parsedUser.id);
  }, [navigate]);

  // Reload data when returning to profile page
  useEffect(() => {
    if (user) {
      loadProfileData(user.id);
    }
  }, [activeTab]);

  const loadProfileData = async (userId: number) => {
    setLoading(true);
    try {
      // Load all podcasts in library
      const podcastsResponse = await fetch(getApiUrl('/podcasts'));
      const podcastsData = await podcastsResponse.json();
      setPodcasts(podcastsData);

      // Load favorites
      const favResponse = await fetch(getApiUrl(`/favorites/${userId}`));
      const favData = await favResponse.json();
      setFavorites(favData);

      // Load listening history
      const historyResponse = await fetch(getApiUrl(`/history/${userId}`));
      const historyData = await historyResponse.json();
      setListeningHistory(historyData);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch event to update App navigation
    window.dispatchEvent(new Event('userAuthenticated'));
    
    navigate('/login');
  };

  const handleEditToggle = () => {
    if (isEditing && user) {
      // Reset form if canceling
      setEditForm({
        display_name: user.display_name || '',
        avatar_url: user.avatar_url || '',
        bio: user.bio || '',
        twitter_handle: user.twitter_handle || '',
        facebook_id: user.facebook_id || '',
        instagram_handle: user.instagram_handle || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setEditForm({ ...editForm, avatar_url: base64 });
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setEditForm({ ...editForm, avatar_url: '' });
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const url = getApiUrl(`/users/${user.id}`);
      console.log('Calling PUT:', url, 'with data:', editForm);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      const updatedUser = data.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch event to update navigation
      window.dispatchEvent(new Event('userAuthenticated'));
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handlePlayEpisode = async (item: EnrichedListeningHistory) => {
    if (!item.episode) return;

    try {
      // Add to queue
      await fetch(getApiUrl('/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: item.episode.id, userId: user?.id || 1 })
      });

      // Trigger audio player to play this episode
      window.dispatchEvent(new CustomEvent('playEpisode', { detail: item.episode }));
    } catch (err) {
      console.error('Failed to play episode:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          {isEditing ? (
            <div className="profile-edit-form">
              <div className="edit-avatar-section">
                <div className="profile-avatar-large">
                  {editForm.avatar_url ? (
                    <img src={editForm.avatar_url} alt="Preview" />
                  ) : (
                    <div className="avatar-placeholder">
                      {editForm.display_name.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="avatar-upload-controls">
                  <label className="upload-btn">
                    <i className="bi bi-camera-fill"></i>
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {editForm.avatar_url && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={handleRemoveImage}
                    >
                      <i className="bi bi-trash-fill"></i>
                      Remove
                    </button>
                  )}
                  <p className="upload-hint">JPG, PNG or GIF (max 2MB)</p>
                </div>
              </div>

              <div className="edit-field">
                <label>Display Name</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>

              <div className="edit-field">
                <label>Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="social-links-edit">
                <h3>Social Media Links</h3>
                <div className="edit-field">
                  <label><i className="bi bi-twitter"></i> Twitter Handle</label>
                  <input
                    type="text"
                    value={editForm.twitter_handle}
                    onChange={(e) => setEditForm({ ...editForm, twitter_handle: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div className="edit-field">
                  <label><i className="bi bi-facebook"></i> Facebook ID</label>
                  <input
                    type="text"
                    value={editForm.facebook_id}
                    onChange={(e) => setEditForm({ ...editForm, facebook_id: e.target.value })}
                    placeholder="your.profile.id"
                  />
                </div>
                <div className="edit-field">
                  <label><i className="bi bi-instagram"></i> Instagram Handle</label>
                  <input
                    type="text"
                    value={editForm.instagram_handle}
                    onChange={(e) => setEditForm({ ...editForm, instagram_handle: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button onClick={handleSaveProfile} className="btn-save">
                  <i className="bi bi-check-circle"></i> Save Changes
                </button>
                <button onClick={handleEditToggle} className="btn-cancel">
                  <i className="bi bi-x-circle"></i> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name} />
                ) : (
                  <div className="avatar-placeholder">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-details">
                <h1>{user.display_name}</h1>
                <p className="profile-username">@{user.username}</p>
                <p className="profile-email">{user.email}</p>
                {user.bio && <p className="profile-bio">{user.bio}</p>}
                {(user.twitter_handle || user.facebook_id || user.instagram_handle) && (
                  <div className="social-links">
                    {user.twitter_handle && (
                      <a href={`https://twitter.com/${user.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="social-link">
                        <i className="bi bi-twitter"></i>
                      </a>
                    )}
                    {user.facebook_id && (
                      <a href={`https://facebook.com/${user.facebook_id}`} target="_blank" rel="noopener noreferrer" className="social-link">
                        <i className="bi bi-facebook"></i>
                      </a>
                    )}
                    {user.instagram_handle && (
                      <a href={`https://instagram.com/${user.instagram_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="social-link">
                        <i className="bi bi-instagram"></i>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="header-actions">
          {!isEditing && (
            <button onClick={handleEditToggle} className="btn-edit">
              <i className="bi bi-pencil"></i> Edit Profile
            </button>
          )}
          <button onClick={handleLogout} className="btn-logout">
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <i className="bi bi-collection"></i>
          All Podcasts ({podcasts.length})
        </button>
        <button
          className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <i className="bi bi-heart-fill"></i>
          Favorites ({favorites.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="bi bi-clock-history"></i>
          Listening History
        </button>
      </div>

      <div className="profile-content">
        {loading ? (
          <div className="loading">Loading your library...</div>
        ) : activeTab === 'library' ? (
          <div className="library-section">
            {podcasts.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-inbox"></i>
                <h2>No Podcasts Yet</h2>
                <p>Start by discovering and adding podcasts</p>
                <button onClick={() => navigate('/')} className="btn-search">
                  Discover Podcasts
                </button>
              </div>
            ) : (
              <div className="podcasts-grid">
                {podcasts.map((podcast) => (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    isInLibrary={true}
                    onView={() => podcast.id && navigate(`/podcast/${podcast.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'favorites' ? (
          <div className="favorites-section">
            {favorites.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-heart"></i>
                <h2>No Favorites</h2>
                <p>Mark podcasts as favorites to see them here</p>
              </div>
            ) : (
              <div className="podcasts-grid">
                {favorites.map((podcast) => (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    isInLibrary={true}
                    onView={() => podcast.id && navigate(`/podcast/${podcast.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="history-section">
            {listeningHistory.length === 0 ? (
              <div className="empty-state">
                <p>No listening history yet</p>
                <p className="empty-subtitle">
                  Your listening history will appear here as you play episodes
                </p>
              </div>
            ) : (
              <div className="history-list">
                {listeningHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="history-item"
                  >
                    <div className="history-content">
                      <div 
                        className="history-info clickable"
                        onClick={() => {
                          if (item.episode?.podcast_id) {
                            navigate(`/podcast/${item.episode.podcast_id}`);
                          }
                        }}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <h3 className="history-title">{item.episode?.title}</h3>
                        <p className="history-podcast">Podcast ID: {item.episode?.podcast_id}</p>
                        <div className="history-meta">
                          <span>{formatDate(item.last_listened_at!)}</span>
                          {item.progress && item.episode?.duration && (
                            <span className="history-progress">
                              {formatDuration(item.progress)} / {formatDuration(item.episode.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="btn-play-history"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayEpisode(item);
                        }}
                        title="Play episode"
                      >
                        <i className="bi bi-play-circle-fill"></i>
                      </button>
                    </div>
                    {item.progress && item.episode?.duration && (
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          data-progress={Math.round((item.progress / item.episode.duration) * 100)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
