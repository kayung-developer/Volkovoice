// frontend/src/components/settings/ProfileSettings.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const ProfileSettings = ({ profile, onUpdate }) => {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Saving profile...');

    try {
      await onUpdate({ full_name: fullName });
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Profile Information</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Your name"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={status.loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {status.loading ? <Spinner size="sm" /> : 'Save Changes'}
          </button>

          {/* --- Dynamic Status Indicator --- */}
          <div className="h-5">
            {status.success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm">Profile updated!</span>
              </motion.div>
            )}
            {status.error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={16} />
                <span className="text-sm">{status.error}</span>
              </motion.div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

ProfileSettings.propTypes = {
  profile: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default ProfileSettings;