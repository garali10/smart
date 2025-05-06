import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import NotificationItem from './NotificationItem';
import axios from 'axios';
import './NotificationsDropdown.css';

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const baseApiUrl = 'http://localhost:5001/api';

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }
      
      // Use the correct endpoint that matches the backend
      const response = await axios.get(`${baseApiUrl}/applications/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Fetched notifications:', response.data);
      setNotifications(response.data);
      
      // Count unread notifications
      const unread = response.data.filter(notification => !notification.read).length;
      setUnreadCount(unread);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }
      
      // Update local state first for immediate UI feedback
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
      
      // Call the backend to mark all as read
      await axios.patch(`${baseApiUrl}/applications/notifications/mark-all-read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Refetch to ensure UI matches server state
      fetchNotifications();
    }
  };

  // Mark a single notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Update local state first for immediate UI feedback
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Call the backend to mark as read
      await axios.patch(`${baseApiUrl}/applications/notifications/${notificationId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Notification marked as read:', notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Refetch to ensure UI matches server state
      fetchNotifications();
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Update local state first for immediate UI feedback
      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
      
      // Update unread count if the notification was unread
      const wasUnread = notifications.find(n => n._id === notificationId && !n.read);
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Call the backend to delete
      await axios.delete(`${baseApiUrl}/applications/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Notification deleted:', notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Refetch to ensure UI matches server state
      fetchNotifications();
    }
  };

  // Fetch notifications on component mount and periodically
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every minute
    const intervalId = setInterval(fetchNotifications, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown (for when a notification is clicked)
  const closeDropdown = () => {
    setIsOpen(false);
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <div className="notification-icon" onClick={toggleDropdown}>
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>
      
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <button 
                className="mark-all-read" 
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {loading ? (
              <div className="notifications-loading">Loading...</div>
            ) : error ? (
              <div className="notifications-error">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => (
                <NotificationItem 
                  key={notification._id} 
                  notification={notification}
                  onClose={closeDropdown}
                  onDelete={() => deleteNotification(notification._id)}
                  onMarkAsRead={() => markAsRead(notification._id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown; 