// frontend/src/components/translation/VoiceSelector.jsx (Enhanced)
import React from 'react';
import PropTypes from 'prop-types';
import useSWR from 'swr';
import { User, Bot, Zap, Loader } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

// SWR fetcher function that uses our authenticated apiClient
const fetcher = (url, apiClient) => apiClient.get(url).then(res => res.data);

const VoiceButton = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 flex items-center gap-2 text-sm font-semibold rounded-full transition-all duration-200 ${
      isActive
        ? 'bg-white dark:bg-dark-card text-primary shadow-md'
        : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-dark-card/50'
    }`}
  >
    {children}
  </button>
);

VoiceButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

const VoiceSelector = ({ selectedVoiceId, setSelectedVoice, isLiveCloneActive, isVisible }) => {
  const { apiClient } = useAuth();
  // UseSWR provides caching, revalidation, and loading/error states out of the box.
  const { data: clones, error, isLoading } = useSWR('/api/voice-clone/', (url) => fetcher(url, apiClient));

  if (!isVisible) return null;

  return (
    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
      {/* Default Voice Button */}
      <VoiceButton onClick={() => setSelectedVoice(null)} isActive={!selectedVoiceId && !isLiveCloneActive}>
        <Bot size={14} /> Default
      </VoiceButton>

      {/* --- Conditional Live Clone Button --- */}
      {isLiveCloneActive && (
        <VoiceButton onClick={() => setSelectedVoice(null)} isActive={!selectedVoiceId && isLiveCloneActive}>
          <Zap size={14} className="text-yellow-500" /> Live
        </VoiceButton>
      )}

      {/* --- Loading State --- */}
      {isLoading && (
        <div className="px-3 py-1.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader size={14} className="animate-spin" />
        </div>
      )}

      {/* --- User's Offline Cloned Voices --- */}
      {clones && clones.filter(c => c.status === 'completed').map(clone => (
        <VoiceButton
          key={clone.id}
          onClick={() => setSelectedVoice(clone.id)}
          isActive={selectedVoiceId === clone.id}
        >
          <User size={14} /> {clone.clone_name}
        </VoiceButton>
      ))}

      {/* --- Error State --- */}
      {error && <span className="text-xs text-red-500 px-2">Error</span>}
    </div>
  );
};

VoiceSelector.propTypes = {
  selectedVoiceId: PropTypes.number,
  setSelectedVoice: PropTypes.func.isRequired,
  isLiveCloneActive: PropTypes.bool.isRequired,
  isVisible: PropTypes.bool.isRequired,
};

export default VoiceSelector;