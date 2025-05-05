import React, { useRef } from 'react';
import { FaUser, FaEnvelope, FaUserTag, FaClock, FaCamera } from 'react-icons/fa';
import axiosInstance from '../../utils/axios';
import './ProfileCard.css';

const ProfileCard = ({ user, onUpdateProfile }) => {
  const fileInputRef = useRef(null);

  const getProfilePictureUrl = (filename) => {
    if (!filename) return '/default-avatar.png';
    if (filename.startsWith('http')) return filename;
    return `http://localhost:5001/api/auth/upload/${filename}`;
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current.click();
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      console.log('Uploading file:', file.name);
      const response = await axiosInstance.post('/auth/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload response:', response.data);
      if (response.data.profilePicture && onUpdateProfile) {
        onUpdateProfile(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar" onClick={handleProfilePictureClick}>
          {user.profilePicture ? (
            <img 
              src={getProfilePictureUrl(user.profilePicture)} 
              alt={user.name}
              onError={(e) => {
                e.target.src = '/default-avatar.png';
                console.log('Error loading image, using default');
              }}
            />
          ) : (
            <FaUser size={50} />
          )}
          <div className="profile-avatar-overlay">
            <FaCamera className="camera-icon" />
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleProfilePictureChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <h2 className="profile-name">{user.name}</h2>
        <p className="profile-role">{user.role}</p>
      </div>
      
      <div className="profile-info">
        <div className="info-item">
          <FaEnvelope className="info-icon" />
          <span>{user.email}</span>
        </div>
        
        <div className="info-item">
          <FaUserTag className="info-icon" />
          <span>{user.role}</span>
        </div>
        
        {user.createdAt && (
          <div className="info-item">
            <FaClock className="info-icon" />
            <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard; 