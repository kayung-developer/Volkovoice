// frontend/src/pages/Settings.jsx
import React from 'react';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/common/Spinner';
import ProfileSettings from '../components/settings/ProfileSettings';
import PreferenceSettings from '../components/settings/PreferenceSettings';

const Settings = () => {
  const { profile, updateProfile, isLoading } = useAuth();

  // A robust loading state is crucial for a good user experience.
  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="mt-1 text-md text-gray-600 dark:text-gray-400">
              Manage your profile, preferences, and account settings.
            </p>
          </header>

          <div className="space-y-8">
            {/* Render the modular components with the necessary props */}
            <ProfileSettings profile={profile} onUpdate={updateProfile} />
            <PreferenceSettings profile={profile} onUpdate={updateProfile} />
            {/* This is a great place to add more settings modules in the future,
                like billing, notifications, or account deletion. */}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;