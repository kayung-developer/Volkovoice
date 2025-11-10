// frontend/src/api/axios.js
import axios from 'axios';
import { auth } from './firebase'; // We will create this file next

/**
 * -----------------------------------------------------------------------------
 * Production-Grade Axios Instance
 * -----------------------------------------------------------------------------
 * This instance is configured with interceptors to handle API requests and responses
 * globally, making the application more robust and secure.
 */

// Define the base URL for our backend API.
// Using environment variables is crucial for switching between development and production.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * --- Request Interceptor ---
 * This powerful interceptor runs before any request is sent. Its primary job is to
 * dynamically inject the Firebase Authentication ID token into the Authorization header.
 * This ensures every request to our protected backend endpoints is authenticated.
 */
apiClient.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true); // Force refresh token if expired
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting auth token:", error);
        // Optionally, you could redirect to login or show an error message here.
        return Promise.reject(error);
      }
    }
    return config;
  },
  (error) => {
    // Handle request configuration errors
    console.error("Axios request error:", error);
    return Promise.reject(error);
  }
);

/**
 * --- Response Interceptor ---
 * This interceptor handles responses globally. It's the perfect place to catch
 * common errors like 401 (Unauthorized) or 403 (Forbidden) and react accordingly,
 * for instance, by logging the user out or showing a "permission denied" message.
 */
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const { response } = error;
    if (response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (response.status === 401) {
        // Handle unauthorized errors, e.g., redirect to login
        console.error("Unauthorized request. Token might be invalid or expired.");
        // window.location.href = '/login'; // Example of a hard redirect
      } else if (response.status === 403) {
        // Handle forbidden errors
        console.error("Access forbidden.");
      } else {
        console.error(`Unhandled API Error: ${response.status}`, response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Network error or server is not responding:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;