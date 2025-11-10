// frontend/src/pages/Profile.jsx (Completed)
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import { User, Camera, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { profile, updateProfile, isLoading } = useAuth();
  const [isAvatarCreatorVisible, setIsAvatarCreatorVisible] = useState(false);

  // Your Ready Player Me subdomain
  const subdomain = import.meta.env.VITE_READY_PLAYER_ME_SUBDOMAIN || 'volkovoice';

  const handleAvatarCreated = useCallback(async (event) => {
    // Ensure the message is from Ready Player Me and contains a valid URL
    if (event.origin !== `https://${subdomain}.readyplayer.me`) return;

    const url = event.data;
    if (typeof url === 'string' && url.endsWith('.glb')) {
      console.log(`New avatar created: ${url}`);
      setIsAvatarCreatorVisible(false); // Close the modal immediately

      const toastId = toast.loading('Saving new avatar...');
      try {
        await updateProfile({
          preferences: { ...profile.preferences, avatar_url: url },
        });
        toast.success('Avatar updated successfully!', { id: toastId });
      } catch (error) {
        toast.error('Failed to save new avatar.', { id: toastId });
      }
    }
  }, [profile, updateProfile, subdomain]);

  useEffect(() => {
    window.addEventListener('message', handleAvatarCreated);
    return () => window.removeEventListener('message', handleAvatarCreated);
  }, [handleAvatarCreated]);


  if (isLoading || !profile) {
    return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow p-4 sm:p-6 lg:p-8 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-dark-card p-8 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-center p-4 overflow-hidden">
                   {profile.preferences?.avatar_url ? (
                    <p className="text-sm font-semibold">Your 3D Avatar is Ready!</p>
                  ) : (
                    <User size={80} />
                  )}
                </div>
                <button
                  onClick={() => setIsAvatarCreatorVisible(true)}
                  className="absolute inset-0 w-full h-full bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <Camera size={40} />
                  <span className="mt-2 font-semibold">Change Avatar</span>
                </button>
              </div>

              <h2 className="mt-6 text-3xl font-bold">{profile.full_name || 'Anonymous User'}</h2>
              <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">{profile.email}</p>
              <Link to="/settings">
                <Button variant="ghost" className="mt-4">
                  Edit Profile Information
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>

      {/* --- Ready Player Me Iframe Modal --- */}
      {isAvatarCreatorVisible && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full h-full max-w-4xl max-h-[85vh] bg-dark-card rounded-lg overflow-hidden shadow-2xl relative"
            >
                <iframe
                    src={`https://${subdomain}.readyplayer.me/avatar?frameApi&clearCache`}
                    allow="camera *; microphone *"
                    className="w-full h-full border-0"
                    title="Ready Player Me Avatar Creator"
                ></iframe>
                <button
                    onClick={() => setIsAvatarCreatorVisible(false)}
                    className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"
                    aria-label="Close Avatar Creator"
                >
                    <X size={24}/>
                </button>
            </motion.div>
        </div>
      )}
    </>
  );
};

export default Profile;