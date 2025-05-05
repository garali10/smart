import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddHRModal from './AddHRModal';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

const HRManagement = () => {
  const [hrMembers, setHRMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  const itemsPerPage = 5;

  const fetchHRMembers = async (page: number = 1) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to access this resource');
        setLoading(false);
        return;
      }

      const response = await axios.get(`http://localhost:5001/api/hr/get-all?page=${page}&limit=${itemsPerPage}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setHRMembers(response.data.items);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalItems: response.data.totalItems
      });
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching HR members:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to access HR management. Please contact your administrator.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch HR members');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRMembers(pagination.currentPage);
  }, [pagination.currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleDeleteHR = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this HR user?')) {
      return;
    }

    setDeleteLoading(id);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to perform this action');
        setDeleteLoading(null);
        return;
      }

      await axios.delete(`http://localhost:5001/api/hr/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh the current page after deletion
      fetchHRMembers(pagination.currentPage);
      setDeleteLoading(null);
    } catch (err: any) {
      console.error('Error deleting HR user:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to delete HR users. Please contact your administrator.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete HR user');
      }
      setDeleteLoading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-4">
      <div className="text-lg">Loading...</div>
    </div>
  );

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => {
              setError(null);
              fetchHRMembers(pagination.currentPage);
            }}
            className="text-sm bg-red-200 px-3 py-1 rounded hover:bg-red-300"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">HR Team Management</h1>
        <button
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/80"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add HR Member
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="grid grid-cols-5 border-b border-stroke py-4 px-4 dark:border-strokedark">
          <div className="col-span-2 font-medium">Name</div>
          <div className="font-medium">Role</div>
          <div className="font-medium">Join Date</div>
          <div className="font-medium">Actions</div>
        </div>

        {hrMembers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No HR members found
          </div>
        ) : (
          hrMembers.map((member) => (
            <div
              key={member._id}
              className="grid grid-cols-5 border-b border-stroke py-4 px-4 dark:border-strokedark last:border-b-0"
            >
              <div className="col-span-2">
                <h5 className="font-medium text-black dark:text-white">
                  {member.name}
                </h5>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <div className="flex items-center">{member.role}</div>
              <div className="flex items-center">
                {new Date(member.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center space-x-3.5">
                <button 
                  className={`hover:text-primary ${deleteLoading === member._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleDeleteHR(member._id)}
                  disabled={deleteLoading === member._id}
                >
                  {deleteLoading === member._id ? (
                    <span className="text-sm">Deleting...</span>
                  ) : (
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                        fill=""
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className={`px-3 py-1 rounded ${
              pagination.currentPage === 1
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/80'
            }`}
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded ${
                  page === pagination.currentPage
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className={`px-3 py-1 rounded ${
              pagination.currentPage === pagination.totalPages
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/80'
            }`}
          >
            Next
          </button>
        </div>
      )}

      <AddHRModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchHRMembers(1); // Reset to first page after adding new HR
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
};

export default HRManagement; 