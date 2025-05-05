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
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
  });

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

  // Validation functions
  const validateField = (name, value) => {
    // Check for empty fields first with custom messages
    if (!value || value.trim() === '') {
      switch (name) {
        case 'name':
          return 'Please enter your full name';
        case 'email':
          return 'Please enter your email address';
        case 'phone':
          return 'Please enter your phone number';
        case 'coverLetter':
          return 'Please write your cover letter';
        default:
          return 'This field is required';
      }
    }
    
    switch (name) {
      case 'name':
        return value.trim().length < 2 ? 'Name must be at least 2 characters long' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email address' : '';
      case 'phone':
        return !/^\+?[\d\s-]{8,}$/.test(value) ? 'Please enter a valid phone number (minimum 8 digits)' : '';
      case 'coverLetter':
        return value.trim().length < 20 ? 'Cover letter must be at least 20 characters long' : '';
      default:
        return '';
    }
  };

  // Handle field blur for immediate validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Enhanced handle change with validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Validate on change to show/clear errors immediately
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Validate all fields before submission
  const validateForm = () => {
    const errors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) errors[key] = error;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle file selection with validation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setResume(null);
      setFileError('Please select your resume');
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

  // Enhanced submit handler with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setErrorMessage('You must be logged in to apply for a job.');
      return;
    }
    
    if (!validateForm()) {
      setErrorMessage('Please fix the errors in the form before submitting.');
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
      applicationData.append('jobTitle', job.title || '');
      applicationData.append('company', 'Cloud');
      applicationData.append('location', job.location || '');
      applicationData.append('name', formData.name);
      applicationData.append('email', formData.email);
      applicationData.append('phone', formData.phone);
      applicationData.append('coverLetter', formData.coverLetter);
      applicationData.append('resume', resume);
      applicationData.append('department', 'Cloud');
      
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
        <form onSubmit={handleSubmit} className="application-form" noValidate>
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">
              Full Name <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={formErrors.name ? 'error' : ''}
              />
              {formErrors.name && (
                <div className="error-indicator">
                  <span className="error-icon">!</span>
                  <span className="field-error">{formErrors.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={formErrors.email ? 'error' : ''}
              />
              {formErrors.email && (
                <div className="error-indicator">
                  <span className="error-icon">!</span>
                  <span className="field-error">{formErrors.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={formErrors.phone ? 'error' : ''}
              />
              {formErrors.phone && (
                <div className="error-indicator">
                  <span className="error-icon">!</span>
                  <span className="field-error">{formErrors.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="resume">
              Resume (PDF, DOC, or DOCX) <span className="required">*</span>
            </label>
            <div className="file-upload-container">
              <input
                type="file"
                id="resume"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className={fileError ? 'error' : ''}
              />
              <div className="file-upload-info">
                {resume && <span className="file-name">{resume.name}</span>}
                {fileError && (
                  <div className="error-indicator">
                    <span className="error-icon">!</span>
                    <span className="field-error">{fileError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="coverLetter">
              Cover Letter <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <textarea
                id="coverLetter"
                name="coverLetter"
                value={formData.coverLetter}
                onChange={handleChange}
                onBlur={handleBlur}
                className={formErrors.coverLetter ? 'error' : ''}
                rows="6"
              />
              {formErrors.coverLetter && (
                <div className="error-indicator">
                  <span className="error-icon">!</span>
                  <span className="field-error">{formErrors.coverLetter}</span>
                </div>
              )}
              <div className="textarea-footer">
                <span className="character-count">
                  {formData.coverLetter.length} characters
                  {formData.coverLetter.length < 20 && ' (minimum 20)'}
                </span>
              </div>
            </div>
          </div>

          {mbtiStatus === 'completed' && mbtiResult && (
            <div className="mbti-info">
              <p>Your MBTI Type: <strong>{mbtiResult}</strong></p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default JobApplicationForm; 