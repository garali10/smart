import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (emailOrCredentials, password) => {
    try {
      // Handle case where credentials are passed as separate email and password parameters
      if (typeof emailOrCredentials === 'string' && password !== undefined) {
        const email = emailOrCredentials;
        
        const response = await axios.post('http://localhost:5001/api/auth/login', {
          email,
          password,
        });

        const { token, user } = response.data;

        if (user.role === 'candidate') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          setIsAuthenticated(true);
        }

        return response.data;
      }
      
      // If credentials is an object with email and password, perform traditional login
      else if (typeof emailOrCredentials === 'object' && emailOrCredentials.email && emailOrCredentials.password) {
        const credentials = emailOrCredentials;
        const response = await axios.post('http://localhost:5001/api/auth/login', {
          email: credentials.email,
          password: credentials.password,
        });

        const { token, user } = response.data;

        if (user.role === 'candidate') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          setIsAuthenticated(true);
        }

        return response.data;
      } 
      // If credentials is already a token and user object (from face recognition)
      else if (typeof emailOrCredentials === 'object' && emailOrCredentials.token && emailOrCredentials.user) {
        const credentials = emailOrCredentials;
        const { token, user } = credentials;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setIsAuthenticated(true);
        return { token, user };
      }
      
      throw new Error('Invalid login credentials format');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.put(
        'http://localhost:5001/api/users/profile', 
        profileData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update state and localStorage with the new user data
      const updatedUser = { ...user, ...response.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Force a state refresh
      setIsAuthenticated(false);
      setTimeout(() => setIsAuthenticated(true), 10);
      
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };
  
  // Register face data for a user
  const registerFaceData = async (faceDescriptor) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        throw new Error('Authentication required');
      }
      
      // In a real app, this would be an API call
      // await axios.post('http://localhost:5001/api/users/face-recognition', 
      //   { userId: user.id, faceDescriptor },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      
      // For demo, we'll store in localStorage
      const faceData = {
        userId: user.id,
        username: user.username || user.name,
        email: user.email,
        faceDescriptor
      };
      
      localStorage.setItem('faceData', JSON.stringify(faceData));
      
      return { success: true };
    } catch (error) {
      console.error('Face registration error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout,
      updateProfile,
      registerFaceData,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
