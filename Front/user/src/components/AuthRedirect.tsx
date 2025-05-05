import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'hr' || user.role === 'departmentHead') {
        // Redirect to admin template
        window.location.href = 'http://localhost:3001/';
      }
    }
  }, [navigate]);

  return null;
};

export default AuthRedirect; 