//src/screens/TranslationSessionScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Mic, MicOff, Settings, LogOut } from 'lucide-react-native';
import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
} from 'react-native-audio-recorder-player';
import { RESULTS } from 'react-native-permissions';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import toast from 'react-hot-toast/native';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAudioWebSocket } from '../hooks/useAudioWebSocket';
import SummaryModal from '../components/summarization/SummaryModal'; // Assuming a mobile-adapted version exists

// In a real project, these would be in their own files.
// For this example, they are included here for completeness.

// --- Start: Contained AudioVisualizer Component ---
const MobileAudioVisualizer = ({ isActive, status, onPress, disabled }: any) => {
    const { theme } = useTheme();
    const scale = useSharedValue(1);

    useEffect(() => {
        if (isActive) {
            scale.value = withRepeat(withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
        } else {
            scale.value = withTiming(1, { duration: 500 });
        }
    }, [isActive, scale]);

    const animatedStyle = useAnimatedStyle(() => {
        return { transform: [{ scale: scale.value }] };
    });

    const getStatusColor = () => {
        if (status === 'connecting') return theme.warning;
        if (status === 'error' || status === 'disconnected') return theme.error;
        return isActive ? theme.error : theme.success;
    };

    return (
        <View style={styles.vizContainer}>
            <Animated.View style={[styles.vizRing, { borderColor: getStatusColor() }, animatedStyle]} />
            <TouchableOpacity
                onPress={onPress}
                style={[styles.micButton, { backgroundColor: getStatusColor() }]}
                disabled={disabled}
            >
                {status === 'connecting' ? (
                    <ActivityIndicator color="white" />
                ) : isActive ? (
                    <MicOff color="white" size={36} />
                ) : (
                    <Mic color="white" size={36} />
                )}
            </TouchableOpacity>
        </View>
    );
};
// --- End: Contained AudioVisualizer Component ---


// --- Start: Contained ConversationBubble Component ---
const MobileConversationBubble = ({ item, theme }: any) => {
    const isTranscript = item.type === 'transcript';
    const bubbleStyle = isTranscript
        ? { alignSelf: 'flex-end', backgroundColor: theme.primary }
        : { alignSelf: 'flex-start', backgroundColor: theme.card };
    const textStyle = { color: isTranscript ? theme.white : theme.text };

    return (
        <Animated.View
            layout={Layout.springify()}
            entering={FadeIn.duration(500)}
            style={[styles.bubble, bubbleStyle]}
        >
            <Text style={[styles.bubbleText, textStyle]}>{item.text}</Text>
        </Animated.View>
    );
};
// --- End: Contained ConversationBubble Component ---


// --- Start: Contained useAudioRecorder Hook ---
const audioRecorderPlayer = new AudioRecorderPlayer();
const useAudioRecorder = (onData: (dataUri: string) => void) => {
    const path = Platform.select({
        ios: 'volkovoice.m4a',
        android: `${RNFS.CachesDirectoryPath}/volkovoice.mp4`,
    });

    const startRecording = useCallback(async () => {
        try {
            await audioRecorderPlayer.startRecorder(path, {
                AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
                AudioSourceAndroid: AudioSourceAndroidType.MIC,
                AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
                AVNumberOfChannelsKeyIOS: 1,
                AVFormatIDKeyIOS: AVEncodingOption.aac,
            });
            audioRecorderPlayer.addRecordBackListener((e) => {
                // This listener gives you chunks of audio data.
                // For a real-time system, you'd process and send these chunks.
                // For simplicity here, we'll send on stop.
            });
        } catch (e) {
            console.error('startRecording error', e);
            toast.error('Failed to start recording.');
        }
    }, [path]);

    const stopRecording = useCallback(async () => {
        try {
            const uri = await audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.removeRecordBackListener();
            const dataUri = await RNFS.readFile(uri, 'base64');
            onData(`data:audio/mp4;base64,${dataUri}`);
            RNFS.unlink(uri); // Clean up file
        } catch (e) {
            console.error('stopRecording error', e);
        }
    }, [onData]);

    return { startRecording, stopRecording };
};
// --- End: Contained useAudioRecorder Hook ---


const TranslationSessionScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { apiClient } = useAuth();
  const { micPermission, checkMicPermission } = usePermissions();

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [formality, setFormality] = useState('formal');
  const [voiceId, setVoiceId] = useState<number | null>(null);
  const [emotion, setEmotion] = useState('neutral');

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const { status, conversation, topics, sendAudio, setConversation } = useAudioWebSocket(isSessionActive, formality, voiceId, emotion);

  const { startRecording, stopRecording } = useAudioRecorder(dataUri => {
    // In a real system with chunking, you'd send smaller blobs.
    // For this example, we send the whole file blob on stop.
    // This part would need to be adapted for true real-time streaming.
    const blob = new Blob([dataUri], { type: 'audio/mp4' }); // Faking blob for demo
    sendAudio(blob);
  });


  const handleToggleSession = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      await stopRecording();
    } else {
      const permission = await checkMicPermission();
      if (permission === RESULTS.GRANTED) {
        setIsSessionActive(true);
        await startRecording();
      }
    }
  };

  const handleEndSession = async () => { /* ... (unchanged from web version) ... */ };
  const handleCloseSummaryModal = () => { /* ... (unchanged from web version) ... */ };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
         <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color={theme.text} size={26} /></TouchableOpacity>
         <Text style={[styles.headerTitle, { color: theme.text }]}>Live Session</Text>
         <TouchableOpacity onPress={handleEndSession}><LogOut color={theme.text} size={22} /></TouchableOpacity>
      </View>

      {/* --- In a real app, selectors would be here --- */}
      {/* <View style={styles.controlsContainer}> ... </View> */}

      <FlatList
        style={styles.convoList}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 20 }}
        data={conversation}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MobileConversationBubble item={item} theme={theme} />}
        inverted
      />

      <View style={styles.footer}>
        <MobileAudioVisualizer
            isActive={isSessionActive}
            status={status}
            onPress={handleToggleSession}
            disabled={micPermission !== RESULTS.GRANTED && !isSessionActive}
        />
      </View>
      <SummaryModal
          isOpen={isSummaryModalOpen}
          onClose={handleCloseSummaryModal}
          isLoading={isSummarizing}
          summaryData={summaryData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    convoList: { flex: 1 },
    footer: { padding: 20, alignItems: 'center', justifyContent: 'center' },
    vizContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    vizRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 60, borderWidth: 4 },
    micButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    bubble: { padding: 12, borderRadius: 18, marginVertical: 5, maxWidth: '80%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    bubbleText: { fontSize: 16, lineHeight: 22 },
});

export default TranslationSessionScreen;