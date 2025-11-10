import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MessageSquare, Users, Link as LinkIcon } from 'lucide-react-native';
import toast from 'react-hot-toast/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type ChatLobbyNavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const ChatLobbyScreen = () => {
  const { theme } = useTheme();
  const { apiClient } = useAuth();
  const navigation = useNavigation<ChatLobbyNavProp>();
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const toastId = toast.loading('Creating session...');
    try {
      const { data } = await apiClient.post('/api/chat/create');
      toast.dismiss(toastId);
      navigation.navigate('ChatSession', { session_id: data.session_id });
    } catch (error) {
      console.error('Failed to create chat session:', error);
      toast.error('Could not create session.', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = () => {
    const sessionId = joinId.trim();
    if (!sessionId) {
      toast.error('Please enter a session ID.');
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      toast.error('Invalid session ID format.');
      return;
    }
    navigation.navigate('ChatSession', { session_id: sessionId });
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <Animated.View entering={FadeInUp.duration(800)}>
                <Text style={[styles.header, { color: theme.text }]}>Chat Translation</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Communicate instantly via text with real-time translation.
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(800).delay(200)}>
                <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.black }]}>
                    <View style={styles.cardHeader}>
                        <MessageSquare color={theme.primary} size={24} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Start a New Chat</Text>
                    </View>
                    <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                        Create a private chat room and invite someone by sharing the link.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.primary }]}
                        onPress={handleCreateSession}
                        disabled={isCreating}
                    >
                        <Text style={styles.buttonText}>Create New Session</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(800).delay(400)}>
                <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.black }]}>
                    <View style={styles.cardHeader}>
                        <Users color={theme.secondary} size={24} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Join Existing Chat</Text>
                    </View>
                    <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                        Enter a session ID to join an ongoing conversation.
                    </Text>
                    <View style={styles.inputContainer}>
                         <LinkIcon style={styles.inputIcon} color={theme.textSecondary} size={20} />
                         <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            value={joinId}
                            onChangeText={setJoinId}
                            placeholder="Paste Session ID..."
                            placeholderTextColor={theme.textSecondary}
                            onSubmitEditing={handleJoinSession}
                            returnKeyType="join"
                         />
                    </View>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.secondary, opacity: !joinId.trim() ? 0.6 : 1 }]}
                        onPress={handleJoinSession}
                        disabled={!joinId.trim()}
                    >
                        <Text style={styles.buttonText}>Join Session</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  input: {
    padding: 15,
    paddingLeft: 45,
    borderRadius: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  }
});

export default ChatLobbyScreen;