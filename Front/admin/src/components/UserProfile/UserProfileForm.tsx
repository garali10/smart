import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface UpdateProfileData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfileForm() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validate password match if trying to change password
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Create request data based on what's changed
      const updateData: Partial<UpdateProfileData> = {};
      
      // Only include fields that have changed
      if (formData.name !== user?.name) {
        updateData.name = formData.name;
      }
      
      if (formData.email !== user?.email) {
        updateData.email = formData.email;
      }
      
      // Don't make the request if no profile fields changed
      if (Object.keys(updateData).length === 0 && !formData.newPassword) {
        setSuccess('No changes to save');
        setIsLoading(false);
        return;
      }
      
      // Update profile info if there are changes
      if (Object.keys(updateData).length > 0) {
        try {
          // Use the updateProfile function from AuthContext
          await updateProfile(updateData);
          setSuccess('Profile updated successfully');
        } catch (error: any) {
          console.error('Error updating profile:', error);
          setError(error.response?.data?.message || 'Failed to update profile');
          setIsLoading(false);
          return;
        }
      }
      
      // Handle password change if requested
      if (formData.newPassword && formData.currentPassword) {
        try {
          await axios.put(
            'http://localhost:5001/api/users/change-password',
            {
              currentPassword: formData.currentPassword,
              newPassword: formData.newPassword
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          setSuccess((prev) => prev ? `${prev} and password updated successfully` : 'Password updated successfully');
        } catch (error: any) {
          console.error('Error updating password:', error);
          setError(error.response?.data?.message || 'Failed to update password');
          setIsLoading(false);
          return;
        }
      }
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Update Profile Information
      </h4>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <h5 className="mb-4 text-md font-medium text-gray-800 dark:text-white/90">
            Change Password (optional)
          </h5>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 