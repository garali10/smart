import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';

const Results = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/jobs');
        if (isMounted) {
          setJobs(response.data);
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

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center text-red-600">{error}</div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Job Opportunities</h1>
      <div className="max-w-4xl mx-auto">
        {jobs.length === 0 ? (
          <div className="text-center text-gray-500">
            No jobs available at the moment
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map(job => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results; 