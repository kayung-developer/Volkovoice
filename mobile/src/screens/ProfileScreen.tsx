import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User,
  Settings,
  Palette,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import DeviceInfo from 'react-native-device-info';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { handleSignOut } from '../api/firebase';

type ProfileScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// Reusable component for each row in the list
const ProfileRow = ({ icon: Icon, label, onPress, rightContent }: any) => {
    const { theme } = useTheme();
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <Icon color={theme.textSecondary} size={22} />
            <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
            <View style={styles.rowRight}>
                {rightContent}
                <ChevronRight color={theme.textSecondary} size={20} />
            </View>
        </TouchableOpacity>
    );
};

// Reusable component for the theme toggle
const ThemeToggle = () => {
    const { themePreference, setThemePreference, theme } = useTheme();
    const options = [
        { id: 'light', icon: Sun },
        { id: 'dark', icon: Moon },
        { id: 'system', icon: Laptop },
    ];
    return (
        <View style={[styles.themeToggleContainer, { backgroundColor: theme.background }]}>
            {options.map(({ id, icon: Icon }) => (
                <TouchableOpacity
                    key={id}
                    onPress={() => setThemePreference(id as any)}
                    style={[
                        styles.themeOption,
                        themePreference === id && { backgroundColor: theme.card, shadowColor: theme.black },
                    ]}
                >
                    <Icon color={themePreference === id ? theme.primary : theme.textSecondary} size={20} />
                </TouchableOpacity>
            ))}
        </View>
    );
};


const ProfileScreen = () => {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<ProfileScreenNavProp>();
  const appVersion = DeviceInfo.getVersion();

  const onSignOut = () => {
    Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => handleSignOut() }
        ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <Animated.View style={styles.profileHeader} entering={FadeInUp.duration(800)}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <User color={theme.primary} size={40} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>
            {profile?.full_name || user?.displayName || 'Volkovoice User'}
          </Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {user?.email}
          </Text>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.duration(800).delay(200)}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                <ProfileRow
                    icon={Settings}
                    label="Settings"
                    onPress={() => navigation.navigate('Settings')}
                />
            </View>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.duration(800).delay(400)}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                 <View style={styles.row}>
                    <Palette color={theme.textSecondary} size={22} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Theme</Text>
                    <ThemeToggle />
                </View>
            </View>
        </Animated.View>

         <Animated.View style={styles.section} entering={FadeInUp.duration(800).delay(600)}>
            <View style={[styles.sectionContent, { backgroundColor: theme.card, marginTop: 20 }]}>
                 <ProfileRow icon={LogOut} label="Sign Out" onPress={onSignOut} />
            </View>
        </Animated.View>

        <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            Version {appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 10,
  },
  sectionContent: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  rowLabel: {
    fontSize: 16,
    marginLeft: 15,
  },
  rowRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    marginLeft: 'auto',
  },
  themeOption: {
    padding: 8,
    borderRadius: 16,
    elevation: 4, // Android
    shadowOffset: { width: 0, height: 2 }, // iOS
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 40,
  }
});

export default ProfileScreen;