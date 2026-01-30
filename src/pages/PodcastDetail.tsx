import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
} from 'react-share';
import type { Podcast, Episode } from '../types/podcast';
import { getApiUrl } from '../services/api';
import './PodcastDetail.css';

const PodcastDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<{ id: number } | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadPodcastDetails();
      if (user) {
        checkIfFavorite();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const loadPodcastDetails = async () => {
    setLoading(true);
    try {
      // Fetch podcast details
      const podcastRes = await fetch(getApiUrl(`/podcasts/${id}`));
      if (!podcastRes.ok) throw new Error('Failed to load podcast');
      const podcastData = await podcastRes.json();
      setPodcast(podcastData);

      // Fetch episodes
      const episodesRes = await fetch(getApiUrl(`/podcasts/${id}/episodes`));
      if (!episodesRes.ok) throw new Error('Failed to load episodes');
      const episodesData = await episodesRes.json();
      setEpisodes(episodesData);
    } catch (err) {
      setError('Failed to load podcast details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!user || !id) return;
    try {
      const res = await fetch(getApiUrl(`/favorites/${user.id}/${id}/check`));
      const data = await res.json();
      setIsFavorite(data.isFavorite);
    } catch (err) {
      console.error('Failed to check favorite status:', err);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !id) {
      alert('Please log in to add favorites');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await fetch(getApiUrl(`/favorites/${user.id}/${id}`), {
          method: 'DELETE'
        });
        setIsFavorite(false);
      } else {
        await fetch(getApiUrl('/favorites'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, podcastId: parseInt(id) })
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('Failed to update favorites');
    }
  };

  const handlePlayEpisode = async (episode: Episode) => {
    // Add to queue and play
    try {
      await fetch(getApiUrl('/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: episode.id, userId: 1 }) // TODO: Use actual user ID
      });
      // Trigger audio player to play this episode
      window.dispatchEvent(new CustomEvent('playEpisode', { detail: episode }));
    } catch (err) {
      console.error('Failed to play episode:', err);
    }
  };

  const handleAddToQueue = async (episode: Episode) => {
    try {
      await fetch(getApiUrl('/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: episode.id, userId: 1 }) // TODO: Use actual user ID
      });
      alert('Added to queue!');
    } catch (err) {
      console.error('Failed to add to queue:', err);
      alert('Failed to add to queue');
    }
  };

  const handleDownloadTranscript = async (episode: Episode) => {
    if (!episode.transcript_url) {
      alert('Transcript not available for this episode');
      return;
    }

    try {
      const response = await fetch(episode.transcript_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${episode.title}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download transcript:', err);
      alert('Failed to download transcript');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shareUrl = window.location.href;
  const shareTitle = podcast ? `Check out ${podcast.title}!` : 'Check out this podcast!';

  if (loading) {
    return <div className="podcast-detail-loading">Loading podcast details...</div>;
  }

  if (error || !podcast) {
    return (
      <div className="podcast-detail-error">
        <p>{error || 'Podcast not found'}</p>
        <button onClick={() => navigate('/profile')}>Back to My Library</button>
      </div>
    );
  }

  return (
    <div className="podcast-detail">
      <button className="back-button" onClick={() => navigate('/profile')}>
        ← Back to My Library
      </button>

      <div className="podcast-header">
        {podcast.image_url && (
          <img src={podcast.image_url} alt={podcast.title} className="podcast-cover" />
        )}
        <div className="podcast-info">
          <div className="title-row">
            <h1>{podcast.title}</h1>
            <button 
              onClick={toggleFavorite} 
              className={`btn-favorite ${isFavorite ? 'favorited' : ''}`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </button>
          </div>
          {podcast.author && <p className="author">by {podcast.author}</p>}
          <span className="category-badge">{podcast.category}</span>
          {podcast.description && (
            <p className="description">{podcast.description}</p>
          )}
          
          <div className="share-buttons">
            <p>Share this podcast:</p>
            <FacebookShareButton url={shareUrl} hashtag={`#${podcast.category}`}>
              <FacebookIcon size={32} round />
            </FacebookShareButton>
            <TwitterShareButton url={shareUrl} title={shareTitle} hashtags={[podcast.category]}>
              <TwitterIcon size={32} round />
            </TwitterShareButton>
          </div>
        </div>
      </div>

      <div className="episodes-section">
        <div className="episodes-header">
          <h2>Episodes ({episodes.length})</h2>
          <div className="sort-filter">
            <label>Sort by:</label>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
        {episodes.length === 0 ? (
          <p className="no-episodes">No episodes available yet. Check back later!</p>
        ) : (
          <div className="episodes-list">
            {[...episodes]
              .sort((a, b) => {
                const dateA = new Date(a.published_date || 0).getTime();
                const dateB = new Date(b.published_date || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
              })
              .map((episode) => (
              <div key={episode.id} className="episode-item">
                <div className="episode-info">
                  <h3>{episode.title}</h3>
                  <div className="episode-meta">
                    <span>{formatDate(episode.published_date)}</span>
                    <span>•</span>
                    <span>{formatDuration(episode.duration)}</span>
                  </div>
                  {episode.description && (
                    <p className="episode-description">{episode.description}</p>
                  )}
                </div>
                <div className="episode-actions">
                  <button onClick={() => handlePlayEpisode(episode)} className="btn-play">
                    ▶ Play
                  </button>
                  <button onClick={() => handleAddToQueue(episode)} className="btn-add-queue">
                    + Queue
                  </button>
                  {episode.transcript_url && (
                    <button onClick={() => handleDownloadTranscript(episode)} className="btn-transcript">
                      📄 Transcript
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastDetail;
