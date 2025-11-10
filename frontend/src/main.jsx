// frontend/src/main.jsx (Enhanced)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css'; // Correct path to the global stylesheet
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {/*
          Toaster provides beautiful, non-blocking notifications.
          Placing it here makes it available to the entire app.
        */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#1F2937', // dark-card
              color: '#F9FAFB',     // gray-50
            },
            // Style for success messages
            success: {
              iconTheme: {
                primary: '#10B981', // secondary
                secondary: 'white',
              },
            },
             // Style for error messages
            error: {
              iconTheme: {
                primary: '#EF4444', // red-500
                secondary: 'white',
              },
            },
          }}
        />
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);