import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { Formik, Form, Field } from 'formik';
// eslint-disable-next-line no-unused-vars
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { FaCamera, FaPen } from 'react-icons/fa';
import axiosInstance from '../../utils/axios';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import './ProfilePage.css';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from './ProfileCard';
import MbtiResultsCard from './MbtiResultsCard';

const ProfilePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Fetching user data...');
        const response = await axiosInstance.get('/users/me');
        console.log('User data:', response.data);
        setUserData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
        if (err.response?.status === 401) {
          logout();
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserData();
    } else {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate, logout]);

  const handleProfileUpdate = (updatedData) => {
    setUserData(prev => ({
      ...prev,
      ...updatedData
    }));
    setSuccessMessage('Profile picture updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);
      console.log('Submitting profile update:', values);
      
      const response = await axiosInstance.put('/users/profile', values);
      console.log('Profile update response:', response.data);
      
      setUserData(response.data);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const getProfilePictureUrl = (filename) => {
    if (!filename) return '/default-avatar.png';
    if (filename.startsWith('http')) return filename;
    return `http://localhost:5000/api/auth/upload/${filename}`;
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    navigate('/edit-profile');
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    navigate('/update-password');
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current.click();
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        
        <ProfileCard 
          user={userData || user} 
          onUpdateProfile={handleProfileUpdate} 
        />
        
        {/* MBTI Results Card */}
        <MbtiResultsCard />
        
        <div className="profile-actions">
          <button 
            className="btn btn--blue"
            onClick={() => navigate('/edit-profile')}
          >
            Edit Profile
          </button>
          <button 
            className="btn btn--green"
            onClick={() => navigate('/update-password')}
          >
            Change Password
          </button>
          <button 
            className="btn btn--purple"
            onClick={() => navigate('/mbti-test')}
          >
            Take MBTI Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 