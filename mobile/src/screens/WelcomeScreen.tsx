import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mic, Bot, ArrowRight } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

// Define the navigation prop type for type safety
type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

// Reusable Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, onPress, delay = 0 }: any) => {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(800).delay(delay)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.black }]}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Icon color={theme.primary} size={28} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        </View>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
        <View style={styles.cardFooter}>
            <Text style={[styles.cardActionText, { color: theme.primary }]}>
                Get Started
            </Text>
            <ArrowRight color={theme.primary} size={18} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const WelcomeScreen = () => {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  // Determine the best name to display
  const userName = profile?.full_name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View entering={FadeInUp.duration(800)}>
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome, {userName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            What would you like to do today?
          </Text>
        </Animated.View>

        <View style={styles.cardContainer}>
          <FeatureCard
            icon={Mic}
            title="Live Translation"
            description="Engage in real-time, bidirectional voice conversations with our AI."
            onPress={() => navigation.navigate('TranslationSession')}
            delay={200}
          />
          <FeatureCard
            icon={Bot}
            title="Voice Clone Studio"
            description="Create and manage your personalized AI voices for a unique identity."
            onPress={() => navigation.navigate('Main', { screen: 'VoiceClones' })}
            delay={400}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 30,
  },
  cardContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Android shadow
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 15,
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default WelcomeScreen;