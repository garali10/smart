import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './JobApplicationForm.css';

const JobApplicationForm = ({ job, onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    coverLetter: '',
  });
  const [resume, setResume] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [mbtiResult, setMbtiResult] = useState(null);
  const [mbtiScores, setMbtiScores] = useState(null);
  const [mbtiStatus, setMbtiStatus] = useState('loading');

  // Fetch MBTI data when component mounts
  useEffect(() => {
    const fetchMbti = async () => {
      if (!isAuthenticated) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/tests/status/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('MBTI test status response:', response.data);
        
        setMbtiStatus(response.data.status);
        
        if (response.data && response.data.status === 'completed') {
          setMbtiResult(response.data.result?.personalityType || response.data.result);
          setMbtiScores(response.data.result?.dimensionScores || {});
          console.log('MBTI data loaded:', response.data.result);
        }
      } catch (err) {
        console.error('Error fetching MBTI data:', err);
        setMbtiResult(null);
        setMbtiScores(null);
        setMbtiStatus('error');
      }
    };
    
    fetchMbti();
  }, [isAuthenticated]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setResume(null);
      return;
    }
    
    // Check file type
    const validTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExtension.toLowerCase())) {
      setFileError('Invalid file type. Please upload a PDF, DOC, or DOCX file.');
      e.target.value = '';
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File is too large. Maximum file size is 5MB.');
      e.target.value = '';
      return;
    }
    
    setFileError('');
    setResume(file);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setErrorMessage('You must be logged in to apply for a job.');
      return;
    }
    
    if (!resume) {
      setFileError('Please upload your resume.');
      return;
    }
    
    // Better job ID validation
    if (!job || !job._id) {
      console.error('Invalid job data:', job);
      setErrorMessage('Job information is missing or invalid. Please try again.');
      return;
    }
    
    console.log('Job data being used for application:', {
      _id: job._id,
      title: job.title,
      company: job.company,
      jobObject: job
    });
    
    // Check if MBTI test is completed
    if (mbtiStatus !== 'completed') {
      console.log('MBTI test not completed. Redirecting to test page.');
      
      // Save application data in localStorage to resume after MBTI test
      const pendingApplication = {
        jobId: job._id,
        jobTitle: job.title,
        company: job.company || '',
        location: job.location || '',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        coverLetter: formData.coverLetter,
        // We can't store the file in localStorage, but we'll mark that one was selected
        hasResume: !!resume
      };
      
      localStorage.setItem('pendingApplication', JSON.stringify(pendingApplication));
      localStorage.setItem('returnToApplication', 'true');
      
      // Redirect to MBTI test
      window.location.href = '/mbti-test?returnToJob=' + encodeURIComponent(job._id);
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setErrorMessage('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      const applicationData = new FormData();
      applicationData.append('jobId', job._id);
      applicationData.append('jobTitle', job.title);
      applicationData.append('company', job.company || '');
      applicationData.append('location', job.location || '');
      applicationData.append('name', formData.name);
      applicationData.append('email', formData.email);
      applicationData.append('phone', formData.phone);
      applicationData.append('coverLetter', formData.coverLetter);
      applicationData.append('resume', resume);
      
      // Add MBTI data if available
      if (mbtiResult) applicationData.append('mbtiResult', mbtiResult);
      if (mbtiScores) applicationData.append('mbtiScores', JSON.stringify(mbtiScores));
      
      console.log('Submitting application for job:', { 
        jobId: job._id,
        jobTitle: job.title,
        mbtiResult, 
        hasResume: !!resume
      });
      
      // For debugging - log all form data
      for (let pair of applicationData.entries()) {
        console.log(pair[0] + ': ' + (pair[0] === 'resume' ? 'File object' : pair[1]));
      }
      
      const response = await axios.post(
        'http://localhost:5001/api/applications',
        applicationData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Application submission response:', response.data);
      
      if (response.status === 201) {
        // Clear any pending application data from localStorage
        localStorage.removeItem('pendingApplication');
        localStorage.removeItem('returnToApplication');
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Application submission error:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Complete error object:', JSON.stringify(error.response.data));
      }
      
      if (error.response?.data?.message === 'MBTI test required') {
        setErrorMessage(
          <span>
            You must complete the MBTI test before applying. Please go to your profile to take the test.<br />
            <a href="/mbti-test?returnToJob=${job._id}" className="mbti-test-btn">Take MBTI Test</a>
          </span>
        );
      } else if (error.response?.status === 404) {
        setErrorMessage('The job you are trying to apply for could not be found. It may have been removed or is no longer available.');
      } else {
        setErrorMessage(error.response?.data?.message || 'An error occurred while submitting your application.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-application-form">
      <h2>Apply for {job?.title || 'Unknown Job'}</h2>
      
      {!isAuthenticated ? (
        <div className="auth-warning">
          <p>You need to be logged in to apply for this job.</p>
          <a href="/auth" className="login-btn">Login / Register</a>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">Full Name*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="text-input"
              required
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address*</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="text-input"
              required
              placeholder="Enter your email address"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number*</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="text-input"
              required
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="resume">Resume/CV* (PDF, DOC, DOCX, max 5MB)</label>
            <input
              type="file"
              id="resume"
              name="resume"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              required
            />
            {fileError && <div className="error-message">{fileError}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="coverLetter">Cover Letter (Optional)</label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleChange}
              rows="5"
              placeholder="Tell us why you're interested in this position"
            ></textarea>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 
               mbtiStatus === 'loading' ? 'Checking MBTI Status...' :
               mbtiStatus !== 'completed' ? 'Continue to MBTI Test' : 'Apply'}
            </button>
          </div>
          
          {mbtiStatus === 'loading' && (
            <div className="info-message">
              Checking your MBTI test status...
            </div>
          )}
          
          {mbtiStatus !== 'completed' && mbtiStatus !== 'loading' && (
            <div className="info-message">
              You need to complete the MBTI test before applying. Clicking "Continue to MBTI Test" will take you there.
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default JobApplicationForm; 