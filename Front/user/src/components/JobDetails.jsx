import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import JobApplicationForm from './JobApplicationForm';
import JobMap from './JobMap';
import './JobMap.css';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaDollarSign, FaBriefcase, FaTimes, FaMapMarkedAlt } from 'react-icons/fa';

// Inline styles for the already applied message and close button
const styles = {
  alreadyApplied: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    position: 'relative', // Added for positioning of close button
  },
  closeX: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#ffffff',
    border: '1px solid #800000',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#800000',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
    zIndex: 10
  },
  heading: {
    color: '#e74c3c',
    marginBottom: '15px',
    fontSize: '24px',
  },
  text: {
    color: '#333',
    marginBottom: '10px',
    fontSize: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '25px',
  },
  viewButton: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    textDecoration: 'none',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    color: '#333',
    padding: '10px 20px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  detailIcon: {
    color: '#800000',
    marginRight: '8px',
    fontSize: '16px',
  },
  inlineIcon: {
    color: '#800000',
    marginRight: '5px',
    fontSize: '14px',
    verticalAlign: 'middle',
    position: 'relative',
    top: '-1px',
  },
  descriptionSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #eaeaea',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  descriptionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '2px solid #800000',
    paddingBottom: '10px',
  },
  descriptionText: {
    fontSize: '18px',
    lineHeight: '1.8',
    color: '#444',
    whiteSpace: 'pre-line',
    padding: '10px 5px',
    letterSpacing: '0.3px',
    fontWeight: '600',
  },
  descriptionIcon: {
    color: '#800000',
    marginRight: '10px',
    fontSize: '22px',
  },
};

