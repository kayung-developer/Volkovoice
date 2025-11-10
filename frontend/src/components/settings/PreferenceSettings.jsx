// frontend/src/components/settings/PreferenceSettings.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { Globe } from 'lucide-react';
import Button from '../common/Button'; // Using the new custom button

// A more extensive list of languages for the dropdowns
const LANGUAGES = [
  { code: 'ru', name: 'Russian' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const PreferenceSettings = ({ profile, onUpdate }) => {
  // Ensure preferences are initialized correctly, even if the profile object is missing them.
  const [preferences, setPreferences] = useState({
    interface_language: 'ru',
    default_target_language: 'en',
    ...profile.preferences,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Saving preferences...');

    try {
      await onUpdate({ preferences });
      toast.success('Preferences updated successfully!', { id: toastId });
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md mt-8">
      <div className="flex items-center mb-4">
        <Globe className="w-6 h-6 mr-3 text-primary" />
        <h2 className="text-xl font-bold">Language & Region</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* --- Interface Language --- */}
          <div>
            <label htmlFor="interface_language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              My Language
            </label>
            <select
              id="interface_language"
              name="interface_language"
              value={preferences.interface_language}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary rounded-md shadow-sm"
            >
              {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
          </div>

          {/* --- Default Target Language --- */}
          <div>
            <label htmlFor="default_target_language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Translate To
            </label>
            <select
              id="default_target_language"
              name="default_target_language"
              value={preferences.default_target_language}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary rounded-md shadow-sm"
            >
              {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};

PreferenceSettings.propTypes = {
  profile: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default PreferenceSettings;