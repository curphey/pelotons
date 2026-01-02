import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import {
  UserProfile,
  UserProfileUpdate,
  DbUserProfile,
  mapDbToUserProfile,
} from '@peloton/shared';

export function useUserProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Profile not found
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(mapDbToUserProfile(data as DbUserProfile));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: UserProfileUpdate): Promise<boolean> => {
    if (!user || targetUserId !== user.id) {
      setError('Cannot update profile for another user');
      return false;
    }

    try {
      setError(null);

      const dbUpdates: Partial<DbUserProfile> = {};
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.activityVisibility !== undefined) dbUpdates.activity_visibility = updates.activityVisibility;
      if (updates.showStats !== undefined) dbUpdates.show_stats = updates.showStats;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();
      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    }
  };

  const isOwnProfile = user?.id === targetUserId;

  return {
    profile,
    loading,
    error,
    isOwnProfile,
    updateProfile,
    refetch: fetchProfile,
  };
}

// Hook to get profile by username
export function useUserProfileByUsername(username: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(mapDbToUserProfile(data as DbUserProfile));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