const JobDetails = () => {
  const params = useParams();
  const { id } = params;
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [mbtiStatus, setMbtiStatus] = useState(null);
  const [checkingMbti, setCheckingMbti] = useState(false);
  const [mbtiError, setMbtiError] = useState(false);
  const [mbtiLoading, setMbtiLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Fetch job details using the ID from params
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching job details for ID:", id);
        const response = await axios.get(`http://localhost:5001/api/jobs/${id}`);
        setJob(response.data);
        setMbtiError(false);
      } catch (error) {
        console.error("Error fetching job details:", error);
        setError("Failed to load job details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id]);
  
  // Separate useEffect for auth-dependent operations
  useEffect(() => {
    // Only run these checks if the user is authenticated
    if (isAuthenticated) {
      checkMbtiStatus();
      checkIfAlreadyApplied();
    }
  }, [isAuthenticated, id]);
  
  // Effect for handling auto-open after MBTI test
  useEffect(() => {
    // Check if we should automatically open the application form
    // This happens when returning from MBTI test
    const shouldAutoOpen = localStorage.getItem('autoOpenJobApplication') === 'true';
    
    // Also check URL parameters
    const searchParams = new URLSearchParams(location.search);
    const fromMbti = searchParams.get('fromMbti') === 'true';
    
    if ((shouldAutoOpen || fromMbti) && isAuthenticated) {
      // Only open if the user hasn't already applied
      if (!alreadyApplied) {
        setShowApplicationForm(true);
      } else {
        // Show "already applied" message if user has already applied
        setAlreadyApplied(true);
      }
      
      // Clear the flag after using it
      localStorage.removeItem('autoOpenJobApplication');
      
      // Clear URL parameters
      if (fromMbti) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [location.search, isAuthenticated, alreadyApplied]);

  // Function to check MBTI status
  const checkMbtiStatus = async () => {
    try {
      setMbtiLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5001/api/tests/status/user',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("MBTI status response:", response.data);
      setMbtiStatus(response.data.status);
      setMbtiError(false);
    } catch (error) {
      console.error("Error checking MBTI status:", error);
      setMbtiError(true);
    } finally {
      setMbtiLoading(false);
    }
  };

  // Check if user has already applied to this job
  const checkIfAlreadyApplied = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(
        `http://localhost:5001/api/applications/check/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setAlreadyApplied(response.data.hasApplied);
    } catch (error) {
      console.error("Error checking application status:", error);
    }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      // Redirect to login page
      window.location.href = '/auth?redirect=' + encodeURIComponent(`/jobs/${id}`);
      return;
    }
    
    // Check if already applied
    if (alreadyApplied) {
      alert('You have already applied to this job!');
      return;
    }
    
    // Show application form
    setShowApplicationForm(true);
  };
  
  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    alert('Your application has been submitted successfully!');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!job) return <div className="text-center py-8">Job not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/jobs"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Back to Jobs
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-8">
      
        {/* Job detail styles */}
        <style jsx>{`
          .job-detail-meta {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-bottom: 8px;
          }
          
          .job-detail-meta .font-medium {
            margin-right: 5px;
          }
        `}</style>
      
        {/* Close button in the top right corner */}
        <button 
          onClick={() => window.history.back()} 
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#ffffff',
            border: '1px solid #800000',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#800000',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8d7da';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        
        <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600">
            <div className="job-detail-meta">
              <FaBriefcase style={styles.detailIcon} />
              <span className="font-medium">Department:</span> {job.department}
            </div>
            <div className="job-detail-meta">
              <FaMapMarkerAlt style={styles.detailIcon} />
              <span className="font-medium">Location:</span> {job.location}
              <button 
                className="view-map-btn" 
                onClick={() => setShowMap(true)}
                style={{ marginLeft: '10px' }}
              >
                <FaMapMarkedAlt /> View Map
              </button>
            </div>
            <div className="job-detail-meta">
              <FaClock style={styles.detailIcon} />
              <span className="font-medium">Job Type:</span> {job.type || job.employmentType}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="job-detail-meta">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaDollarSign style={styles.detailIcon} />
              <h2 className="text-xl font-semibold mb-3">Salary Range</h2>
            </div>
            <p className="text-gray-700">
              ${job.salary?.min?.toLocaleString() || 'N/A'} - ${job.salary?.max?.toLocaleString() || 'N/A'} per year
            </p>
          </div>
          <div className="job-detail-meta">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaBriefcase style={styles.detailIcon} />
              <h2 className="text-xl font-semibold mb-3">Experience Required</h2>
            </div>
            <p className="text-gray-700">{job.experience || job.experienceLevel || 'Not specified'}</p>
          </div>
        </div>

        <div className="mb-8" style={styles.descriptionSection}>
          <h2 style={styles.descriptionTitle}>
            <FaBriefcase style={styles.descriptionIcon} />
            Job Description
          </h2>
          <div style={styles.descriptionText}>
            {job.description ? (
              <p style={{ fontWeight: 'bold' }}>{job.description}</p>
            ) : (
              <p>No description available for this position. Please contact the hiring manager for more information.</p>
            )}
          </div>
        </div>

        <div className="mb-8" style={styles.descriptionSection}>
          <h2 style={styles.descriptionTitle}>
            <FaBriefcase style={styles.descriptionIcon} />
            Required Experience
          </h2>
          <div style={styles.descriptionText}>
            {job.experienceDetails ? (
              <div dangerouslySetInnerHTML={{ __html: job.experienceDetails }} />
            ) : job.experience ? (
              <p style={{ padding: '5px 0', fontWeight: 'bold' }}>{job.experience}</p>
            ) : job.experienceLevel ? (
              <p style={{ padding: '5px 0', fontWeight: 'bold' }}>{job.experienceLevel}</p>
            ) : (
              <p>No specific experience requirements provided.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-gray-50 p-6 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">
              <FaCalendarAlt style={styles.inlineIcon} /> Posted on {formatDate(job.postedDate || job.createdAt)}
            </p>
            <p className="text-sm font-medium text-red-600">
              <FaCalendarAlt style={styles.inlineIcon} /> Application Deadline: {formatDate(job.deadline)}
            </p>
          </div>
          <button
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            style={{ backgroundColor: '#800000', borderColor: '#800000', borderRadius: '0.375rem' }}
            onClick={handleApplyClick}
          >
            Apply Now
          </button>
        </div>
      </div>
      
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl h-auto max-h-[90vh] overflow-y-auto rounded-lg relative">
            <button 
              onClick={() => setShowApplicationForm(false)} 
              className="absolute top-3 right-3 z-10 text-gray-500 hover:text-red-600 transition-colors"
              style={{
                background: '#ffffff',
                border: '1px solid #800000',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#800000',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f8d7da';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <JobApplicationForm 
              job={job} 
              onClose={() => setShowApplicationForm(false)}
              onSuccess={handleApplicationSuccess}
            />
          </div>
        </div>
      )}
      
      {alreadyApplied && (
        <div className="already-applied-message" style={styles.alreadyApplied}>
          <div className="message-content" style={styles.messageContent}>
            <button 
              onClick={() => setAlreadyApplied(false)}
              style={styles.closeX}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f8d7da';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              &times;
            </button>
            <h3 style={styles.heading}>Application Already Submitted</h3>
            <p style={styles.text}>You have already applied to this job position.</p>
            <p style={styles.text}>You can check the status of your application in your profile under "My Applications".</p>
            <div className="message-actions" style={styles.actions}>
              <Link to="/my-applications" className="check-applications-btn" style={styles.viewButton}>
                View My Applications
              </Link>
              <button onClick={() => setAlreadyApplied(false)} className="close-message-btn" style={styles.closeButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {job && <JobMap 
        location={job.location} 
        isOpen={showMap} 
        onClose={() => setShowMap(false)} 
      />}
    </div>
  );
};

export default JobDetails; 