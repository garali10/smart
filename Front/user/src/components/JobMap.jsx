import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaTimesCircle } from 'react-icons/fa';

const JobMap = ({ location, isOpen, onClose }) => {
  const [mapUrl, setMapUrl] = useState('');
  
  // Update map URL whenever location or visibility changes
  useEffect(() => {
    if (isOpen && location) {
      setMapUrl(getSpecificMapUrl(location));
    }
  }, [location, isOpen]);

  if (!isOpen) return null;

  // This function will encode the location for use in the OpenStreetMap URL
  const getMapUrl = (location) => {
    // Default to a fallback location if none provided
    const searchLocation = location || 'Tunisia';
    // Encode the location for URL
    const encodedLocation = encodeURIComponent(searchLocation);
    // Return the OpenStreetMap embed URL with a search marker
    return `https://www.openstreetmap.org/export/embed.html?bbox=9.181976318359377%2C33.75399024347058%2C11.31256103515625%2C35.04171898550863&layer=mapnik&query=${encodedLocation}`;
  };

  // If specific location like "Nabeul" is provided, we can try to get coordinates
  const getSpecificMapUrl = (location) => {
    if (!location) return getMapUrl('Tunisia');
    
    // Map of known locations to coordinates
    const locationMap = {
      'nabeul': '36.4547,10.7418',
      'tunis': '36.8065,10.1815',
      'sousse': '35.8245,10.6346',
      'sfax': '34.7398,10.7600',
      'monastir': '35.7780,10.8262',
      'hammamet': '36.4003,10.6203',
      'bizerte': '37.2744,9.8739',
      'gabes': '33.8881,10.0986',
      'ariana': '36.8665,10.1647',
      'ben arous': '36.7533,10.2282',
      'manouba': '36.8093,10.0936',
      // Add more locations as needed
    };

    // Check if we have specific coordinates for this location
    const locationLower = location.toLowerCase();
    for (const [key, coords] of Object.entries(locationMap)) {
      if (locationLower.includes(key)) {
        const [lat, lon] = coords.split(',');
        // Return a more precise URL with marker at exact coordinates
        return `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lon)-0.1}%2C${parseFloat(lat)-0.1}%2C${parseFloat(lon)+0.1}%2C${parseFloat(lat)+0.1}&layer=mapnik&marker=${lat}%2C${lon}`;
      }
    }

    // If no specific location found, use generic search
    return `https://www.openstreetmap.org/export/embed.html?bbox=8.0%2C30.0%2C12.0%2C38.0&layer=mapnik&query=${encodeURIComponent(location)}`;
  };

  return (
    <div className="map-modal">
      <div className="map-container">
        <div className="map-header">
          <h3><FaMapMarkerAlt /> Job Location: {location || 'Unknown'}</h3>
          <button className="close-map-btn" onClick={onClose}>
            <FaTimesCircle />
          </button>
        </div>
        <div className="map-content">
          <iframe 
            title="Job Location Map"
            width="100%" 
            height="450" 
            frameBorder="0" 
            scrolling="no" 
            marginHeight="0" 
            marginWidth="0" 
            src={mapUrl}
            style={{ border: '1px solid #ccc', borderRadius: '4px' }}
            key={location} // Force iframe refresh when location changes
          />
          <a 
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(location || 'Tunisia')}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="view-larger-map"
          >
            View Larger Map
          </a>
        </div>
      </div>
    </div>
  );
};

export default JobMap; 