import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import AudioVisualizer from '../components/translation/AudioVisualizer';
import ConversationBubble from '../components/translation/ConversationBubble';
import LanguageSelector from '../components/translation/LanguageSelector';
import { useWebSocket } from '../hooks/useWebSocket';
import useAuth from '../hooks/useAuth';
import VoiceSelector from '../components/translation/VoiceSelector';
import AvatarDisplay from '../components/translation/AvatarDisplay';
import SummaryModal from '../components/summarization/SummaryModal'; // NEW: Import the modal
import Button from '../components/common/Button';
import EmotionControl from '../components/translation/EmotionControl';
import TopicSidebar from '../components/translation/TopicSidebar';

const FormalityControl = ({ formality, setFormality, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
      <button
        onClick={() => setFormality('informal')}
        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
          formality === 'informal' ? 'bg-white dark:bg-dark-card text-primary shadow-md' : 'text-gray-600 dark:text-gray-300'
        }`}
      >
        Informal (ты)
      </button>
      <button
        onClick={() => setFormality('formal')}
        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
          formality === 'formal' ? 'bg-white dark:bg-dark-card text-primary shadow-md' : 'text-gray-600 dark:text-gray-300'
        }`}
      >
        Formal (вы)
      </button>
    </div>
  );
};
FormalityControl.propTypes = {
    formality: PropTypes.string.isRequired,
    setFormality: PropTypes.func.isRequired,
    isVisible: PropTypes.bool.isRequired,
};


const TranslationSession = () => {
  const { profile, apiClient } = useAuth();
  const navigate = useNavigate();

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [langConfig, setLangConfig] = useState({
      source_lang: profile?.preferences?.interface_language || 'ru',
      target_lang: profile?.preferences?.default_target_language || 'en'
  });
  const [formality, setFormality] = useState('formal');
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
   const [emotion, setEmotion] = useState('neutral');

  // Summarization State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const {
    status,
    conversation,
    setConversation,
    serverMessage,
    isLiveCloneActive,
    topics, // NEW: Get topics from the hook
    sendAudio,
    sendConfig
  } = useWebSocket(
    isSessionActive,
    formality,
    selectedVoiceId,
    emotion
  );

  const mediaRecorderRef = useRef(null);
  const conversationEndRef = useRef(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setIsSessionActive(true); // Connect WebSocket
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.addEventListener('dataavailable', event => event.data.size > 0 && sendAudio(event.data));
      mediaRecorder.start(1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error("Microphone access denied.");
    }
  }, [sendAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    setIsSessionActive(false); // Disconnect WebSocket
  }, [micStream]);

  const toggleListening = useCallback(() => {
    if (isSessionActive) {
      stopListening();
    } else {
      startListening();
    }
  }, [isSessionActive, startListening, stopListening]);

  // NEW: End Session and Summarize Logic
  const handleEndSession = async () => {
    stopListening();
    if (conversation.length === 0) {
        navigate('/'); // If no conversation, just go home
        return;
    };

    setIsSummaryModalOpen(true);
    setIsSummarizing(true);
    setSummaryData(null);

    try {
        const response = await apiClient.post('/api/conversation/summarize', {
            conversation,
            source_lang: langConfig.source_lang,
            target_lang: langConfig.target_lang,
        });
        setSummaryData(response.data);
    } catch (error) {
        console.error("Summarization failed:", error);
        toast.error("Could not generate session summary.");
        // We still show the modal so they can download the transcript
        setSummaryData({
            summary: "Error: Could not generate a summary.",
            action_items: [],
            full_transcript: "Transcript data was not available due to an error."
        });
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleCloseSummaryModal = () => {
      setIsSummaryModalOpen(false);
      setConversation([]); // Clear conversation for the next session
      setSummaryData(null);
  }

  useEffect(() => {
    return () => { stopListening(); }; // Cleanup on component unmount
  }, [stopListening]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const switchLanguages = useCallback(() => {
    const newConfig = { source_lang: langConfig.target_lang, target_lang: langConfig.source_lang };
    setLangConfig(newConfig);
    sendConfig(newConfig);
  }, [langConfig, sendConfig]);

  const isFormalityControlVisible = langConfig.source_lang === 'en' && langConfig.target_lang === 'ru';
  const hasConversationStarted = conversation.length > 0;

  return (
    <>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <div className="hidden lg:flex">
          <TopicSidebar topics={topics} />
        </div>
        <div className="flex flex-col flex-1 h-full">
          <header className="flex-shrink-0 grid grid-cols-3 items-center p-4 bg-white dark:bg-dark-card border-b dark:border-gray-700 z-10">
            <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 justify-self-start">
              <ChevronLeft size={24} />
            </Link>
            <div className="text-center">
              <h1 className="font-bold text-lg">Live Translation</h1>
              <p className="text-sm text-gray-500 capitalize">{serverMessage}</p>
            </div>
            <div className="justify-self-end">
                <Button
                    onClick={handleEndSession}
                    disabled={!hasConversationStarted && !isSessionActive}
                    variant="secondary"
                    size="sm"
                >
                    <LogOut size={16} className="mr-2"/>
                    End Session
                </Button>
            </div>
          </header>

          <div className="flex-shrink-0 flex flex-col items-center justify-center gap-4 p-2 bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm border-b dark:border-gray-700">
            <LanguageSelector sourceLang={langConfig.source_lang} targetLang={langConfig.target_lang} onSwitch={switchLanguages} />
            <div className="flex flex-wrap items-center justify-center gap-4">
                <FormalityControl formality={formality} setFormality={setFormality} isVisible={isFormalityControlVisible} />
                <VoiceSelector selectedVoiceId={selectedVoiceId} setSelectedVoice={setSelectedVoiceId} isLiveCloneActive={isLiveCloneActive} isVisible={true} />
                <EmotionControl selectedEmotion={emotion} setEmotion={setEmotion} isVisible={true} />
            </div>
          </div>

          <main className="flex-grow p-4 overflow-y-auto">
            {conversation.map((item) => <ConversationBubble key={item.id} item={item} />)}
            <div ref={conversationEndRef} />
          </main>

          <footer className="hidden lg:flex flex-shrink-0 items-center justify-center p-6 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-t dark:border-gray-700">
            <AudioVisualizer isListening={isSessionActive} stream={micStream} status={status} onToggle={toggleListening} />
          </footer>
        </div>

        <div className="hidden lg:flex w-1/3 max-w-md 2xl:w-2/5 2xl:max-w-xl flex-col items-center justify-center p-6 bg-white/30 dark:bg-dark-bg/50 border-l dark:border-gray-700">
          <AvatarDisplay stream={micStream} isListening={isSessionActive} />
        </div>

        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <AudioVisualizer isListening={isSessionActive} stream={micStream} status={status} onToggle={toggleListening} />
        </div>
      </div>

      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={handleCloseSummaryModal}
        isLoading={isSummarizing}
        summaryData={summaryData}
      />
    </>
  );
};

export default TranslationSession;