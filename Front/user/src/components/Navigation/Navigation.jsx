import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../utils/axios';
import { playNotificationSound } from '../../utils/notificationSound';
import './Navigation.css';

const Navigation = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());
  const knownNotificationsRef = useRef(new Map());

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await axiosInstance.patch(`/applications/notifications/${notification._id}`);
        setNotifications(notifications.map(n => 
          n._id === notification._id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  return (
    <nav className="nav-container">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          SMART HIRE
        </Link>
      </div>

      <div className="nav-middle">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/#about" className="nav-link">About</Link>
        <Link to="/#services" className="nav-link">Services</Link>
        <Link to="/#portfolio" className="nav-link">Jobs</Link>
        {isAuthenticated && (
          <>
            <Link to="/my-applications" className="nav-link">My Applications</Link>
            <a href="#" onClick={goToMbtiTest} className="nav-link">MBTI Test</a>
          </>
        )}
        <Link to="/#contact" className="nav-link">Contact</Link>
      </div>

      <div className="nav-right">
        {isAuthenticated ? (
          <div className="user-menu">
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
                  <h3 className="notification-header">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="no-notifications">No new notifications</p>
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
                            title="Delete notification"
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
            
            <Link to="/profile" className="profile-icon">
              <FaUserCircle size={24} />
              {user?.name && <span className="user-name">{user.name}</span>}
            </Link>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        ) : (
          <Link to="/auth" className="login-link">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 