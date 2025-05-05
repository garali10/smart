import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001/api', // Changed back to port 5001
  timeout: 10000, // Increased timeout for file uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - simplified to just handle auth
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - only logs critical errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - Is the backend server running?');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 