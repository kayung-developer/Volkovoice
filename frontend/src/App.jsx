// frontend/src/App.jsx (Enhanced with Chat Routes)
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuth from './hooks/useAuth';
import Spinner from './components/common/Spinner';

// --- Lazy-loaded Pages for better performance ---
const Login = React.lazy(() => import('./pages/Login'));
const WelcomeScreen = React.lazy(() => import('./components/WelcomeScreen'));
const TranslationSession = React.lazy(() => import('./pages/TranslationSession'));
const Settings = React.lazy(() => import('./pages/Settings'));
const VoiceClones = React.lazy(() => import('./pages/VoiceClones'));
const Profile = React.lazy(() => import('./pages/Profile'));
// NEW: Lazy-load the new chat pages
const ChatLobby = React.lazy(() => import('./pages/ChatLobby'));
const ChatSession = React.lazy(() => import('./pages/ChatSession'));

// A reusable component for a clean, centered loading state
const FullPageSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-dark-bg">
    <Spinner size="lg" />
  </div>
);

// --- Enhanced ProtectedRoute Logic ---
const ProtectedRoute = ({ user, isLoading }) => {
  if (isLoading) {
    return <FullPageSpinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
ProtectedRoute.propTypes = {
  user: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
};

// --- Main App Router ---
function App() {
  const { user, isLoading } = useAuth();

  return (
    <Router>
      <div className="min-h-screen font-sans antialiased">
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

            {/* Protected Routes Wrapper */}
            <Route element={<ProtectedRoute user={user} isLoading={isLoading} />}>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/session" element={<TranslationSession />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/voice-clones" element={<VoiceClones />} />
              <Route path="/profile" element={<Profile />} />
              {/* --- NEW: CHAT ROUTES --- */}
              <Route path="/chat" element={<ChatLobby />} />
              <Route path="/chat/:session_id" element={<ChatSession />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;