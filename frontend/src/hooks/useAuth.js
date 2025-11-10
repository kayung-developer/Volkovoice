// frontend/src/hooks/useAuth.js
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * -----------------------------------------------------------------------------
 * Custom Hook: useAuth
 * -----------------------------------------------------------------------------
 * This hook provides a streamlined and safe way for components to access the
 * authentication context.
 *
 * Benefits:
 * 1. Abstraction: Components don't need to know about `useContext` or the
 *    `AuthContext` object itself. They just need `useAuth`.
 * 2. Simplicity: Reduces boilerplate code in every component that needs auth data.
 * 3. Safety: Includes a runtime check to ensure it's used within an `AuthProvider`,
 *    providing clear error messages to developers during development.
 */
const useAuth = () => {
  // 1. Get the context value.
  const context = useContext(AuthContext);

  // 2. Perform a critical check. If the hook is used outside of the provider,
  //    the context will be undefined. We throw an error to immediately alert
  //    the developer to this misconfiguration.
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Make sure your component is wrapped in the AuthProvider.');
  }

  // 3. Return the context, which contains { user, isLoading, apiClient }.
  return context;
};

export default useAuth;