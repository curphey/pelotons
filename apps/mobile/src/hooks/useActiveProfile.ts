import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DataProfileWithScreens, ProfileScreen, Widget } from '@peloton/shared';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseActiveProfileResult {
  profile: DataProfileWithScreens | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook to fetch the user's active profile with all its screens.
 * Returns the profile data synced from the web layout builder.
 *
 * Uses Supabase Realtime to automatically update when:
 * - A different profile is made active
 * - The active profile's screens are modified
 * - Widgets are added, removed, or repositioned
 */
export function useActiveProfile(): UseActiveProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DataProfileWithScreens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profileIdRef = useRef<string | null>(null);

  const fetchActiveProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active profile with its screens in a single query
      const { data: profileData, error: profileError } = await supabase
        .from('data_profiles')
        .select(`
          *,
          profile_screens (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (profileError) {
        // No active profile found - this is okay for new users
        if (profileError.code === 'PGRST116') {
          setProfile(null);
          setLoading(false);
          return;
        }
        throw profileError;
      }

      if (profileData) {
        // Transform snake_case database response to camelCase TypeScript types
        const transformedProfile: DataProfileWithScreens = {
          id: profileData.id,
          userId: profileData.user_id,
          name: profileData.name,
          deviceType: profileData.device_type,
          isActive: profileData.is_active,
          createdAt: profileData.created_at,
          updatedAt: profileData.updated_at,
          screens: (profileData.profile_screens || [])
            .map((screen: any): ProfileScreen => ({
              id: screen.id,
              profileId: screen.profile_id,
              name: screen.name,
              screenType: screen.screen_type,
              position: screen.position,
              gridColumns: screen.grid_columns,
              gridRows: screen.grid_rows,
              widgets: (screen.widgets as Widget[]) || [],
              createdAt: screen.created_at,
              updatedAt: screen.updated_at,
            }))
            .sort((a: ProfileScreen, b: ProfileScreen) => a.position - b.position),
        };

        setProfile(transformedProfile);
        profileIdRef.current = transformedProfile.id;
      } else {
        setProfile(null);
        profileIdRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching active profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchActiveProfile();
  }, [fetchActiveProfile]);

  // Set up Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!user) {
      // Clean up any existing subscription when user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create a unique channel name for this user's profile sync
    const channelName = `profile-sync:${user.id}`;

    // Subscribe to changes on data_profiles and profile_screens tables
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'data_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Profile change detected:', payload.eventType);
          // Refetch when any profile changes (active status might have changed)
          fetchActiveProfile();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_screens',
        },
        (payload) => {
          // Only refetch if the screen belongs to our active profile
          const screenProfileId = (payload.new as any)?.profile_id || (payload.old as any)?.profile_id;
          if (profileIdRef.current && screenProfileId === profileIdRef.current) {
            console.log('[Realtime] Screen change detected:', payload.eventType);
            fetchActiveProfile();
          } else if (!profileIdRef.current) {
            // No profile loaded yet, might be relevant
            fetchActiveProfile();
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status, err?.message || '');
        setIsConnected(status === 'SUBSCRIBED');

        // If there's a channel error, the realtime publication might not be enabled
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Channel error - ensure realtime is enabled for data_profiles and profile_screens tables');
        }
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('[Realtime] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user, fetchActiveProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchActiveProfile,
    isConnected,
  };
}
