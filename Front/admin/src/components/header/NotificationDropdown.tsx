import { useState, useEffect, useRef } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router-dom";
import { playNotificationSound } from "../../utils/notificationSound";
import axios from 'axios';

// API base URL - centralized for easy updates
const API_BASE_URL = 'http://localhost:5001/api';

// Add CSS to hide search fields inside the notification dropdown
const hideSearchStyleId = 'hide-notification-search-style';

// Create style element if it doesn't exist
const createHideSearchStyle = () => {
  if (!document.getElementById(hideSearchStyleId)) {
    const style = document.createElement('style');
    style.id = hideSearchStyleId;
    style.innerHTML = `
      .notification-dropdown input[type="search"],
      .notification-dropdown input[type="text"][placeholder*="Search"],
      .notification-dropdown input[placeholder*="Search"],
      .notification-dropdown .search-container,
      .notification-dropdown .search-input,
      .notification-dropdown *[class*="search"] {
        display: none !important;
      }
      
      /* Hide only search-specific SVGs and forms */
      .notification-dropdown div.relative input,
      .notification-dropdown div.relative svg,
      .notification-dropdown form {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
};

// Remove style when component unmounts
const removeHideSearchStyle = () => {
  const style = document.getElementById(hideSearchStyleId);
  if (style) {
    document.head.removeChild(style);
  }
};

interface Notification {
  _id: string;
  message: string;
  createdAt: string;
  read: boolean;
  userId: string;
  type: string;
  metadata?: {
    jobId?: string;
    applicantEmail?: string;
    applicantName?: string;
    [key: string]: any;
  };
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      console.log('=== FETCHING NOTIFICATIONS ===');
      const token = localStorage.getItem('token');
      console.log('1. Token available:', !!token);
      
      const response = await axios.get<Notification[]>(`${API_BASE_URL}/applications/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Get list of deleted notification IDs from localStorage
      const deletedNotificationIds = JSON.parse(localStorage.getItem('deletedNotificationIds') || '[]');
      console.log('Deleted notification IDs:', deletedNotificationIds);
      
      // Filter out notifications that should only be shown to regular users
      // Also filter out notifications that have been deleted locally
      const filteredNotifications = response.data.filter(notification => {
        // Skip if this notification was previously deleted
        if (deletedNotificationIds.includes(notification._id)) {
          console.log('Filtering out previously deleted notification:', notification._id);
          return false;
        }
        
        // Exclude 'application_analysis' and 'application_warning' notifications
        // These are meant only for regular users
        if (notification.type === 'application_analysis' || notification.type === 'application_warning') {
          return false;
        }
        
        // Also exclude notifications with messages about application analysis
        if (notification.message) {
          const lowerMessage = notification.message.toLowerCase();
          
          // Check for common patterns in analysis notifications
          if (lowerMessage.includes('has been analyzed') || 
              lowerMessage.includes('check your application status') ||
              lowerMessage.includes('your application for') ||
              lowerMessage.includes('cv analysis')) {
            
            // If message starts with "Your application" it's user-specific
            if (lowerMessage.startsWith('your application')) {
              return false;
            }
          }
        }
        
        return true;
      });
      
      console.log(`Filtered out ${response.data.length - filteredNotifications.length} user-specific or deleted notifications`);
      
      // Filter out duplicate notifications (same applicant + same job)
      const uniqueNotifications = filterDuplicateNotifications(filteredNotifications);
      
      // Sort filtered notifications by creation date (newest first)
      const sortedNotifications = uniqueNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log('2. Response received:', {
        status: response.status,
        originalCount: response.data.length,
        filteredCount: sortedNotifications.length,
        notifications: sortedNotifications
      });
      
      // Get the most recent notification by timestamp
      const mostRecentNotification = sortedNotifications.length > 0 
        ? sortedNotifications[0] // Already sorted, first one is most recent
        : null;
      
      // Check if the most recent notification is new (not in previous notifications)
      const isNewNotification = mostRecentNotification && 
        !previousNotificationsRef.current.some(prev => prev._id === mostRecentNotification._id);
      
      // Also check if the notification was updated (same ID but different timestamp)
      const wasUpdated = mostRecentNotification && 
        previousNotificationsRef.current.some(prev => 
          prev._id === mostRecentNotification._id && 
          new Date(prev.createdAt).getTime() !== new Date(mostRecentNotification.createdAt).getTime()
        );
      
      console.log('3. Notification check:', {
        totalNotifications: sortedNotifications.length,
        previousNotificationsCount: previousNotificationsRef.current.length,
        mostRecentNotificationId: mostRecentNotification?._id,
        mostRecentNotificationTime: mostRecentNotification?.createdAt,
        isNewNotification,
        wasUpdated
      });
      
      if ((isNewNotification || wasUpdated) && 
          mostRecentNotification && 
          mostRecentNotification.type === 'new_application') {
        console.log('4. New or updated application notification detected, playing sound');
        setNotifying(true);
        try {
          await playNotificationSound();
          console.log('5. Successfully played notification sound');
        } catch (soundError) {
          console.error('5. Error playing notification sound:', soundError);
        }
      } else {
        console.log('4. No new application notifications detected');
      }
      
      setNotifications(sortedNotifications);
      previousNotificationsRef.current = sortedNotifications;
      console.log('7. Notifications state updated');
    } catch (error) {
      console.error('ERROR: Error fetching notifications:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
    }
  };

  // Helper function to filter out duplicate notifications by content
  const filterDuplicateNotifications = (notifications: Notification[]): Notification[] => {
    // Sort notifications by creation date (newest first)
    const sortedNotifs = [...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Use a Map to track unique notification combinations (applicant name + job title)
    const uniqueNotifs = new Map<string, Notification>();
    
    for (const notification of sortedNotifs) {
      // For new application notifications, extract applicant and job info
      if (notification.type === 'new_application') {
        const messageMatch = notification.message.match(/(.+) has applied for the (.+) position/);
        
        if (messageMatch) {
          const [_, applicantName, jobTitle] = messageMatch;
          const key = `${applicantName}:${jobTitle}`;
          
          // Only add if we haven't seen this combo yet (keeps first/newest due to sort)
          if (!uniqueNotifs.has(key)) {
            uniqueNotifs.set(key, notification);
          }
        } else {
          // If no match (malformed message), use ID as key
          uniqueNotifs.set(notification._id, notification);
        }
      } 
      // For other notification types, use ID as the key
      else {
        uniqueNotifs.set(notification._id, notification);
      }
    }
    
    // Convert the Map values back to an array
    return Array.from(uniqueNotifs.values());
  };

  useEffect(() => {
    console.log('=== NOTIFICATION DROPDOWN MOUNTED ===');
    
    // Create style to hide search inputs
    createHideSearchStyle();
    
    // Initialize the deletedNotificationIds array if it doesn't exist
    if (!localStorage.getItem('deletedNotificationIds')) {
      localStorage.setItem('deletedNotificationIds', JSON.stringify([]));
    }
    
    // Run cleanup once on component mount to ensure no duplicates
    cleanupDuplicates(true);
    
    // Fetch notifications immediately (will happen after cleanup)
    fetchNotifications();

    // Then fetch every 30 seconds
    const interval = setInterval(fetchNotifications, 10000); // Reduced to 10 seconds for faster real-time updates
    console.log('Polling interval set to 10 seconds');

    // Add a cleanup for search elements
    const searchCleanupInterval = setInterval(() => {
      if (isOpen) {
        // Find and remove any search inputs or elements with search in class name
        const dropdownEl = document.querySelector('.notification-dropdown');
        if (dropdownEl) {
          // Remove search inputs
          const searchInputs = dropdownEl.querySelectorAll('input[type="search"], input[placeholder*="Search"]');
          searchInputs.forEach(el => el.remove());
          
          // Remove search icons (likely SVG elements) - Be more specific to avoid removing delete icons
          const searchIcons = dropdownEl.querySelectorAll('svg:not([width="14"][height="14"])');
          searchIcons.forEach(el => el.remove());
          
          // Remove any div that might be a search container
          const searchDivs = dropdownEl.querySelectorAll('div[class*="search"]');
          searchDivs.forEach(el => el.remove());
        }
      }
    }, 100); // Check frequently while dropdown is open

    // Cleanup interval on unmount
    return () => {
      console.log('Cleaning up notification polling interval');
      clearInterval(interval);
      clearInterval(searchCleanupInterval);
      removeHideSearchStyle();
    };
  }, [isOpen]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
    setNotifying(false); // Clear notification indicator when dropdown is closed
  }

  const handleClick = () => {
    toggleDropdown();
    if (notifying) {
      setNotifying(false);
    }
  };

  const testSound = () => {
    console.log('=== TESTING NOTIFICATION SOUND ===');
    console.log('1. Test sound button clicked');
    
    // Force play the sound regardless of notifications
    try {
      console.log('2. Directly calling playNotificationSound()');
      playNotificationSound();
      console.log('3. Notification sound function called');
    } catch (error) {
      console.error('Error testing sound:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Add the notification ID to our local storage list of deleted notifications
      const deletedNotificationIds = JSON.parse(localStorage.getItem('deletedNotificationIds') || '[]');
      if (!deletedNotificationIds.includes(notificationId)) {
        deletedNotificationIds.push(notificationId);
        localStorage.setItem('deletedNotificationIds', JSON.stringify(deletedNotificationIds));
        console.log('Added notification to deleted list:', notificationId);
      }
      
      // Remove the notification from state immediately for better UX
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification._id !== notificationId)
      );
      
      // Try the admin endpoint first
      try {
        await axios.delete(`${API_BASE_URL}/applications/admin/notifications/${notificationId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log(`Successfully deleted notification using admin endpoint: ${notificationId}`);
      } catch (adminError) {
        console.log('Admin endpoint failed, trying standard endpoint', adminError);
        
        // If admin endpoint fails, try the standard endpoint
        try {
          await axios.delete(`${API_BASE_URL}/applications/notifications/${notificationId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log(`Successfully deleted notification using standard endpoint: ${notificationId}`);
        } catch (standardError) {
          console.error('Both delete endpoints failed:', standardError);
          // The notification is already removed from UI, so user won't notice
        }
      }
    } catch (error) {
      console.error('Error in delete operation:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // First, update the notification in our local state for immediate feedback
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // For admins, we use the admin-specific endpoint
      try {
        // Try the admin endpoint first since we're in the admin interface
        await axios.patch(`${API_BASE_URL}/applications/admin/notifications/${notificationId}`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Successfully marked notification as read using admin endpoint');
      } catch (adminError) {
        console.log('Admin endpoint failed, trying standard endpoint', adminError);
        
        // If admin endpoint fails, try the standard endpoint as fallback
        try {
          await axios.patch(`${API_BASE_URL}/applications/notifications/${notificationId}`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          console.log('Successfully marked notification as read using standard endpoint');
        } catch (standardError) {
          console.log('Both endpoints failed to mark notification as read', standardError);
          // The UI is already updated, so the user won't notice the failure
        }
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      
      // Keep the optimistic UI update even if the API call fails
      // This gives a better user experience
    }
  };

  const cleanupDuplicates = async (silent = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/applications/cleanup-notifications`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Cleanup result:', response.data);
      
      // Only fetch notifications if this wasn't a silent cleanup
      // (If silent, the fetchNotifications will be called separately)
      if (!silent) {
        await fetchNotifications();
        
        // Show success message only if not silent
        alert(`Cleanup completed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      if (!silent) {
        alert('Failed to clean up notifications. Please try again.');
      }
    }
  };

  // Add a method to clear deleted notifications (useful for testing)
  const clearDeletedNotifications = () => {
    localStorage.removeItem('deletedNotificationIds');
    localStorage.setItem('deletedNotificationIds', JSON.stringify([]));
    fetchNotifications(); // Refresh notifications
    alert('Deleted notifications memory has been cleared.');
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          onClick={handleClick}
        >
          <span
            className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
              !notifying ? "hidden" : "flex"
            }`}
          >
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="notification-dropdown absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* Add CSS to hide search inputs added by other components */}
        <style>
          {`
            input[type="search"],
            input[type="text"][placeholder*="Search"],
            input[placeholder*="Search"],
            div[class*="search"],
            .search-icon,
            form,
            .search-container {
              display: none !important;
            }
            
            /* Only hide search-related SVGs */
            .notification-dropdown div.relative input,
            .notification-dropdown div.relative svg {
              display: none !important;
            }
            
            /* Ensure notification items and delete buttons remain visible */
            .notification-dropdown li,
            .notification-dropdown svg[width="14"][height="14"],
            .notification-dropdown .absolute svg {
              display: block !important;
            }
            
            /* Only show our specific notification bell icon */
            button.dropdown-toggle svg.fill-current {
              display: block !important;
            }
          `}
        </style>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cleanupDuplicates(false)}
              title="Clean up duplicate notifications"
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1H6zm3 6a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm1 3a1 1 0 100 2h4a1 1 0 100-2h-4z"
                />
              </svg>
            </button>
            <button
              onClick={toggleDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <li className="p-4 text-center text-gray-500">
              No new notifications
            </li>
          ) : (
            notifications.map((notification) => {
              // Determine notification style based on type
              let notificationStyle = "bg-gray-50 hover:bg-gray-100";
              let iconClassName = "";
              
              if (notification.type === 'application_status') {
                notificationStyle = "bg-blue-50 hover:bg-blue-100";
                iconClassName = "text-blue-500";
              } else if (notification.type === 'interview_scheduled') {
                notificationStyle = "bg-green-50 hover:bg-green-100";
                iconClassName = "text-green-500";
              } else if (notification.type === 'new_application') {
                notificationStyle = "bg-purple-50 hover:bg-purple-100";
                iconClassName = "text-purple-500";
              }
              
              // Add a small dot to indicate unread notifications
              const unreadIndicator = !notification.read ? (
                <span className="absolute left-1 top-4 h-2.5 w-2.5 rounded-full bg-orange-500"></span>
              ) : null;
              
              return (
                <li key={notification._id} className="relative mb-2">
                  {unreadIndicator}
                  <DropdownItem
                    onItemClick={() => markAsRead(notification._id)}
                    className={`flex gap-3 rounded-lg border border-gray-100 p-3 px-4.5 py-3 ${notificationStyle} dark:border-gray-800 dark:hover:bg-white/5`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-800 dark:text-white/90 pr-6">
                          {notification.type === 'new_application' && (
                            <span className={`mr-2 ${iconClassName}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            </span>
                          )}
                          {notification.message}
                        </p>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </div>
                      </div>
                      <span className="block text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>
      </Dropdown>
    </div>
  );
}
