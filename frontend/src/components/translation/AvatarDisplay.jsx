// frontend/src/components/translation/AvatarDisplay.jsx (Enhanced)
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useAvatar } from '../../hooks/useAvatar';
import useAuth from '../../hooks/useAuth'; // Import useAuth to get the profile

const AvatarDisplay = ({ stream, isListening }) => {
  const containerRef = useRef(null);
  const { profile } = useAuth(); // Get the globally managed user profile

  // --- DYNAMIC AVATAR URL ---
  // Use the user's saved avatar URL from their profile preferences.
  // Fall back to a default if the user hasn't created one yet.
  const avatarUrl = profile?.preferences?.avatar_url || 'https://models.readyplayer.me/655e084a3375171781219b28.glb';

  useAvatar(containerRef, avatarUrl, isListening ? stream : null);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] transition-opacity duration-500"
      style={{ opacity: isListening ? 1 : 0.4 }}
    />
  );
};

AvatarDisplay.propTypes = {
  stream: PropTypes.object,
  isListening: PropTypes.bool.isRequired,
};

export default AvatarDisplay;