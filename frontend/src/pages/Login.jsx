// frontend/src/pages/Login.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../api/firebase';
import { GoogleIcon } from '../assets/icons/GoogleIcon'; // A custom SVG icon component
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // On successful login, the onAuthStateChanged listener in AuthContext
      // will trigger a state update, and the ProtectedRoute will automatically
      // navigate the user away from the login page.
      navigate('/');
      toast.success("Successfully signed in!");
    } catch (error) {
      console.error("Google Sign-In Failed:", error);
      toast.error("Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-dark-bg dark:via-gray-900 dark:to-black">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 space-y-8 bg-white/50 dark:bg-dark-card/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Volkovoice
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI-Powered Real-Time Dialogue Translation
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 font-semibold text-white bg-primary rounded-lg shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-dark-bg transition-all duration-200"
        >
          <GoogleIcon className="w-6 h-6" />
          <span>Continue with Google</span>
        </motion.button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;