import { useState, useCallback } from 'react';

// Temporarily disabled Supabase auth to allow app to load
// TODO: Re-enable once URL polyfill issue is resolved

type User = any;
type Session = any;
type AuthError = any;

export function useAuth() {
  // Mock user for testing - skip login screen
  const [user] = useState<User | null>({ id: 'mock-user', email: 'test@example.com' });
  const [session] = useState<Session | null>({ user });
  const [loading] = useState(false);

  const signUp = useCallback(
    async (_email: string, _password: string): Promise<{ error: AuthError | null }> => {
      return { error: null };
    },
    []
  );

  const signIn = useCallback(
    async (_email: string, _password: string): Promise<{ error: AuthError | null }> => {
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    console.log('Sign out (mocked)');
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
