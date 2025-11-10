import React from 'react';
import PropTypes from 'prop-types';
import { Meh, Smile, Frown } from 'lucide-react'; // Using icons to represent emotions

const EMOTION_OPTIONS = [
  { id: 'neutral', name: 'Neutral', icon: Meh },
  { id: 'excited', name: 'Excited', icon: Smile },
  { id: 'calm', name: 'Calm', icon: Frown }, // Note: Using 'Frown' icon for 'Calm' as an example
];

const EmotionControl = ({ selectedEmotion, setEmotion, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
      {EMOTION_OPTIONS.map(({ id, name, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setEmotion(id)}
          className={`px-3 py-1.5 flex items-center gap-2 text-sm font-semibold rounded-full transition-all duration-200 ${
            selectedEmotion === id
              ? 'bg-white dark:bg-dark-card text-primary shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-dark-card/50'
          }`}
          title={name}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  );
};

EmotionControl.propTypes = {
  selectedEmotion: PropTypes.string.isRequired,
  setEmotion: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired,
};

export default EmotionControl;