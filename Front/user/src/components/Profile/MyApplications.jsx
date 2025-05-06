import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './MyApplications.css';

const MyApplications = () => {
  const { isAuthenticated } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default image for jobs and base URL for backend
  const defaultJobImage = '/img/job-categories/engineering.jpeg';
  const baseImageUrl = 'http://localhost:5001'; // Updated to use port 5001

  const getImageUrl = (imagePath, department) => {
    if (!imagePath) {
      // Get default image based on department
      const dept = department?.toLowerCase() || '';
      if (dept.includes('engineering')) return '/img/job-categories/engineering.jpeg';
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
        
        // Get the correct image URL based on department
        const imageUrl = getImageUrl(app.job?.image || app.image, app.job?.department || app.company);
        console.log('Image URL:', imageUrl);
        
        // Extract applicant name
        const candidateName = app.applicant?.name || 'Unknown Candidate';
        
        return {
          ...app,
          jobTitle: app.jobTitle || app.job?.title || 'Unknown Job',
          company: app.company || app.job?.department || 'Unknown Department',
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
      <h2>MY APPLICATIONS</h2>
      {applications.length === 0 ? (
        <div className="no-applications">
          <p>You haven't applied for any jobs yet.</p>
          <Link to="/jobs" className="browse-jobs-link">Browse Jobs</Link>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((application) => (
            <div key={application._id} className="application-card">
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
              </div>
              
              <div className="application-content">
                <div className="application-header">
                  <div className="header-main">
                    <h3 className="job-title">{application.jobTitle}</h3>
                    <span className={`status-badge ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)} {application.status}
                    </span>
                  </div>
                  <div className="job-details">
                    <span className="location">📍 {application.location}</span>
                    {application.salary && application.salary.min > 0 && (
                      <span className="salary">
                        💰 ${application.salary.min.toLocaleString()} - ${application.salary.max.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="application-meta">
                  <div className="meta-item">
                    <span className="meta-label">Applied:</span>
                    <span className="meta-value">{formatDate(application.createdAt)}</span>
                  </div>
                  {application.deadline && (
                    <div className="meta-item">
                      <span className="meta-label">Deadline:</span>
                      <span className="meta-value">{formatDate(application.deadline)}</span>
                    </div>
                  )}
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
                
                {application.status === 'shortlisted' && (
                  <div className="notification-banner shortlisted">
                    <span>✨ You've been shortlisted! We'll contact you soon for an interview.</span>
                  </div>
                )}
                
                {application.status === 'interviewed' && (
                  <div className="notification-banner interviewed">
                    <span>🗓️ Your interview process is complete. We're reviewing our decision.</span>
                  </div>
                )}
                
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplications; 