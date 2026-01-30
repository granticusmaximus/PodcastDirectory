import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Podcast } from '../types/podcast';
import './PodcastCard.css';

type PodcastCardProps = {
  podcast: Podcast;
  onAdd?: (podcast: Podcast) => void;
  onView?: (podcast: Podcast) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  isInLibrary?: boolean;
};

const PodcastCard: React.FC<PodcastCardProps> = ({ 
  podcast, 
  onAdd, 
  onView, 
  onDelete,
  showActions = true,
  isInLibrary = false
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (isInLibrary && podcast.id) {
      navigate(`/podcast/${podcast.id}`);
    } else if (onView) {
      onView(podcast);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className={`podcast-card ${isInLibrary ? 'clickable' : ''}`} onClick={handleCardClick}>
      {podcast.image_url && (
        <img 
          src={podcast.image_url} 
          alt={podcast.title}
          className="podcast-image"
        />
      )}
      <div className="podcast-content">
        <h3 className="podcast-title">{podcast.title}</h3>
        {podcast.author && (
          <p className="podcast-author">by {podcast.author}</p>
        )}
        <span className="podcast-category">{podcast.category}</span>
        {podcast.description && (
          <p className="podcast-description">
            {podcast.description.substring(0, 150)}
            {podcast.description.length > 150 ? '...' : ''}
          </p>
        )}
        {showActions && (
          <div className="podcast-actions">
            {!isInLibrary && onAdd && (
              <button onClick={(e) => handleActionClick(e, () => onAdd(podcast))} className="btn-add">
                Add to Library
              </button>
            )}
            {isInLibrary && !onDelete && (
              <button className="btn-in-library" disabled>
                <i className="bi bi-check-circle-fill"></i>
                In Library
              </button>
            )}
            {isInLibrary && onDelete && podcast.id && (
              <button onClick={(e) => handleActionClick(e, () => onDelete(podcast.id!))} className="btn-delete">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastCard;
