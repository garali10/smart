import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { authService } from '../../services/api';

export const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const profileFormik = useFormik({
    initialValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      phone: Yup.string().matches(/^\+?[\d\s-]+$/, 'Invalid phone number'),
    }),
    onSubmit: async (values) => {
      try {
        await updateProfile(values);
        setMessage('Profile updated successfully');
        setError('');
      } catch (err) {
        setError('Failed to update profile');
        setMessage('');
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Current password is required'),
      newPassword: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('New password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
        .required('Confirm password is required'),
    }),
    onSubmit: async (values) => {
      try {
        await authService.changePassword(values);
        setMessage('Password changed successfully');
        setError('');
        passwordFormik.resetForm();
      } catch (err) {
        setError('Failed to change password');
        setMessage('');
      }
    },
  });

  return (
    <div className="profile-container">
      <div className="profile-box">
        <h2>Profile Settings</h2>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card mb-4">
          <div className="card-header">
            <h3>Update Profile</h3>
          </div>
          <div className="card-body">
            <form onSubmit={profileFormik.handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  className={`form-control ${
                    profileFormik.touched.name && profileFormik.errors.name ? 'is-invalid' : ''
                  }`}
                  {...profileFormik.getFieldProps('name')}
                />
                {profileFormik.touched.name && profileFormik.errors.name && (
                  <div className="invalid-feedback">{profileFormik.errors.name}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${
                    profileFormik.touched.email && profileFormik.errors.email ? 'is-invalid' : ''
                  }`}
                  {...profileFormik.getFieldProps('email')}
                />
                {profileFormik.touched.email && profileFormik.errors.email && (
                  <div className="invalid-feedback">{profileFormik.errors.email}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="text"
                  className={`form-control ${
                    profileFormik.touched.phone && profileFormik.errors.phone ? 'is-invalid' : ''
                  }`}
                  {...profileFormik.getFieldProps('phone')}
                />
                {profileFormik.touched.phone && profileFormik.errors.phone && (
                  <div className="invalid-feedback">{profileFormik.errors.phone}</div>
                )}
              </div>

              <button type="submit" className="btn btn-primary">
                Update Profile
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Change Password</h3>
          </div>
          <div className="card-body">
            <form onSubmit={passwordFormik.handleSubmit}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  className={`form-control ${
                    passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword
                      ? 'is-invalid'
                      : ''
                  }`}
                  {...passwordFormik.getFieldProps('currentPassword')}
                />
                {passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword && (
                  <div className="invalid-feedback">{passwordFormik.errors.currentPassword}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  className={`form-control ${
                    passwordFormik.touched.newPassword && passwordFormik.errors.newPassword
                      ? 'is-invalid'
                      : ''
                  }`}
                  {...passwordFormik.getFieldProps('newPassword')}
                />
                {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && (
                  <div className="invalid-feedback">{passwordFormik.errors.newPassword}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`form-control ${
                    passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword
                      ? 'is-invalid'
                      : ''
                  }`}
                  {...passwordFormik.getFieldProps('confirmPassword')}
                />
                {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
                  <div className="invalid-feedback">{passwordFormik.errors.confirmPassword}</div>
                )}
              </div>

              <button type="submit" className="btn btn-primary">
                Change Password
              </button>
            </form>
          </div>
        </div>

        <button onClick={logout} className="btn btn-danger mt-4">
          Logout
        </button>
      </div>
    </div>
  );
}; 