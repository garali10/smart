import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTimes } from 'react-icons/fa';
import './QRCodeModal.css';

const QRCodeModal = ({ isOpen, onClose, application }) => {
  if (!isOpen) return null;

  // Extract application details
  const position = application.jobTitle || application.position || 'Unknown Position';
  const company = application.company || 'Unknown Company';
  const location = application.location || 'Unknown Location';
  const status = application.status || 'Unknown Status';
  const appliedDate = application.createdAt || application.appliedDate || new Date().toISOString();
  
  // Format the date in a readable format
  const formattedDate = new Date(appliedDate).toLocaleDateString();
  
  // Get the base URL of the current application
  const baseUrl = window.location.origin;
  
  // Create a URL to our template page with query parameters
  const templateUrl = `${baseUrl}/qr-template.html?position=${encodeURIComponent(position)}&company=${encodeURIComponent(company)}&location=${encodeURIComponent(location)}&status=${encodeURIComponent(status)}&date=${encodeURIComponent(formattedDate)}`;

  return (
    <div className="qr-modal-overlay">
      <div className="qr-modal-content">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <FaTimes size={14} />
        </button>
        
        <div className="qr-modal-header">
          <h3>Application QR Code</h3>
        </div>
        
        <div className="qr-code-container">
          <QRCodeSVG 
            value={templateUrl}
            size={250}
            level="L"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        
        <div className="qr-instructions">
          <p>Scan this QR code to view application details on a mobile device.</p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal; 