import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Send, Copy } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import toast from 'react-hot-toast/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

type ChatSessionRouteProp = RouteProp<RootStackParamList, 'ChatSession'>;

// Reusable Chat Bubble Component
const ChatBubble = ({ message, currentUserUid, theme }: any) => {
    const isMe = message.sender_uid === currentUserUid;
    return (
        <View style={[styles.bubbleContainer, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
            <View style={[
                styles.bubble,
                isMe ? { backgroundColor: theme.primary } : { backgroundColor: theme.card },
                isMe ? styles.myBubble : styles.theirBubble
            ]}>
                <Text style={[styles.originalText, isMe ? { color: theme.white } : { color: theme.text }]}>
                    {message.original_text}
                </Text>
                <View style={[styles.divider, { borderBottomColor: isMe ? theme.white + '50' : theme.border }]} />
                <Text style={[styles.translatedText, isMe ? { color: theme.white + '90' } : { color: theme.textSecondary }]}>
                    {message.translated_text}
                </Text>
            </View>
        </View>
    );
}

const ChatSessionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatSessionRouteProp>();
  const { session_id } = route.params;

  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const sourceLang = profile?.preferences?.interface_language || 'ru';

  const { messages, status, sendMessage } = useChatWebSocket(session_id);

  const copySessionId = () => {
    Clipboard.setString(session_id);
    toast.success("Session ID copied!");
  }

  const renderStatus = () => {
      if(status === 'connecting') return <ActivityIndicator size="small" color={theme.textSecondary} />
      if(status === 'error' || status === 'disconnected') return <Text style={{color: theme.error}}>Offline</Text>
      return <Text style={{color: theme.success}}>Connected</Text>
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft color={theme.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Chat Session</Text>
            {renderStatus()}
        </View>
        <TouchableOpacity onPress={copySessionId} style={styles.headerButton}>
          <Copy color={theme.text} size={22} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlatList
          style={styles.messageList}
          contentContainerStyle={{ padding: 10 }}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} currentUserUid={user?.uid} theme={theme} />}
          inverted // This is key for chat UIs
        />

        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: !inputText.trim() ? 0.5 : 1 }]}
            disabled={!inputText.trim()}
            onPress={() => {
                sendMessage({ text: inputText, source_lang: sourceLang });
                setInputText('');
            }}
          >
            <Send color={theme.white} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ... Styles defined below
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    headerButton: { padding: 5 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    messageList: { flex: 1 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        fontSize: 16,
    },
    sendButton: {
        marginLeft: 10,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubbleContainer: {
        width: '100%',
        paddingVertical: 4,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
    },
    originalText: {
        fontSize: 16,
    },
    divider: {
        borderBottomWidth: 1,
        marginVertical: 6,
    },
    translatedText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});

export default ChatSessionScreen;