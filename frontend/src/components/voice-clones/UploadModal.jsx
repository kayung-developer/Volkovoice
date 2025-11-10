// frontend/src/components/voice-clones/UploadModal.jsx (Enhanced for UI/UX)
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, UploadCloud, FileAudio, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import useAuth from '../../hooks/useAuth';

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const { apiClient } = useAuth();
  const [cloneName, setCloneName] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: null });

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus(prev => ({ ...prev, error: null }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
  });

  const handleUpload = async () => {
    if (!file || !cloneName.trim()) {
      setStatus({ loading: false, error: 'Please provide a name and select an audio file.' });
      return;
    }

    setStatus({ loading: true, error: null });
    const formData = new FormData();
    formData.append('name', cloneName.trim());
    formData.append('file', file);

    try {
      await apiClient.post('/api/voice-clone/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUploadSuccess();
      handleClose();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Upload failed. Please try again.";
      setStatus({ loading: false, error: errorMessage });
    }
  };

  const handleClose = () => {
    if (status.loading) return; // Prevent closing while uploading
    setCloneName('');
    setFile(null);
    setStatus({ loading: false, error: null });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="relative w-full max-w-lg p-6 bg-white dark:bg-dark-card rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Voice Clone</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="cloneName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Voice Name
                </label>
                <input
                  type="text"
                  id="cloneName"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="e.g., My Professional Voice"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audio Sample
                </label>
                <div
                  {...getRootProps()}
                  className={`p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-primary/70'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {isDragActive ? 'Drop the file here...' : 'Drag & drop audio or click to select'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    For best results, use a clear 30-60 second sample with no background noise. (Max 10MB)
                  </p>
                </div>
              </div>

              {file && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                  <FileAudio className="text-primary flex-shrink-0" />
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </motion.div>
              )}

              {fileRejections.length > 0 && (
                <div className="text-red-500 text-sm">File is too large or invalid type. Please try another.</div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <Button
                onClick={handleUpload}
                isLoading={status.loading}
                disabled={status.loading || !file || !cloneName}
              >
                Start Training
              </Button>
              {status.error && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={16} />
                  <span className="text-sm text-right">{status.error}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

UploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUploadSuccess: PropTypes.func.isRequired,
};

export default UploadModal;