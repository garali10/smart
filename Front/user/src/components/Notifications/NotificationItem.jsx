import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationItem.css';

const NotificationItem = ({ notification, onClose, onDelete, onMarkAsRead }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    console.log('=== NOTIFICATION CLICKED ===');
    console.log('Full notification object:', notification);
    
    // Make sure we have an applicationId
    if (!notification.applicationId) {
      console.error('ERROR: No applicationId in notification:', notification);
      return;
    }
    
    // Extract the application ID - handle both string and object formats
    // MongoDB ObjectIds can be either strings or objects with toString() method
    const applicationId = typeof notification.applicationId === 'object' && notification.applicationId._id 
      ? notification.applicationId._id 
      : typeof notification.applicationId === 'object' && notification.applicationId.toString
      ? notification.applicationId.toString()
      : notification.applicationId;
    
    console.log('Resolved applicationId for navigation:', applicationId);
    
    // Mark notification as read when clicked
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead();
    }
    
    // Store the applicationId in BOTH localStorage and sessionStorage for redundancy
    try {
      localStorage.setItem('HIGHLIGHT_APP_ID', applicationId);
      console.log('Successfully stored applicationId in localStorage:', applicationId);
      
      // Also store in sessionStorage as backup
      sessionStorage.setItem('HIGHLIGHT_APP_ID', applicationId);
      console.log('Successfully stored applicationId in sessionStorage:', applicationId);
      
      // Set a current timestamp to ensure it's fresh
      localStorage.setItem('HIGHLIGHT_APP_TIMESTAMP', Date.now().toString());
    } catch (error) {
      console.error('Error storing applicationId in storage:', error);
    }
    
    // Close the notification dropdown
    if (onClose) {
      onClose();
    }
    
    // Force a direct navigation to the applications page
    try {
      console.log(`Navigating to: /my-applications with ID ${applicationId} stored in localStorage`);
      window.location.href = '/my-applications';
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to React Router navigation
      navigate('/my-applications');
    }
  };
  
  // Format date in a readable way
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  // Determine notification type class based on content or type property
  const getNotificationTypeClass = () => {
    if (!notification) return '';
    
    // If notification has explicit type, use it
    if (notification.type) {
      return notification.type.toLowerCase();
    }
    
    // Otherwise infer from message content
    const message = notification.message?.toLowerCase() || '';
    if (message.includes('shortlisted') || message.includes('congratulations')) {
      return 'success';
    } else if (message.includes('interview') || message.includes('scheduled')) {
      return 'info';
    } else if (message.includes('update') || message.includes('changed')) {
      return 'warning';
    } else if (message.includes('rejected') || message.includes('unfortunately')) {
      return 'error';
    }
    
    return '';
  };
  
  // Handle delete button click
  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };
  
  return (
    <div 
      className={`notification-item ${getNotificationTypeClass()} ${notification.read ? 'read' : 'unread'}`} 
      onClick={handleClick}
    >
      <div className="notification-content">
        <div className="notification-message">{notification.message}</div>
        <div className="notification-date">{formatDate(notification.date || notification.createdAt)}</div>
      </div>
      <button className="notification-close" onClick={handleDelete}>
        ×
      </button>
    </div>
  );
};

export default NotificationItem; 