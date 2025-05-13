import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import JobCard from './JobCard';
import './gallery.css';
import { useTranslation } from "react-i18next";

export const Gallery = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(6);
  const [animationDirection, setAnimationDirection] = useState(null);
  const jobGridRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/jobs');
        if (isMounted) {
          // Filter out draft jobs and add default images
          const activeJobs = response.data.filter(job => job.status === 'active');
          const jobsWithImages = activeJobs.map(job => ({
            ...job,
            image: job.image || getDefaultImage(job.department)
          }));
          setJobs(jobsWithImages);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(t('jobs.error'));
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, [t]);

  // Function to get default image based on department
  const getDefaultImage = (department) => {
    if (!department) return '/img/job-default.jpg';
    
    const defaultImages = {
      'Engineering': '/img/job-categories/engineering.jpeg',
      'Marketing': '/img/job-categories/marketing.jpeg',
      'Sales': '/img/job-categories/sales.jpeg',
      'IT': '/img/job-categories/it.jpeg',
      'HR': '/img/job-categories/hr.jpeg',
      // Add more department mappings as needed
    };

    // Convert department to title case for matching
    const formattedDept = department.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return defaultImages[formattedDept] || '/img/job-default.jpg';
  };

  // Get current jobs for pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);

  // Split the current jobs into two rows
  const halfwayPoint = Math.ceil(currentJobs.length / 2);
  const firstRowJobs = currentJobs.slice(0, halfwayPoint);
  const secondRowJobs = currentJobs.slice(halfwayPoint);

  // Change page with animation
  const nextPage = () => {
    if (currentPage < Math.ceil(jobs.length / jobsPerPage)) {
      setAnimationDirection('right');
      
      // Apply animation class
      if (jobGridRef.current) {
        jobGridRef.current.classList.add('slide-out-left');
        
        // Wait for animation to complete before changing page
        setTimeout(() => {
          setCurrentPage(currentPage + 1);
          
          // Reset animation after page change
          setTimeout(() => {
            if (jobGridRef.current) {
              jobGridRef.current.classList.remove('slide-out-left');
              jobGridRef.current.classList.add('slide-in-right');
              
              // Remove the entrance animation class after it completes
              setTimeout(() => {
                if (jobGridRef.current) {
                  jobGridRef.current.classList.remove('slide-in-right');
                }
              }, 500);
            }
          }, 50);
        }, 300);
      }
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setAnimationDirection('left');
      
      // Apply animation class
      if (jobGridRef.current) {
        jobGridRef.current.classList.add('slide-out-right');
        
        // Wait for animation to complete before changing page
        setTimeout(() => {
          setCurrentPage(currentPage - 1);
          
          // Reset animation after page change
          setTimeout(() => {
            if (jobGridRef.current) {
              jobGridRef.current.classList.remove('slide-out-right');
              jobGridRef.current.classList.add('slide-in-left');
              
              // Remove the entrance animation class after it completes
              setTimeout(() => {
                if (jobGridRef.current) {
                  jobGridRef.current.classList.remove('slide-in-left');
                }
              }, 500);
            }
          }, 50);
        }, 300);
      }
    }
  };

  // Add CSS styles for animations
  const animationStyles = `
    @keyframes slideOutLeft {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(-50px); opacity: 0; }
    }
    
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(50px); opacity: 0; }
    }
    
    @keyframes slideInLeft {
      from { transform: translateX(-50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
      from { transform: translateX(50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    .slide-out-left {
      animation: slideOutLeft 300ms ease-in-out forwards;
    }
    
    .slide-out-right {
      animation: slideOutRight 300ms ease-in-out forwards;
    }
    
    .slide-in-left {
      animation: slideInLeft 300ms ease-in-out forwards;
    }
    
    .slide-in-right {
      animation: slideInRight 300ms ease-in-out forwards;
    }
  `;

  return (
    <div id="portfolio" className="text-center">
      <style>{animationStyles}</style>
      <div className="container">
        <div className="section-title">
          <h2>{t('jobs.title')}</h2>
          <p>{t('jobs.description')}</p>
        </div>
        <div className="job-listings-container">
          {loading ? (
            <div className="text-center">{t('jobs.loading')}</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-gray-500">
              {t('jobs.noJobs')}
            </div>
          ) : (
            <>
              {/* Jobs container with animation applied to both rows */}
              <div ref={jobGridRef}>
                {/* First row of jobs */}
                <div className="job-grid">
                  {firstRowJobs.map(job => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
                
                {/* Pagination between rows */}
                {jobs.length > jobsPerPage && (
                  <div className="pagination" style={{ margin: '30px 0' }}>
                    <button 
                      onClick={prevPage} 
                      className={`pagination-arrow prev ${currentPage === 1 ? 'disabled' : 'pulse-animation'}`}
                      disabled={currentPage === 1}
                      style={{
                        ...currentPage > 1 ? {animation: 'pulse 2s infinite'} : {},
                        left: '-80px',
                        backgroundColor: '#800000',
                        boxShadow: '0 4px 10px rgba(128, 0, 0, 0.3)'
                      }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button 
                      onClick={nextPage} 
                      className={`pagination-arrow next ${currentPage === Math.ceil(jobs.length / jobsPerPage) ? 'disabled' : 'pulse-animation'}`}
                      disabled={currentPage === Math.ceil(jobs.length / jobsPerPage)}
                      style={{
                        ...currentPage < Math.ceil(jobs.length / jobsPerPage) ? {animation: 'pulse 2s infinite'} : {},
                        right: '-80px',
                        backgroundColor: '#800000',
                        boxShadow: '0 4px 10px rgba(128, 0, 0, 0.3)'
                      }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Second row of jobs */}
                <div className="job-grid">
                  {secondRowJobs.map(job => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              </div>
              
              {/* Page number indicator at the bottom */}
              {jobs.length > jobsPerPage && (
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <span className="pagination-info" style={{ padding: '12px 24px', borderBottom: '2px solid #800000' }}>
                    Page {currentPage} of {Math.ceil(jobs.length / jobsPerPage)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};