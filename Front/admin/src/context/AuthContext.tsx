import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'candidate' | 'hr' | 'departmentHead';
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => void;
  autoLogin: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const decodedToken: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token has expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
          window.location.replace('http://localhost:3001/signin');
        } else {
          // Valid token found, set as authenticated
          setIsAuthenticated(true);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        window.location.replace('http://localhost:3001/signin');
      }
    }
  }, []);

  const autoLogin = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const decodedToken: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token has expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Only update state if it needs to change
          if (isAuthenticated || user) {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          const parsedUser = JSON.parse(storedUser);
          
          // Only update state if it needs to change
          if (!isAuthenticated) {
            setIsAuthenticated(true);
          }
          
          // Only update user if it's different from current user
          if (!user || user.id !== parsedUser.id || user.email !== parsedUser.email || user.name !== parsedUser.name) {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only update state if it needs to change
        if (isAuthenticated || user) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<User> => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        throw new Error('Not authenticated');
      }

      const response = await axios.put('http://localhost:5001/api/users/profile', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state and storage with new user data
      const updatedUser = { ...user, ...response.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      
      // Only set auth state for HR and department head
      if (user.role === 'hr' || user.role === 'departmentHead') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setIsAuthenticated(true);
        setUser(user);
      } else {
        // Clear any existing auth state for non-HR users
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      // Clear auth state on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role: string): Promise<void> => {
    try {
      const response = await axios.post('http://localhost:5001/api/auth/register', {
        name,
        email,
        password,
        role
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const loginWithGoogle = () => {
    window.location.href = "http://localhost:5001/api/auth/login/federated/google";
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      register, 
      logout, 
      loginWithGoogle,
      autoLogin,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

