import axios from 'axios';
import auth from '@react-native-firebase/auth';

// Define the base URL for our backend API.
// Use environment variables for production.
const API_BASE_URL = 'http://10.0.2.2:8000'; // Android emulator default
// For iOS emulator, use 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the Firebase auth token
apiClient.interceptors.request.use(
  async config => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true); // Force refresh if needed
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting auth token:', error);
        return Promise.reject(error);
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Handle common errors like 401 Unauthorized, 403 Forbidden etc.
    if (error.response) {
      console.error(`API Error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Axios Error:', error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;