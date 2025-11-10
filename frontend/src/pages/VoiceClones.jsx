// frontend/src/pages/VoiceClones.jsx (Completed with Full Management)
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Bot, Play, Square, Loader, Edit, Trash2, Check, X } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';

import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import UploadModal from '../components/voice-clones/UploadModal';
import CloneStatusBadge from '../components/voice-clones/CloneStatusBadge';


const fetcher = (url, apiClient) => apiClient.get(url).then(res => res.data);

const VoiceCloneItem = ({ clone }) => {
    const { apiClient } = useAuth();
    const { mutate } = useSWRConfig();
    const audioRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(clone.clone_name);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewEmotion, setPreviewEmotion] = useState('neutral');

    const handlePreview = async () => {
        if (isPreviewing) {
            if(audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsPreviewing(false);
            return;
        }
        setIsPreviewing(true);
        try {
            const response = await apiClient.post(`/api/voice-clone/${clone.id}/preview`,
                { text: "This is a test of my custom voice clone.", emotion: previewEmotion  },
                { responseType: 'blob' }
            );
            const audioUrl = URL.createObjectURL(response.data);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.play();
            audio.onended = () => {
                setIsPreviewing(false);
                URL.revokeObjectURL(audioUrl);
            };
        } catch (error) {
            toast.error("Failed to generate preview.");
            setIsPreviewing(false);
        }
    };

    const handleRename = async () => {
        if (newName.trim() === '' || newName === clone.clone_name) {
            setIsEditing(false);
            return;
        }
        const toastId = toast.loading("Renaming...");
        try {
            await apiClient.put(`/api/voice-clone/${clone.id}`, { clone_name: newName });
            toast.success("Voice renamed!", { id: toastId });
            mutate('/api/voice-clone/'); // Revalidate the data
            setIsEditing(false);
        } catch (error) {
            toast.error("Failed to rename.", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete "${clone.clone_name}"? This action cannot be undone.`)) {
            const toastId = toast.loading("Deleting...");
            try {
                await apiClient.delete(`/api/voice-clone/${clone.id}`);
                toast.success("Voice deleted!", { id: toastId });
                mutate('/api/voice-clone/');
            } catch (error) {
                toast.error("Failed to delete.", { id: toastId });
            }
        }
    };

    return (
        <motion.li
            layout
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
            <div className="flex-grow">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                         <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-gray-800 border border-primary rounded-md shadow-sm focus:outline-none focus:ring-primary"
                            autoFocus
                         />
                         <button onClick={handleRename} className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><Check size={20}/></button>
                         <button onClick={() => setIsEditing(false)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><X size={20}/></button>
                    </div>
                ) : (
                    <p className="text-lg font-bold text-primary">{clone.clone_name}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Created: {new Date(clone.created_at).toLocaleDateString()}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <CloneStatusBadge status={clone.status} />
                {clone.status === 'completed' && (
                <>
                        {/* NEW: Emotion Selector for Preview */}
                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-full">
                            {['neutral', 'excited', 'calm'].map(e => (
                                <button key={e} onClick={() => setPreviewEmotion(e)} className={`px-2 py-1 text-xs rounded-full ${previewEmotion === e ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{e}</button>
                            ))}
                        </div>
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-full">
                        <button onClick={handlePreview} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Preview Voice">
                            {isPreviewing ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
                        </button>
                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Rename Voice">
                            <Edit size={16} />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full" title="Delete Voice">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    </>
                )}
            </div>
        </motion.li>
    )
}
VoiceCloneItem.propTypes = { clone: PropTypes.object.isRequired };


const VoiceClones = () => {
  const { apiClient } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // SWR will handle fetching, caching, and polling
  const { data: clones, error, isLoading } = useSWR('/api/voice-clone/', (url) => fetcher(url, apiClient), {
      // Poll every 10 seconds if the page is visible and there are clones in training
      refreshInterval: (latestData) => {
          const isTraining = latestData?.some(clone => ['training', 'pending'].includes(clone.status.toLowerCase()));
          return isTraining ? 10000 : 0;
      }
  });

  const { mutate } = useSWRConfig();
  const handleUploadSuccess = () => {
    toast.success("Upload successful! Your new voice is being trained.");
    mutate('/api/voice-clone/'); // Trigger a re-fetch immediately
  };

  const renderContent = () => {
    if (isLoading && !clones) {
      return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }
    if (error) {
      return <div className="text-center text-red-500 p-8">Failed to load voice clones. Please try again later.</div>;
    }
    if (clones && clones.length === 0) {
      return (
        <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }}} initial="hidden" animate="visible" className="text-center p-12 bg-white dark:bg-dark-card rounded-lg shadow-md">
          <Bot size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">Your Voice Studio is Empty</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click 'Create New Voice' to upload your first audio sample and start cloning.</p>
        </motion.div>
      );
    }
    return (
      <motion.div
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="visible"
        className="bg-white dark:bg-dark-card rounded-lg shadow-md overflow-hidden"
      >
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {clones.map((clone) => (
            <VoiceCloneItem key={clone.id} clone={clone} />
          ))}
        </ul>
      </motion.div>
    );
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow p-4 sm:p-6 lg:p-8 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Voice Clone Studio</h1>
                <p className="mt-1 text-md text-gray-600 dark:text-gray-400">Create, manage, and preview your personalized AI voices.</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0">
                <Plus size={20} className="mr-2" />
                Create New Voice
              </Button>
            </header>
            {renderContent()}
          </motion.div>
        </main>
      </div>
      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUploadSuccess={handleUploadSuccess} />
    </>
  );
};

export default VoiceClones;