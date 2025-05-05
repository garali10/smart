import React, { useState } from 'react';
import axios from 'axios';

interface AddDepartmentHeadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface DepartmentHeadFormData {
  name: string;
  email: string;
  password: string;
  company: string;
}

const AddDepartmentHeadModal: React.FC<AddDepartmentHeadModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<DepartmentHeadFormData>({
    name: '',
    email: '',
    password: '',
    company: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to perform this action');
        return;
      }

      // First create the user account
      const userResponse = await axios.post('http://localhost:5001/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'departmentHead'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Then create the department head with the user reference
      await axios.post('http://localhost:5001/api/department-heads', {
        company: formData.company,
        userId: userResponse.data.id
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      onSuccess();
      setFormData({ name: '', email: '', password: '', company: '' });
    } catch (err: any) {
      console.error('Error creating Department Head:', err);
      setError(err.response?.data?.message || 'Failed to create Department Head');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Department Head</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/80"
            >
              {loading ? 'Adding...' : 'Add Department Head'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentHeadModal; 