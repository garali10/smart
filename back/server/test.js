import axios from 'axios';

const testRoutes = async () => {
  const routes = [
    'http://localhost:5000/',
    'http://localhost:5000/api/auth',
    'http://localhost:5000/api/auth/test'
  ];

  for (const route of routes) {
    try {
      console.log(`Testing ${route}`);
      const response = await axios.get(route);
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error:', {
        route,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    console.log('---');
  }
};

testRoutes(); 