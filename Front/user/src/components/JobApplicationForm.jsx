import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './JobApplicationForm.css';
import StepsIndicator from './StepsIndicator';
import { Link } from 'react-router-dom';

const JobApplicationForm = ({ job, onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
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

  // Load saved application data when component mounts
  useEffect(() => {
    const savedApplication = localStorage.getItem('pendingApplication');
    if (savedApplication) {
      const parsedData = JSON.parse(savedApplication);
      // Only restore if it's for the same job
      if (parsedData.jobId === job._id) {
        setFormData({
          name: parsedData.name || formData.name,
          email: parsedData.email || formData.email,
          phone: parsedData.phone || '',
          coverLetter: parsedData.coverLetter || '',
        });
        
        // Check for stored step in localStorage (from MBTI test return)
        const storedStep = localStorage.getItem('currentJobApplicationStep');
        if (storedStep) {
          setCurrentStep(parseInt(storedStep, 10));
          // Clear the stored step after using it
          localStorage.removeItem('currentJobApplicationStep');
        } else {
          // Use the saved step from application data if no direct step override exists
          setCurrentStep(parsedData.currentStep || 1);
        }
      }
    }
    
    // Check if user has already applied to this job
    const checkIfAlreadyApplied = async () => {
      if (!isAuthenticated) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5001/api/applications/check/${job._id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.hasApplied) {
          setErrorMessage(
            <div className="already-applied-message">
              <h3>You've Already Applied</h3>
              <p>You have already submitted an application for this position.</p>
              <p>You can check your application status in your profile.</p>
              <Link to="/my-applications" className="view-applications-btn">
                View My Applications
              </Link>
            </div>
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking application status:', err);
      }
    };
    
    checkIfAlreadyApplied();
  }, [job._id, isAuthenticated]);

  // Fetch MBTI data when component mounts
  useEffect(() => {
    const fetchMbti = async () => {
      if (!isAuthenticated) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/tests/status/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setMbtiStatus(response.data.status);
        
        if (response.data && response.data.status === 'completed') {
          setMbtiResult(response.data.result?.personalityType || response.data.result);
          setMbtiScores(response.data.result?.dimensionScores || {});
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

  // Add this useEffect to handle return from MBTI test
  useEffect(() => {
    // Check if returning from MBTI test and get URL parameters
    const params = new URLSearchParams(window.location.search);
    const fromMbti = params.get('fromMbti');
    const stepParam = params.get('step');
    
    // If step parameter exists, set the current step
    if (stepParam) {
      const stepNumber = parseInt(stepParam, 10);
      if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= 3) {
        setCurrentStep(stepNumber);
      }
    }
    
    // Also check for the override from localStorage (this takes precedence)
    const storedStep = localStorage.getItem('currentJobApplicationStep');
    if (storedStep) {
      setCurrentStep(parseInt(storedStep, 10));
      // Clear after using
      localStorage.removeItem('currentJobApplicationStep');
    }
    
    if (fromMbti === 'true') {
      // Clear the URL parameter without page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Show success message about MBTI test completion
      setErrorMessage(
        <span className="success-message">
          MBTI test completed successfully! You can now continue with your application.
        </span>
      );
      
      // Fetch updated MBTI status
      const fetchMbti = async () => {
        if (!isAuthenticated) return;
        
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:5001/api/tests/status/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setMbtiStatus(response.data.status);
          
          if (response.data && response.data.status === 'completed') {
            setMbtiResult(response.data.result?.personalityType || response.data.result);
            setMbtiScores(response.data.result?.dimensionScores || {});
          }
        } catch (err) {
          console.error('Error fetching MBTI data:', err);
        }
      };
      
      fetchMbti();
    }
  }, [isAuthenticated, job._id]);

  // Save application progress
  const saveApplicationProgress = () => {
    const applicationData = {
      jobId: job._id,
      jobTitle: job.title,
      company: job.company || '',
      location: job.location || '',
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      coverLetter: formData.coverLetter,
      currentStep: currentStep,
      hasResume: !!resume
    };
    localStorage.setItem('pendingApplication', JSON.stringify(applicationData));
    localStorage.setItem('returnToApplication', 'true');
  };

  // Validation functions
  const validateField = (name, value) => {
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

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        const personalInfoErrors = {};
        ['name', 'email', 'phone'].forEach(field => {
          const error = validateField(field, formData[field]);
          if (error) personalInfoErrors[field] = error;
        });
        setFormErrors(personalInfoErrors);
        return Object.keys(personalInfoErrors).length === 0;
      
      case 2:
        const documentErrors = {};
        if (!resume) {
          setFileError('Please select your resume');
          return false;
        }
        if (formData.coverLetter.trim().length < 20) {
          documentErrors.coverLetter = 'Cover letter must be at least 20 characters long';
          setFormErrors(documentErrors);
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setResume(null);
      setFileError('Please select your resume');
      return;
    }
    
    const validTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExtension.toLowerCase())) {
      setFileError('Invalid file type. Please upload a PDF, DOC, or DOCX file.');
      e.target.value = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File is too large. Maximum file size is 5MB.');
      e.target.value = '';
      return;
    }
    
    setFileError('');
    setResume(file);
  };

  const handleNext = () => {
    if (validateStep()) {
      saveApplicationProgress();
      
      // If moving from step 2 to step 3, check if MBTI test is completed
      if (currentStep === 2 && mbtiStatus !== 'completed') {
        setErrorMessage(
          <span>
            You must complete the MBTI test before proceeding to review your application.
            Please use the "Take MBTI Test" button in the MBTI Assessment section.
          </span>
        );
        return;
      }
      
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setErrorMessage('You must be logged in to apply for a job.');
      return;
    }
    
    if (!validateStep()) {
      setErrorMessage('Please fix the errors in the form before submitting.');
      return;
    }
    
    if (!resume) {
      setFileError('Please upload your resume.');
      return;
    }
    
    // Check if MBTI test is completed
    if (mbtiStatus !== 'completed') {
      console.log('MBTI test not completed. Saving progress and redirecting...');
      saveApplicationProgress();
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
      
      if (mbtiResult) applicationData.append('mbtiResult', mbtiResult);
      if (mbtiScores) applicationData.append('mbtiScores', JSON.stringify(mbtiScores));
      
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
      
      if (response.status === 201) {
        // Clear saved application data after successful submission
        localStorage.removeItem('pendingApplication');
        localStorage.removeItem('returnToApplication');
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Application submission error:', error);
      
      if (error.response?.data?.message === 'MBTI test required') {
        saveApplicationProgress();
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
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
          </>
        );

      case 2:
        return (
          <>
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
            
            <div className="form-group mbti-section">
              <h4>MBTI Assessment</h4>
              {mbtiStatus === 'completed' ? (
                <div className="mbti-complete">
                  <p>✓ MBTI Test Completed - Your Type: {mbtiResult}</p>
                </div>
              ) : (
                <div className="mbti-required">
                  <p>You must complete the MBTI test before proceeding to the next step.</p>
                  <button 
                    type="button" 
                    className="mbti-test-btn" 
                    onClick={() => {
                      saveApplicationProgress();
                      window.location.href = '/mbti-test?returnToJob=' + encodeURIComponent(job._id);
                    }}
                  >
                    Take MBTI Test
                  </button>
                </div>
              )}
            </div>
          </>
        );

      case 3:
        return (
          <div className="review-step">
            <h3>Review Your Application</h3>
            <div className="review-section">
              <h4>Personal Information</h4>
              <p><strong>Name:</strong> {formData.name}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Phone:</strong> {formData.phone}</p>
            </div>
            <div className="review-section">
              <h4>Documents</h4>
              <p><strong>Resume:</strong> {resume?.name}</p>
              <p><strong>Cover Letter:</strong></p>
              <div className="cover-letter-preview">
                {formData.coverLetter}
              </div>
            </div>
            {mbtiStatus === 'completed' && mbtiResult && (
              <div className="review-section">
                <h4>MBTI Profile</h4>
                <p><strong>Your Type:</strong> {mbtiResult}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
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
        <>
          <StepsIndicator currentStep={currentStep} />
          
          <form onSubmit={handleSubmit} className="application-form" noValidate>
            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}
            
            {renderStepContent()}

            <div className="form-actions">
              {currentStep > 1 && (
                <button type="button" onClick={handleBack} className="back-btn">
                  Back
                </button>
              )}
              
              {currentStep < 3 ? (
                <button type="button" onClick={handleNext} className="next-btn">
                  Next
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default JobApplicationForm; 