import React, { useState, useEffect } from 'react';
import CategoryFilter from '../components/CategoryFilter';
import PodcastCard from '../components/PodcastCard';
import SearchBar from '../components/SearchBar';
import { 
  getAllPodcasts, 
  getPodcastsByCategory, 
  searchLocalPodcasts, 
  deletePodcast,
  getCategories 
} from '../services/api';
    import type { Podcast } from '../types/podcast';
import './Library.css';

const Library: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPodcasts();
    loadCategories();
  }, []);

  const loadPodcasts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllPodcasts();
      setPodcasts(data);
    } catch (err) {
      setError('Failed to load podcasts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    
    try {
      if (category === 'All') {
        const data = await getAllPodcasts();
        setPodcasts(data);
      } else {
        const data = await getPodcastsByCategory(category);
        setPodcasts(data);
      }
    } catch (err) {
      setError('Failed to load podcasts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await searchLocalPodcasts(query);
      setPodcasts(data);
      setSelectedCategory('All');
    } catch (err) {
      setError('Failed to search podcasts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this podcast?')) {
      return;
    }

    try {
      await deletePodcast(id);
      setPodcasts(podcasts.filter(p => p.id !== id));
      setMessage('Podcast removed from library.');
      setTimeout(() => setMessage(null), 3000);
      
      // Reload categories in case we deleted the last podcast in a category
      loadCategories();
    } catch (err) {
      setError('Failed to delete podcast.');
      console.error(err);
    }
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <h1>My Podcast Library</h1>
        <p>Browse and manage your saved podcasts</p>
      </div>

      <SearchBar 
        onSearch={handleSearch}
        placeholder="Search your library..."
      />

      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
        />
      )}

      {loading && <div className="loading">Loading podcasts...</div>}
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {!loading && podcasts.length === 0 && (
        <div className="empty-state">
          <h2>No podcasts in your library yet</h2>
          <p>Search for podcasts and add them to your library to get started!</p>
        </div>
      )}

      <div className="podcasts-grid">
        {podcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            onDelete={handleDelete}
            isInLibrary={true}
          />
        ))}
      </div>
    </div>
  );
};

export default Library;
