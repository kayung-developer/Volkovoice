import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, ChevronLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/common/Spinner';
import { useChatWebSocket } from '../hooks/useChatWebSocket'; // We will create this next

const ChatBubble = ({ message, currentUserUid }) => {
  const isMe = message.sender_uid === currentUserUid;
  const bubbleAlignment = isMe ? 'justify-end' : 'justify-start';
  const bubbleStyles = isMe
    ? 'bg-primary text-white rounded-br-none'
    : 'bg-white dark:bg-dark-card text-gray-900 dark:text-white rounded-bl-none';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${bubbleAlignment} my-2`}
    >
      <div className={`max-w-lg p-3 rounded-xl shadow-md ${bubbleStyles}`}>
        <p className="text-base">{message.original_text}</p>
        <p className="text-sm text-gray-300/80 dark:text-gray-400/80 border-t border-white/20 dark:border-gray-500/50 mt-1 pt-1">
          {message.translated_text}
        </p>
      </div>
    </motion.div>
  );
};

const ChatSession = () => {
  const { session_id } = useParams();
  const { user, profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Determine the user's primary language from their profile
  const sourceLang = profile?.preferences?.interface_language || 'ru';

  // Connect to the chat WebSocket using our new custom hook
  const { messages, status, sendMessage } = useChatWebSocket(session_id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (text) {
      sendMessage({ text, source_lang: sourceLang });
      setInputText('');
    }
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Session link copied to clipboard!");
  }

  if (status === 'connecting') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4">Joining chat session...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
        <div className="flex flex-col h-screen items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-red-500">Connection Error</h2>
            <p className="mt-2">Could not connect to the chat session.</p>
            <p>Please check the session ID or your internet connection.</p>
            <Link to="/chat" className="mt-4 text-primary hover:underline">
                Return to Lobby
            </Link>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="flex-shrink-0 flex items-center justify-between p-4 bg-white dark:bg-dark-card border-b dark:border-gray-700 z-10">
        <Link to="/chat" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft size={24} />
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-lg">Chat Translation</h1>
          <p className="text-xs text-gray-500">Session ID: {session_id}</p>
        </div>
        <button onClick={copySessionLink} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Copy Session Link">
          <Copy size={20} />
        </button>
      </header>

      <main className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} currentUserUid={user.uid} />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="flex-shrink-0 p-4 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-t dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow px-4 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-primary rounded-full shadow-sm focus:outline-none focus:ring-0"
                    autoFocus
                />
                <button
                    type="submit"
                    className="p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    disabled={!inputText.trim()}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
      </footer>
    </div>
  );
};

export default ChatSession;