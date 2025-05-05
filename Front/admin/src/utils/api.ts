import axios from 'axios';
import { JobListing } from '@/types/job';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Ensure token is properly formatted with 'Bearer ' prefix
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export const jobsApi = {
  getJobs: async (filters?: Record<string, any>) => {
    const response = await api.get('/jobs', { params: filters });
    return response.data;
  },

  createJob: async (jobData: Omit<JobListing, 'id'>) => {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  updateJob: async (id: string, jobData: Partial<JobListing>) => {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
  },

  deleteJob: async (id: string) => {
    await api.delete(`/jobs/${id}`);
  },

  // Psychological test endpoints
  submitPsychTest: async (jobId: string, answers: Record<string, any>) => {
    const response = await api.post(`/jobs/${jobId}/psych-test`, answers);
    return response.data;
  },
};

export default api; 