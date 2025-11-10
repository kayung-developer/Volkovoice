import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from './useAuth';
import toast from 'react-hot-toast';

/**
 * -----------------------------------------------------------------------------
 * Custom Hook: useChatWebSocket
 * -----------------------------------------------------------------------------
 * Manages the WebSocket connection and communication for the real-time
 * text chat session.
 *
 * @param {string} sessionId - The unique ID of the chat session to join.
 * @returns {object} - The state and handlers for the chat WebSocket.
 */
export const useChatWebSocket = (sessionId) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  // State Management
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting, connected, error, disconnected

  // WebSocket Lifecycle Effect
  useEffect(() => {
    if (!sessionId || !user) return;

    // Reset state for a new session
    setMessages([]);
    setStatus('connecting');

    user.getIdToken().then(token => {
      const wsUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
        .replace(/^http/, 'ws');

      const ws = new WebSocket(`${wsUrl}/ws/chat/${sessionId}?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        toast.success("Joined chat session!");
      };

      ws.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data);
          // Add the new message to the state, ensuring no duplicates
          setMessages(prev => {
            if (prev.some(m => m.id === messageData.id)) {
                return prev;
            }
            return [...prev, messageData]
          });
        } catch (e) {
          console.error('Failed to parse incoming chat message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('Chat WebSocket Error:', error);
        setStatus('error');
        toast.error("Connection to chat failed.");
      };

      ws.onclose = () => {
        setStatus('disconnected');
        socketRef.current = null;
      };
    });

    // Cleanup function to close the socket when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [sessionId, user]); // Re-run effect if sessionId or user changes

  // Stable function to send messages
  const sendMessage = useCallback((messagePayload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(messagePayload));
    } else {
      toast.error("You are not connected to the chat.");
    }
  }, []);

  return { messages, status, sendMessage };
};