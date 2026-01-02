import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { UserProfile, DbUserProfile, mapDbToUserProfile } from '@peloton/shared';

export function useFollow(targetUserId?: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkFollowStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setIsFollowing(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      setIsFollowing(!!data);
    } catch {
      setIsFollowing(false);
    }
  }, [user, targetUserId]);

  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  const follow = async (): Promise<boolean> => {
    if (!user || !targetUserId || loading) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (insertError) throw insertError;

      setIsFollowing(true);
      return true;
    } catch (err) {
      console.error('Failed to follow:', err);
      setError(err instanceof Error ? err.message : 'Failed to follow user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unfollow = async (): Promise<boolean> => {
    if (!user || !targetUserId || loading) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (deleteError) throw deleteError;

      setIsFollowing(false);
      return true;
    } catch (err) {
      console.error('Failed to unfollow:', err);
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (): Promise<boolean> => {
    if (isFollowing) {
      return unfollow();
    } else {
      return follow();
    }
  };

  return {
    isFollowing,
    loading,
    error,
    follow,
    unfollow,
    toggleFollow,
    checkFollowStatus,
  };
}

// Get followers list
export function useFollowers(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = useCallback(async () => {
    if (!targetUserId) {
      setFollowers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get follower IDs
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetUserId);

      if (followError) throw followError;

      if (!followData || followData.length === 0) {
        setFollowers([]);
        return;
      }

      // Get profiles for followers
      const followerIds = followData.map((f) => f.follower_id);
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', followerIds);

      if (profileError) throw profileError;

      setFollowers((profiles || []).map((p) => mapDbToUserProfile(p as DbUserProfile)));
    } catch (err) {
      console.error('Failed to fetch followers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  return { followers, loading, error, refetch: fetchFollowers };
}

// Get following list
export function useFollowing(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!targetUserId) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get following IDs
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', targetUserId);

      if (followError) throw followError;

      if (!followData || followData.length === 0) {
        setFollowing([]);
        return;
      }

      // Get profiles for following
      const followingIds = followData.map((f) => f.following_id);
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', followingIds);

      if (profileError) throw profileError;

      setFollowing((profiles || []).map((p) => mapDbToUserProfile(p as DbUserProfile)));
    } catch (err) {
      console.error('Failed to fetch following:', err);
      setError(err instanceof Error ? err.message : 'Failed to load following');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  return { following, loading, error, refetch: fetchFollowing };
}
