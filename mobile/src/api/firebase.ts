import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// You must configure this with the web client ID from your google-services.json
// Go to your Firebase project -> Authentication -> Sign-in method -> Google -> Web SDK configuration
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_FROM_FIREBASE_CONSOLE.apps.googleusercontent.com',
});

/**
 * Initiates the Google Sign-In flow on the mobile device.
 * @returns The user's Firebase credentials.
 */
export const signInWithGoogle = async (): Promise<FirebaseAuthTypes.UserCredential> => {
  // Get the users ID token
  const { idToken } = await GoogleSignin.signIn();
  // Create a Google credential with the token
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  // Sign-in the user with the credential
  return auth().signInWithCredential(googleCredential);
};

/**
 * Signs the current user out of the application.
 */
export const handleSignOut = async (): Promise<void> => {
  try {
    await auth().signOut();
    // It's also good practice to sign out of Google Signin
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

/**
 * A listener that fires when the user's authentication state changes.
 * @param callback The function to call with the user object or null.
 * @returns An unsubscribe function.
 */
export const onAuthStateChanged = (
  callback: (user: FirebaseAuthTypes.User | null) => void,
) => {
  return auth().onAuthStateChanged(callback);
};