import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PodcastCard from '../components/PodcastCard';
import { searchOnline, addPodcast, getApiUrl } from '../services/api';
import type { Podcast } from '../types/podcast';
import './Discover.css';

const CATEGORIES = [
  'All', 'Comedy', 'True Crime', 'News', 'Technology', 'Business', 
  'Health', 'Sports', 'Music', 'Arts', 'Science', 'History', 'Education'
];

const Browse: React.FC = () => {
  const navigate = useNavigate();
  const [allPodcasts, setAllPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [libraryPodcastIds, setLibraryPodcastIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLibraryPodcasts();
    loadAllAvailablePodcasts();
  }, []);

  useEffect(() => {
    filterPodcasts();
  }, [selectedCategory, searchQuery, allPodcasts, libraryPodcastIds]);

  const loadLibraryPodcasts = async () => {
    try {
      const response = await fetch(getApiUrl('/podcasts'));
      const podcasts: Podcast[] = await response.json();
      const itunesIds = new Set(
        podcasts.map(p => p.itunes_id).filter((id): id is string => id !== null && id !== undefined)
      );
      setLibraryPodcastIds(itunesIds);
    } catch (err) {
      console.error('Failed to load library podcasts:', err);
    }
  };

  const loadAllAvailablePodcasts = async () => {
    setLoading(true);
    try {
      // Search for podcasts from multiple popular categories to get variety
      const categories = ['podcast', 'comedy', 'news', 'technology', 'business', 'health'];
      const allResults: Podcast[] = [];
      
      for (const category of categories) {
        const results = await searchOnline(category, 20);
        allResults.push(...results);
      }
      
      // Remove duplicates based on itunes_id
      const uniquePodcasts = Array.from(
        new Map(allResults.map(p => [p.itunes_id, p])).values()
      );
      
      setAllPodcasts(uniquePodcasts);
    } catch (err) {
      console.error('Failed to load podcasts:', err);
      setError('Failed to load podcasts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterPodcasts = () => {
    let filtered = allPodcasts;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.author?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredPodcasts(filtered);
  };

  const handleAddPodcast = async (podcast: Podcast) => {
    try {
      await addPodcast(podcast);
      if (podcast.itunes_id) {
        setLibraryPodcastIds(prev => new Set(prev).add(podcast.itunes_id!));
      }
      setMessage(`"${podcast.title}" added to your library!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      interface ErrorResponse {
        response?: { status?: number };
      }
      if (err && typeof err === 'object' && 'response' in err && (err as ErrorResponse).response?.status === 409) {
        setError('This podcast is already in your library.');
      } else {
        setError('Failed to add podcast. Please try again.');
      }
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCategorySearch = async (category: string) => {
    setLoading(true);
    try {
      const results = await searchOnline(category, 50);
      const uniqueResults = Array.from(
        new Map([...allPodcasts, ...results].map(p => [p.itunes_id, p])).values()
      );
      setAllPodcasts(uniqueResults);
      setSelectedCategory(category);
    } catch (err) {
      setError('Failed to load more podcasts');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="browse-page">
      <div className="browse-header">
        <button onClick={() => navigate('/')} className="back-btn">
          <i className="bi bi-arrow-left"></i> Back to Search
        </button>
        <div className="browse-title-section">
          <h1>Discover New Podcasts</h1>
          <p>Explore podcasts to add to your library</p>
        </div>
      </div>

      <div className="browse-filters">
        <div className="search-input-container">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search"
          />
        </div>
        
        <div className="category-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategorySearch(cat)}
              className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="bi bi-arrow-repeat spin"></i>
          <span>Loading podcasts...</span>
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <h2>No Podcasts Found</h2>
          <p>Try adjusting your filters or search query</p>
          <button onClick={() => setSelectedCategory('All')} className="btn-reset">
            View All Categories
          </button>
        </div>
      ) : (
        <>
          <div className="results-count">
            Showing {filteredPodcasts.length} podcast{filteredPodcasts.length !== 1 ? 's' : ''}
          </div>
          <div className="podcasts-grid">
            {filteredPodcasts.map((podcast, index) => (
              <PodcastCard
                key={podcast.itunes_id || index}
                podcast={podcast}
                onAdd={handleAddPodcast}
                isInLibrary={podcast.itunes_id ? libraryPodcastIds.has(podcast.itunes_id) : false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Browse;
