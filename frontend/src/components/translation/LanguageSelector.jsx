import React from 'react';
import PropTypes from 'prop-types';
import { ArrowRightLeft } from 'lucide-react';

// A map for displaying full language names from their codes
const LANGUAGE_MAP = {
  ru: 'Russian',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
};

const LanguageSelector = ({ sourceLang, targetLang, onSwitch }) => {
  const getLanguageName = (code) => LANGUAGE_MAP[code] || code.toUpperCase();

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 p-2 bg-gray-100 dark:bg-dark-card rounded-full shadow-inner">
      <div className="flex-1 text-center px-4 py-2 bg-white dark:bg-gray-700 rounded-full">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{getLanguageName(sourceLang)}</span>
      </div>
      <button
        onClick={onSwitch}
        className="p-2 rounded-full text-primary bg-white dark:bg-gray-700 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
        title="Switch Languages"
      >
        <ArrowRightLeft size={20} />
      </button>
      <div className="flex-1 text-center px-4 py-2 bg-white dark:bg-gray-700 rounded-full">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{getLanguageName(targetLang)}</span>
      </div>
    </div>
  );
};

LanguageSelector.propTypes = {
  sourceLang: PropTypes.string.isRequired,
  targetLang: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired,
};

export default LanguageSelector;