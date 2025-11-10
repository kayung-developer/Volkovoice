import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast/native';

// Define the shape of a broadcasted chat message
interface ChatMessage {
  id: string;
  sender_uid: string;
  original_text: string;
  original_lang: string;
  translated_text: string;
  translated_lang: string;
  timestamp: string;
}

export const useChatWebSocket = (sessionId: string | undefined) => {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!sessionId || !user) return;

    setMessages([]);
    setStatus('connecting');

    user.getIdToken().then(token => {
      // Remember to use your actual IP or domain in production
      const wsUrl = ( 'http://10.0.2.2:8000' || 'http://localhost:8000')
        .replace(/^http/, 'ws');

      const ws = new WebSocket(`${wsUrl}/ws/chat/${sessionId}?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => setStatus('connected');
      ws.onerror = (error) => {
        console.error('Chat WebSocket Error:', error);
        setStatus('error');
        toast.error("Connection failed.");
      };
      ws.onclose = () => setStatus('disconnected');
      ws.onmessage = (event) => {
        try {
          const messageData: ChatMessage = JSON.parse(event.data);
          setMessages(prev => [messageData, ...prev]); // Prepend for inverted FlatList
        } catch (e) {
          console.error('Failed to parse chat message:', e);
        }
      };
    });

    return () => {
      socketRef.current?.close();
    };
  }, [sessionId, user]);

  const sendMessage = useCallback((messagePayload: { text: string; source_lang: string }) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(messagePayload));
    } else {
      toast.error("Not connected to chat.");
    }
  }, []);

  return { messages, status, sendMessage };
};