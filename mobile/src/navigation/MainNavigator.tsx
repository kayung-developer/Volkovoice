import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Home, Bot, MessageSquare, UserCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { MainTabParamList } from './types';

// Import Screens
import WelcomeScreen from '../screens/WelcomeScreen'; // We will create this
import VoiceClonesScreen from '../screens/VoiceClonesScreen'; // We will create this
import ChatLobbyScreen from '../screens/ChatLobbyScreen'; // We will create this
import ProfileScreen from '../screens/ProfileScreen'; // We will create this

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Welcome') {
            IconComponent = Home;
          } else if (route.name === 'VoiceClones') {
            IconComponent = Bot;
          } else if (route.name === 'ChatLobby') {
            IconComponent = MessageSquare;
          } else if (route.name === 'Profile') {
            IconComponent = UserCircle;
          }

          if (!IconComponent) return null;

          const iconColor = focused ? theme.primary : theme.textSecondary;

          return (
            <View style={styles.iconContainer}>
              <IconComponent color={iconColor} size={size} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
            </View>
          );
        },
      })}>
      <Tab.Screen name="Welcome" component={WelcomeScreen} />
      <Tab.Screen name="VoiceClones" component={VoiceClonesScreen} />
      <Tab.Screen name="ChatLobby" component={ChatLobbyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 25,
    height: 70,
    borderTopWidth: 1,
    elevation: 8, // for Android shadow
    shadowColor: '#000', // for iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default MainNavigator;