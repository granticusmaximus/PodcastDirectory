import React, { useState, useEffect, useRef } from 'react';
import type { Episode } from '../types/podcast';
import { getApiUrl } from '../services/api';
import './AudioPlayer.css';

interface AudioPlayerProps {
  onQueueOpen: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onQueueOpen }) => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [podcastImage, setPodcastImage] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Listen for play episode events
    const handlePlayEpisode = async (event: Event) => {
      const customEvent = event as CustomEvent<Episode>;
      const episode = customEvent.detail;
      setCurrentEpisode(episode);
      setIsPlaying(true);

      // Fetch podcast details to get image
      if (episode.podcast_id) {
        try {
          const response = await fetch(getApiUrl(`/podcasts/${episode.podcast_id}`));
          const podcast = await response.json();
          setPodcastImage(podcast.image_url || '');
        } catch (err) {
          console.error('Failed to fetch podcast details:', err);
        }
      }
    };

    window.addEventListener('playEpisode', handlePlayEpisode);
    return () => window.removeEventListener('playEpisode', handlePlayEpisode);
  }, []);

  useEffect(() => {
    if (audioRef.current && currentEpisode) {
      audioRef.current.src = currentEpisode.audio_url;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisode]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Save progress to history
      if (currentEpisode?.id) {
        saveProgress(currentEpisode.id, audioRef.current.currentTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime += 15;
    }
  };

  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime -= 15;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // TODO: Play next in queue
  };

  const saveProgress = async (episodeId: number, progress: number) => {
    try {
      await fetch(getApiUrl('/history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // TODO: Use actual user ID
          episodeId,
          progress,
          completed: progress >= duration * 0.9
        })
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`audio-player ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      {/* Collapsed Mini Player */}
      {!isExpanded && (
        <div className="mini-player" onClick={() => currentEpisode && setIsExpanded(true)}>
          <div className="mini-player-left">
            {podcastImage && (
              <img src={podcastImage} alt="Podcast" className="mini-podcast-image" />
            )}
            {!podcastImage && currentEpisode && (
              <div className="mini-podcast-image mini-placeholder">
                <i className="bi bi-music-note-beamed"></i>
              </div>
            )}
            {!currentEpisode && (
              <div className="mini-podcast-image mini-placeholder">
                <i className="bi bi-headphones"></i>
              </div>
            )}
            <div className="mini-episode-info">
              <div className="mini-episode-title">
                {currentEpisode ? currentEpisode.title : 'No episode playing'}
              </div>
              {currentEpisode && (
                <div className="mini-progress-bar">
                  <div 
                    className="mini-progress-fill" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="mini-player-controls">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }} 
              className="mini-play-btn"
              disabled={!currentEpisode}
            >
              <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQueueOpen();
              }} 
              className="mini-queue-btn"
              title="Open Queue"
            >
              <i className="bi bi-list-ul"></i>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (currentEpisode) setIsExpanded(true);
              }} 
              className="expand-btn"
              title="Expand Player"
            >
              <i className="bi bi-chevron-up"></i>
            </button>
          </div>
        </div>
      )}

      {/* Expanded Full Player */}
      {isExpanded && (
        <div className="full-player">
          <div className="full-player-header">
            <button 
              onClick={() => setIsExpanded(false)} 
              className="collapse-btn"
              title="Collapse Player"
            >
              <i className="bi bi-chevron-down"></i>
            </button>
            <h3>Now Playing</h3>
          </div>

          <div className="full-player-content">
            {podcastImage && (
              <img src={podcastImage} alt="Podcast" className="full-podcast-image" />
            )}
            {!podcastImage && currentEpisode && (
              <div className="full-podcast-image full-placeholder">
                <i className="bi bi-music-note-beamed"></i>
              </div>
            )}
            {!currentEpisode && (
              <div className="full-podcast-image full-placeholder">
                <i className="bi bi-headphones"></i>
              </div>
            )}
            
            <div className="full-episode-info">
              <h2 className="full-episode-title">
                {currentEpisode ? currentEpisode.title : 'No episode playing'}
              </h2>
              {!currentEpisode && (
                <p className="no-episode-message">Select an episode to start listening</p>
              )}
            </div>

            {currentEpisode && (
              <>
                <div className="progress-section-full">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="progress-bar-full"
                aria-label="Seek position"
              />
              <div className="time-display">
                <span className="time">{formatTime(currentTime)}</span>
                <span className="time">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="player-controls-full">
              <button onClick={handleSkipBackward} className="control-btn-full" title="Skip backward 15s">
                <i className="bi bi-skip-backward-fill"></i>
              </button>
              <button onClick={togglePlayPause} className="control-btn-full play-pause-full" title={isPlaying ? 'Pause' : 'Play'}>
                <i className={`bi ${isPlaying ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}`}></i>
              </button>
              <button onClick={handleSkipForward} className="control-btn-full" title="Skip forward 15s">
                <i className="bi bi-skip-forward-fill"></i>
              </button>
            </div>

            <div className="bottom-controls">
              <div className="volume-section-full">
                <i className="bi bi-volume-up"></i>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-bar-full"
                  aria-label="Volume control"
                />
              </div>
              <button onClick={onQueueOpen} className="queue-btn-full" title="Open Queue">
                <i className="bi bi-list-ul"></i>
                <span>Queue</span>
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
