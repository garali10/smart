import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        // Use the login function from AuthContext
        const response = await axiosInstance.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });

        if (response.data.user.role === 'hr' || response.data.user.role === 'departmentHead') {
          window.location.href = 'http://localhost:3001/signin';
          return;
        }

        // Use the login function for candidates
        await login(formData.email, formData.password);
        navigate('/profile');
        return;
      }

      // For registration
      if (!formData.email || !formData.password || !formData.name) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const response = await axiosInstance.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: 'candidate'
      });

      if (response.data && response.data.token) {
        // Use login function after successful registration
        await login(formData.email, formData.password);
        navigate('/profile');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="welcome">
        <div className={`pinkbox ${!isLogin ? 'move-right' : ''}`}>
          <div className={`signin ${!isLogin ? 'nodisplay' : ''}`}>
            <h1>sign in</h1>
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
                />
              </div>
              <button type="submit" className="button submit">login</button>
            </form>
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
                />
              </div>
              <button type="submit" className="button submit">create account</button>
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
    </div>
  );
};

export default AuthPage; 