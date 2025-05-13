import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import JobApplicationForm from './JobApplicationForm';
import JobMap from './JobMap';
import './JobMap.css';
import './JobCard.css';
import { FaHeart, FaRegHeart, FaVolumeUp, FaVolumeMute, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaMapMarkedAlt } from 'react-icons/fa';

const JobCard = ({ job }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplyMode, setIsApplyMode] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [speech, setSpeech] = useState(null);
  const [voices, setVoices] = useState([]);
  const [showMap, setShowMap] = useState(false);

  // Load available voices when component mounts
  useEffect(() => {
    // Function to load and set available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        console.log('Voices loaded:', availableVoices.length);
      }
    };

    // Load voices initially
    loadVoices();

    // Chrome requires the voiceschanged event to get voices
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cleanup
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Check if job is in favorites when component mounts
  useEffect(() => {
    const favoritesFromStorage = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
    setIsFavorite(favoritesFromStorage.some(favJob => favJob._id === job._id));
  }, [job._id]);

  // Function to handle text-to-speech
  const handleTextToSpeech = () => {
    if (isReading) {
      // Stop reading if already in progress
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    // Start reading the job description
    const description = job.description || 'No description available';
    const utterance = new SpeechSynthesisUtterance(description);
    
    // Set English voice if available
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en-') && !voice.name.includes('Google')
    ) || 
    voices.find(voice => voice.lang.includes('en-')) || 
    voices[0];

    if (englishVoice) {
      console.log('Using voice:', englishVoice.name);
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    }
    
    // Adjust speech parameters for better clarity
    utterance.rate = 0.9; // Slightly slower
    utterance.pitch = 1;
    
    // Set handlers
    utterance.onend = () => {
      setIsReading(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsReading(false);
    };
    
    // Save reference to be able to stop it later
    setSpeech(utterance);
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  };

  // Ensure speech is canceled when modal closes
  useEffect(() => {
    if (!isModalOpen && isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  }, [isModalOpen, isReading]);

  // Toggle favorite status
  const toggleFavorite = (e) => {
    e.stopPropagation(); // Prevent card click event
    
    const favorites = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
    
    if (isFavorite) {
      // Remove from favorites
      const updatedFavorites = favorites.filter(favJob => favJob._id !== job._id);
      localStorage.setItem('favoriteJobs', JSON.stringify(updatedFavorites));
    } else {
      // Add to favorites
      favorites.push(job);
      localStorage.setItem('favoriteJobs', JSON.stringify(favorites));
    }
    
    setIsFavorite(!isFavorite);
  };

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
          <button 
            className="favorite-btn" 
            onClick={toggleFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? <FaHeart className="favorite-icon active" /> : <FaRegHeart className="favorite-icon" />}
          </button>
        </div>
        <div className="job-card-content">
          <div className="job-category">{jobData.department || 'General'}</div>
          <h3 className="job-title">{jobData.title || 'Untitled Position'}</h3>
          <p className="job-description">
            {jobData.description?.substring(0, 100) || 'No description available'}...
          </p>
          <div className="job-meta">
            <div className="job-location">
              <FaMapMarkerAlt className="meta-icon" />
              <span>{jobData.location || 'Location N/A'}</span>
              <button className="view-map-btn" onClick={(e) => {
                e.stopPropagation();
                setShowMap(true);
              }} style={{ marginLeft: '10px' }}>
                <FaMapMarkedAlt /> Map
              </button>
            </div>
            <div className="job-date">
              <FaCalendarAlt className="meta-icon" />
              Posted: {formatDate(jobData.postedDate)}
            </div>
          </div>
          <div className="job-meta">
            <div className="job-type">
              <FaClock className="meta-icon" />
              {jobData.type || 'Full Time'}
            </div>
            {jobData.deadline && (
              <div className="job-deadline">
                <FaCalendarAlt className="meta-icon" />
                Due: {formatDate(jobData.deadline)}
              </div>
            )}
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
                  <FaMapMarkerAlt className="meta-icon" />
                  <span>{jobData.location || 'Location N/A'}</span>
                  <button className="view-map-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowMap(true);
                  }} style={{ marginLeft: '10px' }}>
                    <FaMapMarkedAlt /> Map
                  </button>
                </div>
                <div className="meta-item">
                  <FaClock className="meta-icon" />
                  <span>{jobData.type || 'Full Time'}</span>
                </div>
                <div className="meta-item">
                  <FaCalendarAlt className="meta-icon" />
                  <span>Posted: {formatDate(jobData.postedDate)}</span>
                </div>
              </div>
              <div className="salary-range">
                <i className="fas fa-money-bill-wave mr-2"></i>
                Salary Range: {formatSalary(jobData.salary)} per year
              </div>
            </div>

            <div className="job-description">
              <div className="description-header">
              <h3>Job Description</h3>
                <button 
                  className={`text-to-speech-btn ${isReading ? 'reading' : ''}`}
                  onClick={handleTextToSpeech}
                  title={isReading ? "Stop reading" : "Read description aloud"}
                  aria-label={isReading ? "Stop reading" : "Read description aloud"}
                >
                  {isReading ? <FaVolumeMute size={12} /> : <FaVolumeUp size={12} />}
                </button>
              </div>
              <div className="description-content">
                <p>{jobData.description || 'No description available'}</p>
              </div>
            </div>

            <div className="job-description">
              <div className="description-header">
                <h3>Required Experience</h3>
              </div>
              <div className="experience-content">
                {jobData.experienceDetails ? (
                  <div dangerouslySetInnerHTML={{ __html: jobData.experienceDetails }} />
                ) : jobData.experience ? (
                  <p style={{ fontWeight: 'bold' }}>{jobData.experience}</p>
                ) : jobData.experienceLevel ? (
                  <p style={{ fontWeight: 'bold' }}>{jobData.experienceLevel}</p>
                ) : (
                  <p>No specific experience requirements provided.</p>
                )}
              </div>
            </div>

            <div className="application-deadline-container">
              <div className="deadline-header">
                <FaCalendarAlt className="deadline-icon" />
                <h3>Application Deadline</h3>
              </div>
              <div className="deadline-date">
                {formatDate(jobData.deadline)}
              </div>
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
              style={{ backgroundColor: '#800000', borderColor: '#800000' }}
            >
              Apply Now
            </button>
          </div>
        )}
      </Modal>

      {/* Map Modal */}
      {jobData && <JobMap 
        location={jobData.location} 
        isOpen={showMap} 
        onClose={() => setShowMap(false)} 
      />}
    </>
  );
};

export default JobCard; 