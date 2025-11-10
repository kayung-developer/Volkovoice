// frontend/src/components/translation/ConversationBubble.jsx (Enhanced)
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { User, Bot, RefreshCw } from 'lucide-react';
import NuanceInsight from './NuanceInsight';

// A color palette for distinguishing between different speakers
const speakerColors = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

const getSpeakerColor = (speakerId) => {
  if (!speakerId || typeof speakerId !== 'string') return speakerColors[0];
  // Extract the number from "SPEAKER_XX"
  const speakerNum = parseInt(speakerId.split('_')[1] || '0', 10);
  return speakerColors[speakerNum % speakerColors.length];
};

const ConversationBubble = ({ item }) => {
  const [showLiteral, setShowLiteral] = useState(false);
  const isTranscript = item.type === 'transcript';
  const hasSpeaker = item.speaker && item.speaker.startsWith('SPEAKER');
  const speakerColor = getSpeakerColor(item.speaker);

  const primaryTranslationText = item.natural_translation || item.text;
  const hasAlternative = !!item.natural_translation && item.natural_translation !== item.text;
  const hasIdiom = item.detected_idioms && item.detected_idioms.length > 0;

  const bubbleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={bubbleVariants} initial="hidden" animate="visible" className="mb-4">
      <div className={`flex items-start gap-3 my-2 ${isTranscript ? 'justify-end' : 'justify-start'}`}>
        {!isTranscript && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center border-2 border-secondary/50">
            <Bot size={20} className="text-secondary" />
          </div>
        )}
        <div className="max-w-xl">
          {hasSpeaker && (
            <p className={`text-xs font-bold mb-1 ${isTranscript ? 'text-right' : 'text-left'}`} style={{ color: speakerColor }}>
              {isTranscript ? item.speaker.replace('_', ' ') : `Translation For ${item.speaker.replace('_', ' ')}`}
            </p>
          )}
          <div
            className={`p-3 rounded-2xl text-base shadow-md ${
              isTranscript
                ? `text-white rounded-br-lg`
                : 'bg-white dark:bg-dark-card text-gray-900 dark:text-white rounded-bl-lg'
            }`}
            style={{ backgroundColor: isTranscript ? speakerColor : undefined }}
          >
            <p>
              {isTranscript ? item.text : (hasAlternative && showLiteral ? item.text : primaryTranslationText)}
            </p>
            {hasAlternative && (
              <div className="mt-2 border-t pt-1 border-white/20 flex items-center justify-end">
                <button
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="flex items-center gap-1 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity"
                >
                  <RefreshCw size={12} />
                  {showLiteral ? 'Show Natural' : 'Show Literal'}
                </button>
              </div>
            )}
          </div>
        </div>
        {isTranscript && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2"
            style={{ backgroundColor: `${speakerColor}33`, borderColor: `${speakerColor}80` }} // 33 for 20% opacity, 80 for 50%
          >
            <User size={20} style={{ color: speakerColor }}/>
          </div>
        )}
      </div>

      {!isTranscript && hasIdiom && <NuanceInsight idiomData={item.detected_idioms[0]} />}
    </motion.div>
  );
};

ConversationBubble.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.string.isRequired,
    lang: PropTypes.string,
    type: PropTypes.oneOf(['transcript', 'translation']).isRequired,
    natural_translation: PropTypes.string,
    detected_idioms: PropTypes.array,
    speaker: PropTypes.string, // Speaker ID from diarization
  }).isRequired,
};

export default ConversationBubble;