import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleGuard = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; 
  }

  if (!isAuthenticated || (user && user.role !== requiredRole)) {
    return <Navigate to="/auth" />; 
  }

  return children;
};

export default RoleGuard;
