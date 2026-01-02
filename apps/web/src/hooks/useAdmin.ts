import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import {
  UserWithProfile,
  InviteWithCreator,
  UserRole,
  AdminUserListResponse,
  AdminInviteListResponse,
} from '@peloton/shared';

const FUNCTIONS_URL = import.meta.env.SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co') || '';

export function useAdmin() {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user]);

  const adminApi = useCallback(
    async <T = unknown>(
      action: string,
      params: Record<string, string | number> = {},
      body?: Record<string, unknown>
    ): Promise<T> => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const url = new URL(`${FUNCTIONS_URL}/admin-api`);
      url.searchParams.set('action', action);

      // Add query params
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });

      const response = await fetch(url.toString(), {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Admin API error');
      }

      return data as T;
    },
    [session]
  );

  return { isAdmin, loading, adminApi };
}

// Hook for managing users
export function useAdminUsers() {
  const { adminApi, isAdmin } = useAdmin();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (page = 1, pageSize = 50, search?: string) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string | number> = { page, page_size: pageSize };
        if (search) params.search = search;

        const data = await adminApi<AdminUserListResponse>('list-users', params);

        setUsers(data.users);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [adminApi, isAdmin]
  );

  const setUserRole = async (userId: string, role: UserRole, action: 'add' | 'remove') => {
    try {
      await adminApi('set-user-role', {}, { userId, role, action });
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Failed to set user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await adminApi('delete-user', { user_id: userId });
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      return false;
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  return {
    users,
    total,
    loading,
    error,
    fetchUsers,
    setUserRole,
    deleteUser,
  };
}

// Hook for managing invites
export function useAdminInvites() {
  const { adminApi, isAdmin } = useAdmin();
  const [invites, setInvites] = useState<InviteWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(
    async (status?: string) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {};
        if (status) params.status = status;

        const data = await adminApi<AdminInviteListResponse>('list-invites', params);

        setInvites(data.invites);
      } catch (err) {
        console.error('Failed to fetch invites:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invites');
      } finally {
        setLoading(false);
      }
    },
    [adminApi, isAdmin]
  );

  const createInvite = async (email: string, personalMessage?: string) => {
    try {
      setError(null);
      const data = await adminApi<{ invite: InviteWithCreator }>('create-invite', {}, { email, personalMessage });
      await fetchInvites();
      return data.invite;
    } catch (err) {
      console.error('Failed to create invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invite');
      return null;
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      await adminApi('revoke-invite', { invite_id: inviteId });
      await fetchInvites();
      return true;
    } catch (err) {
      console.error('Failed to revoke invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
      return false;
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchInvites();
    }
  }, [isAdmin, fetchInvites]);

  return {
    invites,
    loading,
    error,
    fetchInvites,
    createInvite,
    revokeInvite,
  };
}

// Hook for admin stats
export function useAdminStats() {
  const { adminApi, isAdmin } = useAdmin();
  const [stats, setStats] = useState<{
    totalUsers: number;
    pendingInvites: number;
    acceptedInvites: number;
    totalActivities: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await adminApi<{ stats: typeof stats }>('get-stats');
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, [adminApi, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
