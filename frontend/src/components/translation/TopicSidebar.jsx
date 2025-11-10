import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, BookOpen, ChevronLeft } from 'lucide-react';

const TopicTag = ({ topic }) => {
  const handleTopicClick = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(topic)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={handleTopicClick}
      className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-sky-300 font-semibold rounded-full text-sm hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
    >
      {topic}
    </motion.button>
  );
};
TopicTag.propTypes = {
  topic: PropTypes.string.isRequired,
};


const TopicSidebar = ({ topics }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Create a unique, sorted list of topics
  const uniqueSortedTopics = [...new Set(topics)].sort((a, b) => a.localeCompare(b));

  if (isCollapsed) {
    return (
        <div className="absolute top-1/2 -right-0 -translate-y-1/2 z-20">
            <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 bg-white dark:bg-dark-card rounded-l-full shadow-lg border-y border-l border-gray-200 dark:border-gray-700"
                title="Show Topics"
            >
                <ChevronLeft className="h-6 w-6 transform rotate-180" />
            </button>
        </div>
    );
  }


  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col w-1/4 max-w-xs h-full bg-white/50 dark:bg-dark-bg/50 backdrop-blur-md border-l dark:border-gray-700"
    >
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Key Topics</h2>
        </div>
        <button onClick={() => setIsCollapsed(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Hide Topics">
            <ChevronLeft size={20} />
        </button>
      </header>

      <div className="flex-grow p-4 overflow-y-auto">
        {uniqueSortedTopics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
                {uniqueSortedTopics.map(topic => (
                    <TopicTag key={topic} topic={topic} />
                ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <BookOpen size={48} className="mb-4" />
            <p className="font-semibold">No topics detected yet.</p>
            <p className="text-sm">Key concepts from the conversation will appear here as you talk.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

TopicSidebar.propTypes = {
  topics: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default TopicSidebar;