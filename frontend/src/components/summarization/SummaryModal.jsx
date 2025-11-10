import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clipboard, Download, FileText, Check, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';
import Button from '../common/Button';

const SummaryModal = ({ isOpen, onClose, summaryData, isLoading }) => {

  const handleCopyToClipboard = () => {
    if (!summaryData) return;
    const textToCopy = `
SESSION SUMMARY
-----------------
${summaryData.summary}

ACTION ITEMS
--------------
${summaryData.action_items.map(item => `- ${item}`).join('\n')}
    `;
    navigator.clipboard.writeText(textToCopy.trim());
    toast.success("Summary copied to clipboard!");
  };

  const handleDownloadTranscript = () => {
    if (!summaryData) return;
    const blob = new Blob([summaryData.full_transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    link.download = `volkovoice-transcript-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">Session Summary</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <X size={24} />
              </button>
            </header>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Generating your summary...</p>
                </div>
              ) : summaryData ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-primary" />
                      <h3 className="text-lg font-semibold">Key Summary</h3>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md whitespace-pre-wrap">
                      {summaryData.summary}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <ListTodo className="w-6 h-6 text-secondary" />
                      <h3 className="text-lg font-semibold">Action Items</h3>
                    </div>
                    {summaryData.action_items.length > 0 ? (
                      <ul className="space-y-2 list-inside list-disc bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md text-gray-700 dark:text-gray-300">
                        {summaryData.action_items.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                       <p className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md">
                          No specific action items were identified.
                       </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center h-64 flex flex-col justify-center">
                    <p className="text-red-500">Could not generate summary. Please try again.</p>
                </div>
              )}
            </div>

            <footer className="flex flex-col sm:flex-row justify-end items-center gap-3 p-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={handleCopyToClipboard} disabled={isLoading || !summaryData}>
                <Clipboard size={16} className="mr-2" />
                Copy Summary
              </Button>
              <Button variant="secondary" onClick={handleDownloadTranscript} disabled={isLoading || !summaryData}>
                <Download size={16} className="mr-2" />
                Download Transcript
              </Button>
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

SummaryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  summaryData: PropTypes.shape({
    summary: PropTypes.string,
    action_items: PropTypes.arrayOf(PropTypes.string),
    full_transcript: PropTypes.string,
  }),
  isLoading: PropTypes.bool.isRequired,
};

export default SummaryModal;