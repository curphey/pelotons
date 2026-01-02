import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithInvite: (email: string, password: string, inviteCode: string) => Promise<{ error: AuthError | null }>;
  validateInvite: (email: string, inviteCode: string) => Promise<{ valid: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const FUNCTIONS_URL = import.meta.env.SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co') || '';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const validateInvite = async (email: string, inviteCode: string) => {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode }),
      });

      const data = await response.json();
      return { valid: data.valid, error: data.error };
    } catch {
      return { valid: false, error: 'Failed to validate invite' };
    }
  };

  const signUpWithInvite = async (email: string, password: string, inviteCode: string) => {
    // First validate the invite
    const { valid, error: inviteError } = await validateInvite(email, inviteCode);
    if (!valid) {
      return { error: { message: inviteError || 'Invalid invite' } as AuthError };
    }

    // Proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { invite_code: inviteCode },
      },
    });

    if (!error && data.user) {
      // Mark invite as used
      try {
        await supabase
          .from('invites')
          .update({
            status: 'accepted',
            used_by: data.user.id,
            used_at: new Date().toISOString(),
          })
          .eq('invite_code', inviteCode);
      } catch (e) {
        console.error('Failed to mark invite as used:', e);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signUpWithInvite,
    validateInvite,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
