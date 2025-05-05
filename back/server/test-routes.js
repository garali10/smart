import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const testEndpoints = async () => {
  const endpoints = [
    '/',
    '/debug',
    '/api/auth/test'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint}...`);
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error:', {
        endpoint,
        status: error.response?.status,
        message: error.response?.data || error.message
      });
    }
  }
};

testEndpoints(); 