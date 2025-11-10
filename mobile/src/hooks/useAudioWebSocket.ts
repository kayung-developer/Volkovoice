import { useState, useEffect, useRef, useCallback } from 'react';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer'; // Required for Base64 conversion
import toast from 'react-hot-toast/native';

import { useAuth } from './AuthContext';

// --- Type Definitions for WebSocket Communication ---
interface ConversationTurn {
  id: string;
  type: 'transcript' | 'translation';
  text: string;
  lang?: string;
  speaker?: string;
}

// Enable Sound playback in silent mode on iOS
Sound.setCategory('Playback');

export const useAudioWebSocket = (
  isActive: boolean,
  formality: string,
  voiceCloneId: number | null,
  emotion: string,
) => {
  const { user, profile } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);

  // --- State Management ---
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [isLiveCloneActive, setIsLiveCloneActive] = useState(false);
  const [serverMessage, setServerMessage] = useState('Ready to connect.');

  // --- Production-Grade Audio Playback Queue ---
  const audioQueueRef = useRef<string[]>([]); // Queue of base64 audio chunks
  const isPlayingRef = useRef(false);
  const soundRef = useRef<Sound | null>(null);

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    isPlayingRef.current = true;

    const base64Chunk = audioQueueRef.current.shift();
    if (!base64Chunk) {
        isPlayingRef.current = false;
        return;
    }

    const tempAudioPath = `${RNFS.DocumentDirectoryPath}/temp_${Date.now()}.wav`;

    // Write the base64 chunk to a temporary file
    RNFS.writeFile(tempAudioPath, base64Chunk, 'base64')
      .then(() => {
        const sound = new Sound(tempAudioPath, '', (error) => {
          if (error) {
            console.error('Failed to load the sound', error);
            isPlayingRef.current = false;
            RNFS.unlink(tempAudioPath).catch(() => {}); // Clean up failed file
            processAudioQueue(); // Try next item
            return;
          }
          soundRef.current = sound;
          sound.play((success) => {
            if (!success) {
              console.error('Playback failed due to audio decoding errors');
            }
            sound.release(); // Release the audio player resource
            RNFS.unlink(tempAudioPath).catch(() => {}); // Clean up file after playback
            isPlayingRef.current = false;
            processAudioQueue(); // Play next item in queue
          });
        });
      })
      .catch(err => {
          console.error('Failed to write temp audio file', err);
          isPlayingRef.current = false;
          processAudioQueue();
      });
  }, []);


  // --- WebSocket Connection Logic ---
  const sendConfig = useCallback((config = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const fullConfig = { formality, voice_clone_id: voiceCloneId, emotion, ...config };
      socketRef.current.send(JSON.stringify({ type: 'config', data: fullConfig }));
    }
  }, [formality, voiceCloneId, emotion]);

  useEffect(() => {
    if (isActive && user && !socketRef.current) {
      // Reset all states for a fresh session
      setConversation([]);
      setTopics([]);
      setIsLiveCloneActive(false);
      setStatus('connecting');
      setServerMessage('Connecting...');

      user.getIdToken().then(token => {
        const wsUrl = ('http://10.0.2.2:8000' || 'http://localhost:8000').replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsUrl}/ws/translate?token=${token}`);
        socketRef.current = ws;
        ws.binaryType = 'blob'; // Important for receiving audio data

        ws.onopen = () => {
                setStatus('connected');
                sendConfig({
                    source_lang: profile?.preferences?.interface_language || 'ru',
                    target_lang: profile?.preferences?.default_target_language || 'en',
                });
            };
        ws.onerror = (e) => {
            console.error('WebSocket Error:', e);
            setStatus('error');
            setServerMessage('Connection Error');
            toast.error('Connection failed.');
        };
        ws.onclose = () => {
            setStatus('disconnected');
            setServerMessage('Disconnected.');
            isPlayingRef.current = false;
            audioQueueRef.current = [];
            soundRef.current?.release();
        };
        ws.onmessage = (event) => {
          // --- Message Handling ---
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            const id = `${Date.now()}-${Math.random()}`;
             switch (message.type) {
                case 'status': setServerMessage(message.data); break;
                case 'transcript': setConversation(prev => [{ ...message.data, type: 'transcript', id }, ...prev]); break;
                case 'translation': setConversation(prev => [{ ...message.data, type: 'translation', id }, ...prev]); break;
                case 'keywords': setTopics(prev => Array.from(new Set([...prev, ...message.data]))); break;
                case 'live_clone_success': toast.success(message.data, {icon: '✨'}); setIsLiveCloneActive(true); break;
                case 'error': toast.error(message.data); break;
            }
          } else {
            // Handle binary audio data
            const reader = new FileReader();
            reader.onload = () => {
              // The result is a base64 string, remove the data URI prefix
              const base64Data = (reader.result as string).split(',')[1];
              audioQueueRef.current.push(base64Data);
              processAudioQueue();
            };
            reader.onerror = (error) => console.error("FileReader error:", error);
            reader.readAsDataURL(event.data);
          }
        };
      });

      return () => { socketRef.current?.close(); socketRef.current = null; };
    } else if (!isActive && socketRef.current) {
        socketRef.current.close();
    }
  }, [isActive, user, profile, sendConfig, processAudioQueue]);


  // --- Exposed Functions ---
  const sendAudio = useCallback((data: Blob) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    }
  }, []);

   useEffect(() => {
      if(status === 'connected') {
          sendConfig();
      }
  }, [formality, voiceCloneId, emotion, status, sendConfig])

  return { status, conversation, topics, serverMessage, isLiveCloneActive, sendAudio, setConversation };
};