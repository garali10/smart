import React, { useState } from 'react';
import axios from 'axios';

interface AddHRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface HRFormData {
  name: string;
  email: string;
  password: string;
}

const AddHRModal: React.FC<AddHRModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<HRFormData>({
    name: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/auth/register', {
        ...formData,
        role: 'hr'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      onSuccess();
      onClose();
      setFormData({ name: '', email: '', password: '' });
    } catch (err: any) {
      console.error('Error creating HR user:', err);
      setError(err.response?.data?.message || 'Failed to create HR user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add HR User</h2>
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
              {loading ? 'Adding...' : 'Add HR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHRModal; 