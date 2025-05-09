import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { FaHeart, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Add custom styles
const styles = {
  clearButton: {
    width: '40px',
    height: '40px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'absolute',
    top: '0',
    right: '0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 10
  },
  pageHeader: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'left',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative'
  },
  favoriteCount: {
    marginLeft: '5px',
    fontWeight: 'normal',
    color: '#666'
  },
  container: {
    maxWidth: '1200px', 
    margin: '0 auto',
    padding: '20px 16px'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    margin: '0',
    padding: '0'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginTop: '20px'
  }
};

const Favorites = () => {
  const { t } = useTranslation();
  const [favoriteJobs, setFavoriteJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const loadFavorites = () => {
      setIsLoading(true);
      try {
        // Get favorites from local storage
        const favorites = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
        setFavoriteJobs(favorites);
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();

    // Add event listener to update favorites if they change in another component
    window.addEventListener('storage', loadFavorites);
    
    return () => {
      window.removeEventListener('storage', loadFavorites);
    };
  }, []);

  // Handler to clear all favorites
  const clearAllFavorites = () => {
    if (window.confirm('Are you sure you want to remove all favorites?')) {
      localStorage.setItem('favoriteJobs', '[]');
      setFavoriteJobs([]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('auth.pleaseLogin')}</h2>
          <p>{t('auth.loginRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.pageHeader}>
        {t('favorites.title')} 
        <span style={styles.favoriteCount}>
          ({t('favorites.count', { count: favoriteJobs.length })})
        </span>
        
        {favoriteJobs.length > 0 && (
          <button 
            onClick={clearAllFavorites}
            style={styles.clearButton}
            title={t('favorites.clearAll')}
          >
            <FaTrash size={16} />
          </button>
        )}
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : favoriteJobs.length === 0 ? (
        <div style={styles.emptyState}>
          <FaHeart className="text-gray-300 text-5xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('favorites.empty')}</h3>
          <p className="text-gray-600 mb-4">
            {t('favorites.emptyDesc')}
          </p>
          <a href="/#portfolio" className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition">
            {t('favorites.exploreJobs')}
          </a>
        </div>
      ) : (
        <div style={styles.cardsGrid}>
          {favoriteJobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites; 