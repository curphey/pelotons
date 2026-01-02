import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { ActivityFeedItem, mapDbToActivityFeedItem } from '@peloton/shared';

interface UseActivityFeedOptions {
  pageSize?: number;
  userId?: string; // If provided, only show activities from this user
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { pageSize = 20, userId } = options;
  const { user } = useAuth();

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(
    async (beforeTimestamp?: string, append = false) => {
      if (!user) {
        setActivities([]);
        setLoading(false);
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        if (userId) {
          // Fetch activities for specific user
          let query = supabase
            .from('activities')
            .select(
              `
              *,
              user_profiles!activities_user_id_fkey (
                display_name,
                username,
                avatar_url
              )
            `
            )
            .eq('user_id', userId)
            .order('occurred_at', { ascending: false })
            .limit(pageSize);

          if (beforeTimestamp) {
            query = query.lt('occurred_at', beforeTimestamp);
          }

          const { data, error: fetchError } = await query;

          if (fetchError) throw fetchError;

          const mapped = (data || []).map((item) => ({
            ...mapDbToActivityFeedItem({
              ...item,
              display_name: item.user_profiles?.display_name || null,
              username: item.user_profiles?.username || null,
              avatar_url: item.user_profiles?.avatar_url || null,
            }),
          }));

          if (append) {
            setActivities((prev) => [...prev, ...mapped]);
          } else {
            setActivities(mapped);
          }

          setHasMore(mapped.length === pageSize);
        } else {
          // Use the get_activity_feed function for personalized feed
          const { data, error: fetchError } = await supabase.rpc('get_activity_feed', {
            feed_user_id: user.id,
            page_size: pageSize,
            before_timestamp: beforeTimestamp || null,
          });

          if (fetchError) throw fetchError;

          const mapped = (data || []).map((item: Record<string, unknown>) =>
            mapDbToActivityFeedItem({
              id: item.id as string,
              user_id: item.user_id as string,
              activity_type: item.activity_type as string,
              ride_id: item.ride_id as string | null,
              route_id: item.route_id as string | null,
              summary: item.summary as Record<string, unknown>,
              visibility: item.visibility as string,
              occurred_at: item.occurred_at as string,
              created_at: item.occurred_at as string, // Use occurred_at as fallback
              display_name: item.display_name as string | null,
              username: item.username as string | null,
              avatar_url: item.avatar_url as string | null,
            })
          );

          if (append) {
            setActivities((prev) => [...prev, ...mapped]);
          } else {
            setActivities(mapped);
          }

          setHasMore(mapped.length === pageSize);
        }
      } catch (err) {
        console.error('Failed to fetch activity feed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, userId, pageSize]
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMore = () => {
    if (activities.length > 0 && hasMore && !loadingMore) {
      const lastActivity = activities[activities.length - 1];
      fetchFeed(lastActivity.occurredAt, true);
    }
  };

  const refetch = () => {
    fetchFeed();
  };

  return {
    activities,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
