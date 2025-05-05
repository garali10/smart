import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import JobApplicationForm from './JobApplicationForm';

// Inline styles for the already applied message
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
  }
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
        <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600">
            <div>
              <span className="font-medium">Department:</span> {job.department}
            </div>
            <div>
              <span className="font-medium">Location:</span> {job.location}
            </div>
            <div>
              <span className="font-medium">Job Type:</span> {job.type || job.employmentType}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-3">Salary Range</h2>
            <p className="text-gray-700">
              ${job.salary?.min?.toLocaleString() || 'N/A'} - ${job.salary?.max?.toLocaleString() || 'N/A'} per year
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-3">Experience Required</h2>
            <p className="text-gray-700">{job.experience || job.experienceLevel || 'Not specified'}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Job Description</h2>
          <div className="prose max-w-none text-gray-700">
            {job.description}
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-gray-50 p-6 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Posted on {formatDate(job.postedDate || job.createdAt)}</p>
            <p className="text-sm font-medium text-red-600">
              Application Deadline: {formatDate(job.deadline)}
            </p>
          </div>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={handleApplyClick}
          >
            Apply Now
          </button>
        </div>
      </div>
      
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl h-auto max-h-[90vh] overflow-y-auto rounded-lg">
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
    </div>
  );
};

export default JobDetails; 