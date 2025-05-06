import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './MyApplications.css';

const MyApplications = () => {
  console.log('================================');
  console.log('MyApplications component mounted');
  
  const { isAuthenticated } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedAppId, setHighlightedAppId] = useState(null);
  const [showSingleApplication, setShowSingleApplication] = useState(false);
  const applicationRefs = useRef({});
  const location = useLocation();
  
  console.log('Current location:', location);
  console.log('Current URL:', window.location.href);

  // Default image for jobs and base URL for backend
  const defaultJobImage = '/img/job-categories/engineering.jpeg';
  const baseImageUrl = 'http://localhost:5001'; // Updated to use port 5001

  // Check localStorage first thing
  const storedAppId = localStorage.getItem('HIGHLIGHT_APP_ID');
  const storedTimestamp = localStorage.getItem('HIGHLIGHT_APP_TIMESTAMP');
  const isStoredAppIdFresh = storedTimestamp && (Date.now() - parseInt(storedTimestamp) < 30000); // 30 seconds

  console.log('Initial localStorage check:', { 
    storedAppId, 
    storedTimestamp, 
    isStoredAppIdFresh 
  });

  // Helper function to safely compare MongoDB ObjectIds or string IDs
  const compareIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    
    // Convert to strings if they are objects
    const strId1 = typeof id1 === 'object' ? (id1.toString ? id1.toString() : JSON.stringify(id1)) : String(id1);
    const strId2 = typeof id2 === 'object' ? (id2.toString ? id2.toString() : JSON.stringify(id2)) : String(id2);
    
    return strId1 === strId2;
  };

  // When component mounts, check localStorage directly first
  useEffect(() => {
    console.log('==== MOUNT EFFECT RUNNING ====');
    
    let applicationId = null;
    
    // Try localStorage first (most reliable)
    const storedAppId = localStorage.getItem('HIGHLIGHT_APP_ID');
    const storedTimestamp = localStorage.getItem('HIGHLIGHT_APP_TIMESTAMP');
    
    // Only use stored ID if it's relatively fresh (less than 30 seconds old)
    const isStoredAppIdFresh = storedTimestamp && (Date.now() - parseInt(storedTimestamp) < 30000);
    
    console.log('localStorage check in effect:', {
      storedAppId,
      storedTimestamp,
      isStoredAppIdFresh
    });
    
    if (storedAppId && isStoredAppIdFresh) {
      applicationId = storedAppId;
      console.log('Using applicationId from localStorage:', applicationId);
    }
    
    // Then try sessionStorage 
    if (!applicationId) {
      const sessionAppId = sessionStorage.getItem('HIGHLIGHT_APP_ID');
      if (sessionAppId) {
        applicationId = sessionAppId;
        console.log('Using applicationId from sessionStorage:', applicationId);
      }
    }
    
    // Finally check URL params
    if (!applicationId) {
      const queryParams = new URLSearchParams(location.search);
      const urlAppId = queryParams.get('applicationId');
      if (urlAppId) {
        applicationId = urlAppId;
        console.log('Using applicationId from URL params:', applicationId);
      }
    }
    
    // If we found an applicationId from any source
    if (applicationId) {
      console.log('Setting highlighted app ID:', applicationId);
      
      // Force state updates synchronously
      setHighlightedAppId(applicationId);
      setShowSingleApplication(true);
      
      // Clean storage
      try {
        localStorage.removeItem('HIGHLIGHT_APP_ID');
        localStorage.removeItem('HIGHLIGHT_APP_TIMESTAMP');
        sessionStorage.removeItem('HIGHLIGHT_APP_ID');
        console.log('Cleared application ID from storage');
      } catch (error) {
        console.error('Error clearing storage:', error);
      }
      
      // Add a timeout to scroll after render is complete
      setTimeout(() => {
        const appElement = document.getElementById(`app-${applicationId}`);
        if (appElement) {
          console.log('Found app element, scrolling to:', applicationId);
          appElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          appElement.classList.add('extra-highlight');
          setTimeout(() => {
            appElement.classList.remove('extra-highlight');
          }, 2000);
        } else {
          console.log('No element found with ID:', `app-${applicationId}`);
        }
      }, 1000);
    } else {
      console.log('No applicationId found from any source');
      setShowSingleApplication(false);
    }
  }, []); // Only run once on mount

  // Filter applications when highlightedAppId changes
  useEffect(() => {
    console.log('Filtering applications with highlightedAppId:', highlightedAppId);
    console.log('showSingleApplication:', showSingleApplication);
    console.log('Available applications:', applications);
    
    if (showSingleApplication && highlightedAppId && applications.length > 0) {
      const filtered = applications.filter(app => {
        const appId = app._id || app.id;
        console.log('Comparing:', appId, 'with', highlightedAppId);
        return compareIds(appId, highlightedAppId);
      });
      
      console.log('Filtered applications:', filtered);
      setFilteredApplications(filtered.length > 0 ? filtered : applications);
    } else {
      setFilteredApplications(applications);
    }
  }, [highlightedAppId, applications, showSingleApplication]);

  // Scroll to highlighted application after loading
  useEffect(() => {
    if (highlightedAppId && !loading) {
      console.log('Attempting to scroll to application:', highlightedAppId);
      console.log('Available refs:', Object.keys(applicationRefs.current));
      
      // Convert highlightedAppId to string for comparison
      const highlightedAppIdStr = typeof highlightedAppId === 'object' 
        ? highlightedAppId.toString() 
        : String(highlightedAppId);
      
      // Get the ref for either the string or object version of the ID
      const ref = applicationRefs.current[highlightedAppIdStr];
      
      if (ref) {
        console.log('Found ref for application, scrolling now');
        setTimeout(() => {
          ref.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Add extra highlight effect
          ref.classList.add('extra-highlight');
          setTimeout(() => {
            ref.classList.remove('extra-highlight');
          }, 2000);
        }, 500);
      } else {
        console.log('No ref found for application:', highlightedAppIdStr);
      }
    }
  }, [highlightedAppId, loading, filteredApplications]);

  const getImageUrl = (imagePath, department) => {
    if (!imagePath) {
      // Get default image based on department
      const dept = department?.toLowerCase() || '';
      if (dept.includes('engineering') || 
          dept.includes('dev') || 
          dept.includes('react') || 
          dept.includes('frontend') ||
          dept.includes('backend')) return '/img/job-categories/engineering.jpeg';
      if (dept.includes('marketing')) return '/img/job-categories/marketing.jpeg';
      if (dept.includes('sales')) return '/img/job-categories/sales.jpeg';
      return defaultJobImage;
    }
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/img/job-categories/')) return imagePath;
    return `/uploads/jobs/${imagePath.split('/').pop()}`;
  };

  const getResumeUrl = (resumePath) => {
    if (!resumePath) return '#';
    if (resumePath.startsWith('http')) return resumePath;
    return `${baseImageUrl}${resumePath}`;
  };

  const fetchApplications = async () => {
    try {
      console.log('\n=== Fetching Applications (Frontend) ===');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${baseImageUrl}/api/applications/my-applications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('\nReceived raw data:', response.data);
      
      // Transform the data to ensure all required fields are present
      const transformedApplications = response.data.map(app => {
        console.log('\nProcessing application:', app._id);
        console.log('Job data:', app.job);
        
        // Determine department based on job title
        let department = app.job?.department || app.company || 'Unknown Department';
        const jobTitle = (app.jobTitle || app.job?.title || '').toLowerCase();
        
        // Override department based on job title keywords
        if (jobTitle.includes('dev') || 
            jobTitle.includes('react') || 
            jobTitle.includes('frontend') || 
            jobTitle.includes('backend') || 
            jobTitle.includes('engineer')) {
          department = 'Engineering';
        } else if (jobTitle.includes('market') || jobTitle.includes('brand')) {
          department = 'Marketing';
        } else if (jobTitle.includes('sales') || jobTitle.includes('account')) {
          department = 'Sales';
        }
        
        // Get the correct image URL based on department
        const imageUrl = getImageUrl(app.job?.image || app.image, department);
        console.log('Image URL:', imageUrl);
        
        // Extract applicant name
        const candidateName = app.applicant?.name || 'Unknown Candidate';
        
        return {
          ...app,
          jobTitle: app.jobTitle || app.job?.title || 'Unknown Job',
          company: department, // Use the determined department 
          location: app.location || app.job?.location || 'Unknown Location',
          type: app.type || app.job?.type || 'Full Time',
          candidateName: candidateName,
          image: imageUrl,
          resumeUrl: getResumeUrl(app.resumeUrl)
        };
      });
      
      console.log('\nFinal transformed applications:', transformedApplications);
      setApplications(transformedApplications);
      setError(null);
    } catch (err) {
      console.error('\nError in fetchApplications:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Error fetching applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('\n=== MyApplications Component Mounted ===');
    fetchApplications();

    // Set up polling for status updates every 30 seconds
    const intervalId = setInterval(fetchApplications, 30000);
    console.log('Polling interval set up');

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(intervalId);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'shortlisted':
        return 'status-shortlisted';
      case 'interviewed':
        return 'status-interviewed';
      case 'joined':
        return 'status-joined';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'shortlisted':
        return '📋';
      case 'interviewed':
        return '🗣️';
      case 'joined':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '❔';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Function to go back to showing all applications
  const handleViewAllApplications = () => {
    setShowSingleApplication(false);
    setHighlightedAppId(null);
    window.history.pushState({}, '', '/my-applications');
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please log in to view your applications.</p>
        <Link to="/auth" className="login-link">Login / Register</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="applications-loading">
        <div className="spinner"></div>
        <p>Loading your applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="applications-error">
        <p>{error}</p>
        <button onClick={fetchApplications} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="my-applications">
      <div className="applications-header">
        <div className="header-title-container">
          <h2>MY APPLICATIONS</h2>
        </div>
        {showSingleApplication && (
          <button onClick={handleViewAllApplications} className="view-all-button">
            ←
          </button>
        )}
      </div>
      
      {filteredApplications.length === 0 ? (
        <div className="no-applications">
          <p>You haven't applied for any jobs yet.</p>
          <Link to="/jobs" className="browse-jobs-link">Browse Jobs</Link>
        </div>
      ) : (
        <div className={`applications-list ${showSingleApplication ? 'single-application' : ''}`}>
          {filteredApplications.map((application) => {
            const applicationId = application._id || application.id;
            const isHighlighted = compareIds(applicationId, highlightedAppId);
            console.log('Rendering application:', applicationId, 'isHighlighted:', isHighlighted);
            
            return (
              <div 
                id={`app-${applicationId}`}
                key={applicationId} 
                className={`application-card ${isHighlighted ? 'highlighted-application' : ''}`}
                ref={el => applicationRefs.current[typeof applicationId === 'object' ? applicationId.toString() : applicationId] = el}
              >
                <div className="application-image">
                  <img 
                    src={application.image}
                    alt={application.jobTitle}
                    onError={(e) => {
                      console.log('Image load error for:', application.image);
                      e.target.onerror = null;
                      e.target.src = defaultJobImage;
                    }}
                  />
                  <div className="application-type-badge">{application.type}</div>
                  {application.status && (
                    <span className={`status-badge status-${application.status}`}>
                      {application.status === 'joined' && '✓ joined'}
                      {application.status === 'pending' && '⌛ pending'}
                      {application.status === 'rejected' && '✕ rejected'}
                      {application.status === 'shortlisted' && '📋 shortlisted'}
                      {application.status === 'interviewed' && '🗣️ interviewed'}
                    </span>
                  )}
                </div>
                
                <div className="application-content">
                  <h3 className="job-title">{application.jobTitle}</h3>
                  <div className="job-details">
                    <span className="company">{application.company}</span>
                    <span className="location">📍 {application.location}</span>
                  </div>
                  
                  <div className="application-meta">
                    <div className="meta-item">
                      <span className="meta-label">Applied:</span>
                      <span className="meta-value">{formatDate(application.createdAt)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Resume:</span>
                      <a 
                        href={application.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resume-link"
                      >
                        View Resume
                      </a>
                    </div>
                  </div>
                  
                  {application.status === 'joined' && (
                    <div className="notification-banner joined">
                      <span>🎉 Congratulations! You've been selected for this position.</span>
                    </div>
                  )}
                  
                  {application.status === 'rejected' && (
                    <div className="notification-banner rejected">
                      <span>Thank you for your interest. We've decided to move forward with other candidates.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications; 