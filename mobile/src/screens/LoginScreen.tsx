import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import toast from 'react-hot-toast/native';

import { useTheme } from '../context/ThemeContext';
import { signInWithGoogle } from '../api/firebase';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const { theme } = useTheme();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // On success, the AuthContext listener will automatically navigate us away.
      toast.success('Successfully signed in!');
    } catch (error: any) {
      // Don't show a toast for user-cancelled sign-in
      if (error.code === '12501') { // GoogleSignin.SIGN_IN_CANCELLED
        console.log('User cancelled the sign in flow.');
      } else {
        console.error('Google Sign-In Failed:', error);
        toast.error('Sign-in failed. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(1000)}>
          <Text style={[styles.title, { color: theme.primary }]}>
            Volkovoice
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            AI-Powered Real-Time Dialogue Translation
          </Text>
        </Animated.View>

        <Animated.View style={styles.buttonContainer} entering={FadeInDown.duration(1000).delay(200)}>
          <GoogleSigninButton
            style={{ width: width - 80, height: 60 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleLogin}
            disabled={isSigningIn}
          />
           <Text style={[styles.tosText, { color: theme.textSecondary }]}>
            By continuing, you agree to our Terms of Service.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  tosText: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
  }
});

export default LoginScreen;