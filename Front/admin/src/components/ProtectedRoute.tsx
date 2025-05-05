import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to user template login
    window.location.replace('http://localhost:3000/auth');
    return null;
  }

  return <>{children}</>;
}; 