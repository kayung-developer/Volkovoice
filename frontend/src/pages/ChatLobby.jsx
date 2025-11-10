import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Users, ArrowRight, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const ChatLobby = () => {
  const { apiClient } = useAuth();
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    setIsCreating(true);
    const toastId = toast.loading("Creating new session...");
    try {
      const { data } = await apiClient.post('/api/chat/create');
      toast.success("Session created!", { id: toastId });
      navigate(`/chat/${data.session_id}`);
    } catch (error) {
      console.error("Failed to create chat session:", error);
      toast.error("Could not create session. Please try again.", { id: toastId });
      setIsCreating(false);
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    const sessionId = joinId.trim();
    if (!sessionId) {
      toast.error("Please enter a session ID.");
      return;
    }
    // Simple validation for UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      toast.error("Invalid session ID format.");
      return;
    }
    navigate(`/chat/${sessionId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full mx-auto text-center"
        >
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Real-Time Chat Translation
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
              Start a new conversation or join an existing one using a session ID.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* --- Create Session Card --- */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-8 bg-white dark:bg-dark-card rounded-2xl shadow-lg text-left"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                   <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Start a New Chat</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create a private chat room and invite someone by sharing the unique session link.
              </p>
              <Button onClick={handleCreateSession} isLoading={isCreating} className="w-full">
                <ArrowRight className="mr-2" size={20}/>
                Create New Session
              </Button>
            </motion.div>

            {/* --- Join Session Card --- */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-8 bg-white dark:bg-dark-card rounded-2xl shadow-lg text-left"
            >
              <div className="flex items-center gap-4 mb-4">
                 <div className="p-3 bg-secondary/10 rounded-lg">
                   <Users className="w-8 h-8 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold">Join Existing Chat</h2>
              </div>
               <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter the session ID you received from the host to join the conversation.
              </p>
              <form onSubmit={handleJoinSession} className="flex gap-2">
                <div className="relative flex-grow">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-primary rounded-md shadow-sm focus:outline-none focus:ring-0"
                        placeholder="Paste Session ID..."
                    />
                </div>
                <Button type="submit" variant="secondary">
                    Join
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ChatLobby;