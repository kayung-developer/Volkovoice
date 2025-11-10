import { NavigatorScreenParams } from '@react-navigation/native';

// Type definition for the screens within our bottom tab navigator
export type MainTabParamList = {
  Welcome: undefined;
  VoiceClones: undefined;
  ChatLobby: undefined;
  Profile: undefined;
};

// Update the RootStackParamList to know about the MainTabParamList
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>; // The "Main" route now contains the tab navigator
  TranslationSession: undefined;
  ChatSession: { session_id: string };
  Settings: undefined;
};