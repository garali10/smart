import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell, FaTimes, FaSearch, FaGlobe, FaAngleDown } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../utils/axios';
import { playNotificationSound } from '../../utils/notificationSound';
import './Navigation.css';
import { useTranslation } from 'react-i18next';

const Navigation = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());
  const knownNotificationsRef = useRef(new Map());
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const languageDropdownRef = useRef(null);

  const languages = [
    { code: 'en', name: 'ENGLISH' },
    { code: 'fr', name: 'FRANÇAIS' },
    { code: 'ar', name: 'العربية', dir: 'rtl' }
  ];

  // Use current language from i18n
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Function to change language
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng.code);
    setShowLanguageDropdown(false);
    
    // Set RTL direction for Arabic
    if (lng.dir === 'rtl') {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl-layout');
    } else {
      document.documentElement.dir = 'ltr';
      document.body.classList.remove('rtl-layout');
    }
  };

  // Filter languages based on search
  const filteredLanguages = searchTerm 
    ? languages.filter(lang => 
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : languages;

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/applications/notifications');
      const currentTime = Date.now();
      const newNotifications = response.data;

      // Check for new notifications
      const newOnes = newNotifications.filter(notification => {
        const notifTime = new Date(notification.createdAt).getTime();
        const isKnown = knownNotificationsRef.current.has(notification._id);
        const isNew = notifTime > lastFetchTimeRef.current;
        return !isKnown && isNew;
      });

      if (newOnes.length > 0) {
        try {
          await playNotificationSound();
        } catch (error) {
          console.error('Failed to play notification sound:', error);
        }
      }

      newNotifications.forEach(notification => {
        knownNotificationsRef.current.set(
          notification._id,
          new Date(notification.createdAt).getTime()
        );
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
      lastFetchTimeRef.current = currentTime;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const deleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent notification click event
    try {
      console.log('Attempting to delete notification:', notificationId);
      
      // Using the correct endpoint that matches the backend
      await axiosInstance.delete(`/applications/notifications/${notificationId}`);
      console.log('Notification deleted successfully');
      
      // Update local state immediately for better UX
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.filter(n => n._id !== notificationId);
        // Update unread count if needed
        const wasUnread = prevNotifications.find(n => n._id === notificationId && !n.read);
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return updatedNotifications;
      });

    } catch (error) {
      console.error('Error deleting notification:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        // Show appropriate message based on error
        if (error.response.status === 404) {
          alert('Notification not found. It may have been already deleted.');
        } else if (error.response.status === 403) {
          alert('You are not authorized to delete this notification.');
        } else {
          alert('Could not delete notification. Please try again later.');
        }
      } else {
        alert('Network error. Please check your connection and try again.');
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => {
        clearInterval(interval);
        knownNotificationsRef.current.clear();
        lastFetchTimeRef.current = Date.now();
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      console.log('=== NOTIFICATION CLICKED IN NAVIGATION ===');
      console.log('Notification:', notification);
      
      // First, mark as read in the backend
      if (!notification.read) {
        await axiosInstance.patch(`/applications/notifications/${notification._id}`);
        setNotifications(notifications.map(n => 
          n._id === notification._id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Check if notification has an applicationId
      if (notification.applicationId) {
        console.log('ApplicationID found:', notification.applicationId);
        
        // Convert ObjectId to string if needed
        const applicationId = typeof notification.applicationId === 'object' 
          ? notification.applicationId.toString() 
          : notification.applicationId;
        
        console.log('Storing application ID:', applicationId);
        
        // Store the ID directly in localStorage for the MyApplications component to pick up
        try {
          localStorage.setItem('HIGHLIGHT_APP_ID', applicationId);
          localStorage.setItem('HIGHLIGHT_APP_TIMESTAMP', Date.now().toString());
          
          // Close notifications panel
          setShowNotifications(false);
          
          // Force redirect to the applications page
          console.log('Redirecting to /my-applications');
          window.location.href = '/my-applications';
        } catch (error) {
          console.error('Error storing application ID:', error);
        }
      } else {
        console.error('No applicationId in notification:', notification);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const goToMbtiTest = (e) => {
    e.preventDefault();
    console.log("Navigating to MBTI test");
    window.location.href = '/mbti-test';
  };

  const goToTestFallback = (e) => {
    e.preventDefault();
    console.log("Navigating to fallback test page");
    navigate('/mbti-test-fallback');
  };

  const goToSimpleTest = (e) => {
    e.preventDefault();
    console.log("Navigating to simple test page");
    window.location.href = '/simple-test';
  };

  const goToSimpleMbti = (e) => {
    e.preventDefault();
    console.log("Navigating to simple MBTI test");
    window.location.href = '/mbti-simple';
  };

  // Language selector component to avoid duplication
  const LanguageSelector = () => (
    <div className="language-selector-wrapper" ref={languageDropdownRef}>
      <button 
        className="language-selector-button"
        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
      >
        <FaGlobe size={14} />
        <span className="current-language">{currentLanguage.code.toUpperCase()}</span>
      </button>
      
      {showLanguageDropdown && (
        <div className="language-dropdown">
          <div className="language-search">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder={t('navigation.searchPlaceholder')}
              className="language-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="language-list">
            {filteredLanguages.map((language) => (
              <div 
                key={language.code} 
                className={`language-item ${language.code === i18n.language ? 'active' : ''}`}
                onClick={() => changeLanguage(language)}
              >
                <span className="language-code">{language.code.toUpperCase()}</span>
                <span className="language-name">{language.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="nav-container">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          SMART HIRE
        </Link>
      </div>

      <div className="nav-middle">
        <Link to="/" className="nav-link">{t('navigation.home')}</Link>
        <Link to="/#about" className="nav-link">{t('navigation.about')}</Link>
        <Link to="/#services" className="nav-link">{t('navigation.services')}</Link>
        <Link to="/#portfolio" className="nav-link">{t('navigation.jobs')}</Link>
        {isAuthenticated && (
          <>
            <Link to="/my-applications" className="nav-link">{t('navigation.myApplications')}</Link>
            <Link to="/favorites" className="nav-link">{t('navigation.favorites')}</Link>
            <a href="#" onClick={goToMbtiTest} className="nav-link">{t('navigation.mbtiTest')}</a>
          </>
        )}
        <Link to="/#contact" className="nav-link">{t('navigation.contact')}</Link>
      </div>

      <div className="nav-right">
        <div className="user-menu">
          {isAuthenticated && (
            <div className="notification-wrapper" ref={notificationRef}>
              <button
                className="notification-button"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FaBell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <h3 className="notification-header">{t('navigation.notifications')}</h3>
                  {notifications.length === 0 ? (
                    <p className="no-notifications">{t('navigation.noNotifications')}</p>
                  ) : (
                    <div className="notification-list">
                      {notifications.map(notification => (
                        <div
                          key={notification._id}
                          className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        >
                          <div className="notification-content" onClick={() => handleNotificationClick(notification)}>
                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            className="delete-notification-btn"
                            onClick={(e) => deleteNotification(e, notification._id)}
                            title={t('common.delete')}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <LanguageSelector />
          
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="profile-icon">
                <FaUserCircle size={24} />
                {user?.name && <span className="user-name">{user.name}</span>}
              </Link>
              <button onClick={logout} className="logout-button">
                {t('navigation.logout')}
              </button>
            </>
          ) : (
            <Link to="/auth" className="login-link">
              {t('navigation.login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 