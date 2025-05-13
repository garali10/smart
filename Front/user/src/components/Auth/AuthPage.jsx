import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';
import './AuthPage.css';
import FaceRecognition from '../FaceRecognition';
import { FaUser, FaCamera } from 'react-icons/fa';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [captchaValue, setCaptchaValue] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Use only Google's test key which works on all domains including localhost
  const RECAPTCHA_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  // Initialize reCAPTCHA v3 when component mounts
  useEffect(() => {
    // Remove any existing reCAPTCHA scripts to avoid conflicts
    const existingScripts = document.querySelectorAll('script[src*="recaptcha"]');
    existingScripts.forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });

    // Add fresh reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('reCAPTCHA script loaded successfully');
      setRecaptchaLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load reCAPTCHA script');
    };
    
    document.head.appendChild(script);

    // Clean up script when component unmounts
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const executeCaptcha = async () => {
    return new Promise((resolve) => {
      // Set a timeout for reCAPTCHA execution
      const timeoutId = setTimeout(() => {
        console.warn('reCAPTCHA execution timed out');
        resolve('DEVELOPMENT_MODE'); // Fallback value
      }, 3000);

      // Check if grecaptcha is loaded
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        console.error('reCAPTCHA not loaded yet');
        clearTimeout(timeoutId);
        resolve('DEVELOPMENT_MODE');
        return;
      }

      try {
        window.grecaptcha.ready(() => {
          try {
            window.grecaptcha.execute(RECAPTCHA_KEY, { action: 'login' })
              .then(token => {
                clearTimeout(timeoutId);
                console.log('reCAPTCHA token received');
                resolve(token);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                console.error('Error executing reCAPTCHA:', error);
                resolve('DEVELOPMENT_MODE');
              });
          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error in grecaptcha.execute:', error);
            resolve('DEVELOPMENT_MODE');
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error in reCAPTCHA execution:', error);
        resolve('DEVELOPMENT_MODE');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Get reCAPTCHA token, but don't block login on failure
      let captchaToken = 'DEVELOPMENT_MODE';
      try {
        captchaToken = await executeCaptcha();
      } catch (error) {
        console.error('Failed to execute reCAPTCHA, continuing with login:', error);
      }
      
      if (isLogin) {
        try {
          // Include captcha token in login request
          const response = await axiosInstance.post('/auth/login', {
            email: formData.email,
            password: formData.password,
            captchaToken: captchaToken
          });

          if (response.data.user.role === 'hr' || response.data.user.role === 'departmentHead') {
            window.location.href = 'http://localhost:3001/signin';
            return;
          }

          // Use the login function for candidates
          await login(formData.email, formData.password);
          navigate('/profile');
          return;
        } catch (loginError) {
          console.error('Login error:', loginError);
          throw loginError;
        }
      }

      // For registration
      if (!formData.email || !formData.password || !formData.name) {
        setError('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsSubmitting(false);
        return;
      }

      const response = await axiosInstance.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: 'candidate',
        captchaToken: captchaToken
      });

      if (response.data && response.data.token) {
        // Use login function after successful registration
        await login(formData.email, formData.password);
        navigate('/profile');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.response?.data?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="welcome">
        <div className={`pinkbox ${!isLogin ? 'move-right' : ''}`}>
          <div className={`signin ${!isLogin ? 'nodisplay' : ''}`}>
            <h1>sign in</h1>
            {!showFaceRecognition ? (
              <>
                <div className="login-options">
                  <button 
                    className={`login-option-btn active`}
                    onClick={() => setShowFaceRecognition(false)}
                  >
                    <FaUser /> Password
                  </button>
                  <button 
                    className="login-option-btn"
                    onClick={() => setShowFaceRecognition(true)}
                  >
                    <FaCamera /> Face ID
                  </button>
                </div>
                
                <form className="more-padding" onSubmit={handleSubmit}>
                  {error && <div className="error-message">{error}</div>}
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="email"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      placeholder="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="button submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'login'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="login-options">
                  <button 
                    className="login-option-btn"
                    onClick={() => setShowFaceRecognition(false)}
                  >
                    <FaUser /> Password
                  </button>
                  <button 
                    className="login-option-btn active"
                    onClick={() => setShowFaceRecognition(true)}
                  >
                    <FaCamera /> Face ID
                  </button>
                </div>
                
                <div className="face-login-container">
                  <p>Login using face recognition</p>
                  <FaceRecognition 
                    onSuccess={(credentials) => {
                      try {
                        console.log("Face recognition successful, received credentials:", credentials);
                        if (!credentials || !credentials.token || !credentials.user) {
                          console.error("Missing token or user data in credentials");
                          setError('Face recognition login failed: Missing credentials');
                          return;
                        }
                        
                        // Call the login function from AuthContext with credentials
                        login(credentials);
                        console.log("Login successful, navigating to profile");
                        navigate('/profile');
                      } catch (err) {
                        console.error("Face login error:", err);
                        setError('Face recognition login failed');
                      }
                    }} 
                  />
                </div>
              </>
            )}
          </div>

          <div className={`signup ${isLogin ? 'nodisplay' : ''}`}>
            <h1>register</h1>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="input-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
              <div className="input-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
              <button 
                type="submit" 
                className="button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'create account'}
              </button>
            </form>
          </div>
        </div>

        <div className="leftbox">
          <h2 className="title"><span>SMART</span>&<br/>HIRE</h2>
          <p className="desc">find your perfect <span>job</span></p>
          <img className="flower smaller" src="https://image.ibb.co/d5X6pn/1357d638624297b.jpg" alt="decoration" />
          <p className="account">have an account?</p>
          <button className="button" onClick={() => setIsLogin(true)}>login</button>
        </div>

        <div className="rightbox">
          <h2 className="title"><span>SMART</span>&<br/>HIRE</h2>
          <p className="desc">find your perfect <span>job</span></p>
          <img className="flower" src="https://preview.ibb.co/jvu2Un/0057c1c1bab51a0.jpg" alt="decoration" />
          <p className="account">don't have an account?</p>
          <button className="button" onClick={() => setIsLogin(false)}>sign up</button>
        </div>
      </div>
      
      {/* reCAPTCHA v3 branding */}
      <div className="recaptcha-terms">
        This site is protected by reCAPTCHA and the Google
        <a href="https://policies.google.com/privacy"> Privacy Policy</a> and
        <a href="https://policies.google.com/terms"> Terms of Service</a> apply.
      </div>
    </div>
  );
};

export default AuthPage; 