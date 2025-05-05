import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HRManagement from './HRManagement';
import DepartmentHeadManagement from './DepartmentHeadManagement';
import { useNavigate } from 'react-router-dom';

const TeamManagement = () => {
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5001/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUserRole(response.data.role);
        
        // Redirect department heads with error message
        if (response.data.role === 'departmentHead') {
          setError('As a Department Head, you do not have access to Team Management. Please contact HR for assistance.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setError('Failed to fetch user role');
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const handleClose = () => {
    setError(null);
    navigate('/'); // Redirect to home page instead of dashboard
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show error popup for department heads or other errors
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h3>
            <p className="text-center text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleClose}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show team management content for HR
  return (
    <div className="space-y-8">
      {userRole === 'hr' ? (
        <>
          <HRManagement />
          <DepartmentHeadManagement />
        </>
      ) : (
        <div className="p-4">
          <div className="rounded bg-yellow-100 p-3 text-yellow-700">
            You don't have permission to access this page.
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement; 