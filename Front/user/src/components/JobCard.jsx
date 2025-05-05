import React, { useState } from 'react';
import Modal from './Modal';
import JobApplicationForm from './JobApplicationForm';
import './JobCard.css';

const JobCard = ({ job }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplyMode, setIsApplyMode] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Ensure job data is properly structured
  const jobData = {
    ...job,
    company: 'Cloud',
    type: job.type || 'Full Time',
    location: job.location || 'Remote',
  };

  // Map departments to category images
  const categoryImages = {
    engineering: '/img/job-categories/engineering.jpeg',
    marketing: '/img/job-categories/marketing.jpeg',
    sales: '/img/job-categories/sales.jpeg',
    // Add more categories as needed
  };

  // Default image if no specific or category image is found
  const defaultImage = '/img/job-default.jpg';

  // Determine the image source
  const getImageSrc = (job) => {
    const departmentKey = job?.department?.toLowerCase();
    return categoryImages[departmentKey] || defaultImage;
  };
  
  const imageSrc = getImageSrc(jobData); // Calculate image source

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatSalary = (salary) => {
    if (!salary || !salary.min || !salary.max) return 'Salary not specified';
    return `$${salary.min.toLocaleString()} - $${salary.max.toLocaleString()}`;
  };

  // Handle successful application submission
  const handleApplicationSuccess = () => {
    setApplicationSuccess(true);
    setIsApplyMode(false);
    setHasApplied(true);
  };

  return (
    <>
      <div className="job-card">
        <div className="job-card-image">
          <img src={imageSrc} alt={jobData.title || 'Job Category'} />
          <div className="job-type-badge">{jobData.type || 'Full Time'}</div>
        </div>
        <div className="job-card-content">
          <div className="job-category">{jobData.department || 'General'}</div>
          <h3 className="job-title">{jobData.title || 'Untitled Position'}</h3>
          <p className="job-description">
            {jobData.description?.substring(0, 100) || 'No description available'}...
          </p>
          <div className="job-meta">
            <div className="job-location">
              <i className="fa fa-map-marker"></i>
              {jobData.location || 'Location N/A'}
            </div>
            <div className="job-date">
              Posted: {formatDate(jobData.postedDate)}
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="view-job-btn">
            Learn More
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setIsApplyMode(false);
        setApplicationSuccess(false);
      }}>
        {isApplyMode ? (
          <JobApplicationForm 
            job={jobData} 
            onClose={() => setIsApplyMode(false)} 
            onSuccess={handleApplicationSuccess}
          />
        ) : applicationSuccess ? (
          <div className="application-success">
            <div className="success-icon">✓</div>
            <h2>Application Submitted!</h2>
            <p>Thank you for applying to {jobData.title}. Your application has been received.</p>
            <p>We will review your credentials and contact you if your qualifications match our needs.</p>
            <button 
              className="close-btn" 
              onClick={() => {
                setIsModalOpen(false);
                setApplicationSuccess(false);
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div className="job-details">
            <div className="job-details-header">
              <div className="job-image">
                <img src={imageSrc} alt={jobData.title || 'Job Category'} />
                <div className="job-type-badge">{jobData.type || 'Full Time'}</div>
              </div>
              <h2>{jobData.title}</h2>
              <div className="job-meta-info">
                <div className="meta-item">
                  <i className="fas fa-building"></i>
                  <span>{jobData.department || 'General'}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{jobData.location || 'Location N/A'}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-briefcase"></i>
                  <span>{jobData.type || 'Full Time'}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-calendar"></i>
                  <span>Posted: {formatDate(jobData.postedDate)}</span>
                </div>
              </div>
              <div className="salary-range">
                <i className="fas fa-money-bill-wave mr-2"></i>
                Salary Range: {formatSalary(jobData.salary)} per year
              </div>
            </div>

            <div className="job-description">
              <h3>Job Description</h3>
              <p>{jobData.description || 'No description available'}</p>
            </div>

            <div className="job-description">
              <h3>Required Experience</h3>
              <p>{jobData.experience || 'Experience requirements not specified'}</p>
            </div>

            <div className="application-deadline">
              <i className="fas fa-clock mr-2"></i>
              Application Deadline: {formatDate(jobData.deadline)}
            </div>

            {hasApplied && (
              <div style={{
                color: '#22c55e',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '10px 0'
              }}>
                Applied
              </div>
            )}

            <button
              className="apply-button"
              onClick={() => setIsApplyMode(true)}
              disabled={hasApplied}
            >
              Apply Now
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default JobCard; 