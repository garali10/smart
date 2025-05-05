import React, { useState, useEffect } from "react";
import axios from 'axios';
import JobCard from './JobCard';
import './gallery.css';

export const Gallery = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setError('Failed to fetch jobs');
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Function to get default image based on department
  const getDefaultImage = (department) => {
    if (!department) return '/img/job-default.jpg';
    
    const defaultImages = {
      'Engineering': '/img/job-categories/engineering.jpg',
      'Marketing': '/img/job-categories/marketing.jpg',
      'Sales': '/img/job-categories/sales.jpg',
      'IT': '/img/job-categories/it.jpg',
      'HR': '/img/job-categories/hr.jpg',
      // Add more department mappings as needed
    };

    // Convert department to title case for matching
    const formattedDept = department.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return defaultImages[formattedDept] || '/img/job-default.jpg';
  };

  return (
    <div id="portfolio" className="text-center">
      <div className="container">
        <div className="section-title">
          <h2>Job Opportunities</h2>
          <p>Explore our latest job openings and find your perfect role</p>
        </div>
        <div className="job-listings-container">
          {loading ? (
            <div className="text-center">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-gray-500">
              No jobs available at the moment
            </div>
          ) : (
            <div className="job-grid">
              {jobs.map(job => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};