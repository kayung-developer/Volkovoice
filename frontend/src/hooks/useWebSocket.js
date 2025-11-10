// frontend/src/hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from './useAuth';
import toast from 'react-hot-toast';

/**
 * -----------------------------------------------------------------------------
 * Custom Hook: useWebSocket
 * -----------------------------------------------------------------------------
 * Manages the WebSocket connection and communication for the real-time
 * translation session.
 *
 * Manages the WebSocket connection for the real-time translation session.
 * @param {boolean} isConnected - Flag to control the connection lifecycle.
 * @param {string} formality - The current formality setting.
 * @param {number|null} voiceCloneId - The ID of the selected offline voice clone.
 * @param {string} emotion - NEW: The desired vocal emotion.
 * @returns {object} - The state and handlers for the WebSocket.
 */
export const useWebSocket = (isConnected, formality, voiceCloneId, emotion) => {
  const { user, profile } = useAuth(); // Get user and profile for initial config
  const socketRef = useRef(null);

  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [conversation, setConversation] = useState([]);
  const [serverMessage, setServerMessage] = useState('Ready to connect.');
  const [isLiveCloneActive, setIsLiveCloneActive] = useState(false);
  const [topics, setTopics] = useState([]);

  // --- Advanced Audio Playback Queue ---
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    isPlayingRef.current = true;

    const audioData = audioQueueRef.current.shift();
    const audioBlob = new Blob([audioData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      isPlayingRef.current = false;
      processAudioQueue(); // Process the next item
    };

    audio.play().catch(e => {
      console.error("Audio playback error:", e);
      isPlayingRef.current = false; // Reset on error
      processAudioQueue();
    });
  }, []);

  // --- Stable function to send configuration updates ---
  const sendConfig = useCallback((config) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const fullConfig = {
        formality,
        voice_clone_id: voiceCloneId,
        emotion,
        ...config,
      };
      socketRef.current.send(JSON.stringify({ type: 'config', data: fullConfig }));
    }
  }, [formality, voiceCloneId, emotion]);


  // --- WebSocket Lifecycle Effect ---
  useEffect(() => {
    if (isConnected && user && !socketRef.current) {
      setIsLiveCloneActive(false); // Reset on new connection
      setConversation([]);
      setTopics([]);
      setStatus('connecting');
      setServerMessage('Connecting to Volkovoice...');

      user.getIdToken().then(token => {
        const wsUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080')
          .replace(/^http/, 'ws');

        const ws = new WebSocket(`${wsUrl}/ws/translate?token=${token}`);
        socketRef.current = ws;

        ws.onopen = () => {
          setStatus('connected');
          setServerMessage('Connection established. Start speaking.');
          // Send initial config based on user profile
          sendConfig({
            source_lang: profile?.preferences?.interface_language || 'ru',
            target_lang: profile?.preferences?.default_target_language || 'en',
          });
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
             const reader = new FileReader();
             reader.onload = function() {
                audioQueueRef.current.push(this.result);
                processAudioQueue();
             };
             reader.readAsArrayBuffer(event.data);
          } else {
            try {
              const message = JSON.parse(event.data);
              const id = `${Date.now()}-${Math.random()}`; // More unique ID
              switch (message.type) {
                case 'status':
                  setServerMessage(message.data);
                  break;
                case 'transcript':
                  setConversation(prev => [...prev, { ...message.data, type: 'transcript', id }]);
                  break;
                case 'translation':
                  setConversation(prev => [...prev, {
                    ...message.data,
                    type: 'translation',
                    id,
                    // Ensure backward compatibility if backend sends older format
                    text: message.data.translated_text || message.data.text,
                    lang: message.data.target_lang || message.data.lang,
                  }]);
                  break;
                  case 'keywords':
                setTopics(prevTopics => {
                  // Use a Set to ensure all topics are unique
                  const newTopics = new Set([...prevTopics, ...message.data]);
                  return Array.from(newTopics);
                });
                break;
                case 'live_clone_success':
                  toast.success(message.data, { icon: '✨' });
                  setIsLiveCloneActive(true);
                  break;
                case 'error':
                  setStatus('error');
                  setServerMessage(`Error: ${message.data}`);
                  toast.error(message.data);
                  break;
                default:
                    console.warn("Received unknown message type:", message.type);
              }
            } catch (e) {
              console.error('Failed to parse server message:', event.data);
            }
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
          setStatus('error');
          setServerMessage('Connection error.');
          toast.error("Connection failed. Please refresh and try again.");
        };

        ws.onclose = () => {
          setStatus('disconnected');
          setServerMessage('Connection closed.');
          socketRef.current = null;
        };
      });
    }

    // Cleanup: close the socket when the component unmounts or `isConnected` becomes false
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isConnected, user, profile, sendConfig, processAudioQueue]);

  // --- Function to send raw audio data ---
  const sendAudio = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    }
  }, []);

  // --- Effect to push config changes to the server ---
  useEffect(() => {
    if (status === 'connected') {
      sendConfig({}); // Send latest state (formality, voiceCloneId)
    }
  }, [formality, voiceCloneId, emotion, status, sendConfig]);

  // If a user selects an offline clone, the "live" clone is no longer the active voice source.
  // This effect ensures the UI reflects that state change.
  useEffect(() => {
    if (voiceCloneId !== null) {
      setIsLiveCloneActive(false);
    }
  }, [voiceCloneId]);

  return { status, conversation, setConversation, serverMessage, isLiveCloneActive, topics, sendAudio, sendConfig };
};