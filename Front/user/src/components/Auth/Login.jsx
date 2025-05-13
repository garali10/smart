import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import FaceRecognition from '../FaceRecognition';
import { FaUser, FaCamera } from 'react-icons/fa';
import './LoginPage.css';

export const Login = () => {
  const [error, setError] = useState('');
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        await login(values.email, values.password);
        navigate('/profile');
      } catch (err) {
        setError('Invalid email or password');
      }
    },
  });
  
  const handleFaceRecognitionSuccess = async (credentials) => {
    try {
      // Face recognition was successful, use the credentials to login
      await login(credentials);
      navigate('/profile');
    } catch (err) {
      setError('Face recognition login failed. Please try password login.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <div className="login-options">
          <button 
            className={`login-option-btn ${!showFaceRecognition ? 'active' : ''}`}
            onClick={() => setShowFaceRecognition(false)}
          >
            <FaUser /> Password
          </button>
          <button 
            className={`login-option-btn ${showFaceRecognition ? 'active' : ''}`}
            onClick={() => setShowFaceRecognition(true)}
          >
            <FaCamera /> Face ID
          </button>
        </div>
        
        {!showFaceRecognition ? (
          <form onSubmit={formik.handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`form-control ${
                  formik.touched.email && formik.errors.email ? 'is-invalid' : ''
                }`}
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="invalid-feedback">{formik.errors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`form-control ${
                  formik.touched.password && formik.errors.password ? 'is-invalid' : ''
                }`}
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="invalid-feedback">{formik.errors.password}</div>
              )}
            </div>

            <button type="submit" className="btn btn-primary p-2 m-2">
              Login
            </button>
          </form>
        ) : (
          <div className="face-login-btn-container">
            <p>Login using face recognition</p>
            <FaceRecognition onSuccess={handleFaceRecognitionSuccess} />
          </div>
        )}
      </div>
    </div>
  );
}; 