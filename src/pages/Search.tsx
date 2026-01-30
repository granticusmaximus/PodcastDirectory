import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import PodcastCard from '../components/PodcastCard';
import { searchOnline, addPodcast } from '../services/api';
import type { Podcast } from '../types/podcast';
import './Search.css';

interface CategoryPodcasts {
  category: string;
  podcasts: Podcast[];
  loading: boolean;
}

const FEATURED_CATEGORIES = [
  { name: 'Comedy', icon: '😂' },
  { name: 'True Crime', icon: '🔍' },
  { name: 'News', icon: '📰' },
  { name: 'Technology', icon: '💻' },
  { name: 'Business', icon: '💼' },
  { name: 'Health', icon: '🏥' }
];

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryPodcasts[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [libraryPodcastIds, setLibraryPodcastIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadLibraryPodcasts = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/podcasts');
        const podcasts: Podcast[] = await response.json();
        const itunesIds = new Set(podcasts.map(p => p.itunes_id).filter((id): id is number => id !== null && id !== undefined));
        setLibraryPodcastIds(itunesIds);
      } catch (err) {
        console.error('Failed to load library podcasts:', err);
      }
    };

    loadLibraryPodcasts();
  }, []);

  useEffect(() => {
    const loadFeaturedPodcasts = async () => {
      // Set initial loading state for all categories
      setCategoryData(FEATURED_CATEGORIES.map(cat => ({
        category: cat.name,
        podcasts: [],
        loading: true
      })));

      // Load categories one by one to avoid overwhelming the API
      for (const cat of FEATURED_CATEGORIES) {
        try {
          const podcasts = await searchOnline(cat.name, 5);
          // Filter out podcasts already in library
          const filteredPodcasts = podcasts.filter(p => 
            !p.itunes_id || !libraryPodcastIds.has(p.itunes_id)
          );
          setCategoryData(prevData => 
            prevData.map(item => 
              item.category === cat.name 
                ? { ...item, podcasts: filteredPodcasts.slice(0, 5), loading: false }
                : item
            )
          );
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Failed to load ${cat.name} podcasts:`, err);
          setCategoryData(prevData => 
            prevData.map(item => 
              item.category === cat.name 
                ? { ...item, podcasts: [], loading: false }
                : item
            )
          );
        }
      }
    };

    loadFeaturedPodcasts();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query || query.trim() === '') {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setHasSearched(true);
    
    try {
      const podcasts = await searchOnline(query);
      setResults(podcasts);
      
      if (podcasts.length === 0) {
        setMessage('No podcasts found. Try a different search term.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to search podcasts. Please try again.';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPodcast = async (podcast: Podcast) => {
    try {
      await addPodcast(podcast);
      // Add to library tracking
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

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="header-content">
          <div>
            <h1>Discover Podcasts</h1>
            <p>Search for podcasts or explore curated categories</p>
          </div>
          <button onClick={() => navigate('/discover')} className="btn-view-all">
            <i className="bi bi-grid-3x3-gap-fill"></i>
            View All Podcasts
          </button>
        </div>
      </div>
      
      <SearchBar 
        onSearch={handleSearch}
        placeholder="Search for podcasts (e.g., 'history', 'comedy', 'true crime')"
      />

      {loading && <div className="loading">Searching podcasts...</div>}
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {hasSearched && (
        <div className="search-results-section">
          <div className="results-header">
            <h2 className="section-title">Search Results</h2>
            <button 
              className="back-to-categories-btn"
              onClick={() => {
                setHasSearched(false);
                setResults([]);
                setError(null);
                setMessage(null);
              }}
            >
              ← Back to Categories
            </button>
          </div>
          <div className="results-grid">
            {results.map((podcast, index) => (
              <PodcastCard
                key={`${podcast.itunes_id || index}`}
                podcast={podcast}
                onAdd={handleAddPodcast}
                isInLibrary={podcast.itunes_id ? libraryPodcastIds.has(podcast.itunes_id) : false}
              />
            ))}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="featured-section">
          <h2 className="featured-title">Explore by Category</h2>
          {categoryData.map((catData, idx) => (
            <div key={catData.category} className="category-section">
              <div className="category-header">
                <div className="category-title-row">
                  <span className="category-icon">{FEATURED_CATEGORIES[idx].icon}</span>
                  <h3 className="category-title">{catData.category}</h3>
                </div>
                <button 
                  className="view-more-btn"
                  onClick={() => handleSearch(catData.category)}
                >
                  View More →
                </button>
              </div>
              
              {catData.loading ? (
                <div className="category-loading">Loading...</div>
              ) : catData.podcasts.length > 0 ? (
                <div className="category-podcasts">
                  {catData.podcasts.map((podcast, index) => (
                    <PodcastCard
                      key={`${podcast.itunes_id || index}`}
                      podcast={podcast}
                      onAdd={handleAddPodcast}
                      isInLibrary={podcast.itunes_id ? libraryPodcastIds.has(podcast.itunes_id) : false}
                    />
                  ))}
                </div>
              ) : (
                <div className="category-empty">No podcasts available</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
