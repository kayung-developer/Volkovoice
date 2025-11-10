// frontend/src/components/translation/NuanceInsight.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const NuanceInsight = ({ idiomData }) => {
  if (!idiomData) return null;

  const containerVariants = {
    hidden: { opacity: 0, height: 0, y: -20 },
    visible: {
      opacity: 1,
      height: 'auto',
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1], // A nice easing curve
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mt-2 mb-4 ml-14" // Aligns with the translation bubble
    >
      <div className="bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 rounded-r-lg shadow-md">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <Lightbulb className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
              Cultural Nuance Detected
            </p>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-100 space-y-1">
              <p>
                The phrase <strong className="italic">"{idiomData.idiom}"</strong> is a Russian idiom.
              </p>
              <p>
                <strong>Meaning:</strong> {idiomData.meaning}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

NuanceInsight.propTypes = {
  idiomData: PropTypes.shape({
    idiom: PropTypes.string,
    meaning: PropTypes.string,
    english_equivalent: PropTypes.string,
  }),
};

export default NuanceInsight;