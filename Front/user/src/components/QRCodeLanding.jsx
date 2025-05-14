import React, { useState, useEffect } from 'react';
import { FaBriefcase, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import './QRCodeLanding.css';

const QRCodeLanding = () => {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Get the application data from the URL hash
      const hashData = window.location.hash.substring(1);
      if (hashData) {
        const decodedData = decodeURIComponent(hashData);
        const applicationData = JSON.parse(decodedData);
        setApplication(applicationData);
      } else {
        setError('No application data found');
      }
    } catch (err) {
      console.error('Error parsing application data:', err);
      setError('Invalid application data');
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="qr-landing-container">
        <div className="qr-landing-loader"></div>
        <p>Loading application details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-landing-container">
        <div className="qr-landing-error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="qr-landing-container">
        <div className="qr-landing-error">
          <h2>No Data Found</h2>
          <p>No application details were found in this QR code.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'shortlisted':
        return '#3b82f6';
      case 'interviewed':
        return '#8b5cf6';
      case 'joined':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳';
      case 'shortlisted':
        return '📋';
      case 'interviewed':
        return '🗣️';
      case 'joined':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '❔';
    }
  };

  return (
    <div className="qr-landing-container">
      <div className="qr-landing-card">
        <div className="qr-landing-header">
          <h1>Application Details</h1>
          <div className="qr-status-badge" style={{ backgroundColor: getStatusColor(application.status) }}>
            <span>{getStatusIcon(application.status)}</span>
            <span>{application.status || 'Unknown'}</span>
          </div>
        </div>

        <div className="qr-landing-content">
          <div className="qr-info-item">
            <FaBriefcase className="qr-icon" />
            <div>
              <h3>Position</h3>
              <p>{application.position || 'Not specified'}</p>
            </div>
          </div>

          <div className="qr-info-item">
            <FaBuilding className="qr-icon" />
            <div>
              <h3>Company</h3>
              <p>{application.company || 'Not specified'}</p>
            </div>
          </div>

          <div className="qr-info-item">
            <FaMapMarkerAlt className="qr-icon" />
            <div>
              <h3>Location</h3>
              <p>{application.location || 'Not specified'}</p>
            </div>
          </div>

          <div className="qr-info-item">
            <FaCalendarAlt className="qr-icon" />
            <div>
              <h3>Applied Date</h3>
              <p>{formatDate(application.appliedDate)}</p>
            </div>
          </div>
        </div>

        {application.status?.toLowerCase() === 'interviewed' && (
          <div className="qr-landing-message success">
            <FaCheckCircle />
            <span>You've been interviewed for this position!</span>
          </div>
        )}
      </div>

      <div className="qr-landing-footer">
        <p>Job application information scanned from QR code</p>
      </div>
    </div>
  );
};

export default QRCodeLanding; 