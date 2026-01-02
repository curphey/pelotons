// Supabase Edge Function for Admin API operations
// Uses service role key for bypassing RLS when needed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Verify user is admin and return their user ID
async function verifyAdmin(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  return roles ? user.id : null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminId = await verifyAdmin(authHeader);
    if (!adminId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      // ============================================
      // LIST USERS
      // ============================================
      case 'list-users': {
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('page_size') || '50');
        const search = url.searchParams.get('search');

        // Get users from auth.users via admin API
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
          page,
          perPage: pageSize,
        });

        if (authError) {
          throw new Error(`Failed to list users: ${authError.message}`);
        }

        // Get all profiles and roles
        const userIds = authUsers.users.map(u => u.id);

        const [profilesResult, rolesResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .in('user_id', userIds),
          supabase
            .from('user_roles')
            .select('*')
            .in('user_id', userIds),
        ]);

        // Build response with profiles and roles
        const users = authUsers.users
          .filter(u => !search ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            profilesResult.data?.find(p => p.user_id === u.id)?.display_name?.toLowerCase().includes(search.toLowerCase())
          )
          .map(u => {
            const profile = profilesResult.data?.find(p => p.user_id === u.id);
            const userRoles = rolesResult.data?.filter(r => r.user_id === u.id).map(r => r.role) || [];

            return {
              id: u.id,
              email: u.email,
              createdAt: u.created_at,
              lastSignInAt: u.last_sign_in_at,
              profile: profile ? {
                id: profile.id,
                userId: profile.user_id,
                username: profile.username,
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                bio: profile.bio,
                location: profile.location,
                activityVisibility: profile.activity_visibility,
                showStats: profile.show_stats,
                followersCount: profile.followers_count,
                followingCount: profile.following_count,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at,
              } : null,
              roles: userRoles,
            };
          });

        return new Response(
          JSON.stringify({ users, total: authUsers.users.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // CREATE INVITE
      // ============================================
      case 'create-invite': {
        const body = await req.json();
        const { email, personalMessage } = body;

        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers?.users.some(u => u.email?.toLowerCase() === email.toLowerCase());

        if (userExists) {
          return new Response(
            JSON.stringify({ error: 'A user with this email already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing pending invite
        const { data: existingInvite } = await supabase
          .from('invites')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          return new Response(
            JSON.stringify({ error: 'A pending invite already exists for this email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create invite
        const { data, error } = await supabase
          .from('invites')
          .insert({
            email: email.toLowerCase(),
            created_by: adminId,
            personal_message: personalMessage || null,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create invite: ${error.message}`);
        }

        return new Response(
          JSON.stringify({
            invite: {
              id: data.id,
              email: data.email,
              inviteCode: data.invite_code,
              createdBy: data.created_by,
              status: data.status,
              expiresAt: data.expires_at,
              personalMessage: data.personal_message,
              createdAt: data.created_at,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // LIST INVITES
      // ============================================
      case 'list-invites': {
        const status = url.searchParams.get('status');

        let query = supabase
          .from('invites')
          .select('*')
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(`Failed to list invites: ${error.message}`);
        }

        // Get creator info
        const creatorIds = [...new Set(data.map(i => i.created_by))];
        const { data: creators } = await supabase.auth.admin.listUsers();

        const invites = data.map(i => {
          const creator = creators?.users.find(u => u.id === i.created_by);
          return {
            id: i.id,
            email: i.email,
            inviteCode: i.invite_code,
            createdBy: i.created_by,
            status: i.status,
            usedBy: i.used_by,
            usedAt: i.used_at,
            expiresAt: i.expires_at,
            personalMessage: i.personal_message,
            createdAt: i.created_at,
            creatorEmail: creator?.email,
          };
        });

        return new Response(
          JSON.stringify({ invites }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // REVOKE INVITE
      // ============================================
      case 'revoke-invite': {
        const inviteId = url.searchParams.get('invite_id');

        if (!inviteId) {
          return new Response(
            JSON.stringify({ error: 'invite_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('invites')
          .update({ status: 'revoked' })
          .eq('id', inviteId)
          .eq('status', 'pending');

        if (error) {
          throw new Error(`Failed to revoke invite: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // SET USER ROLE
      // ============================================
      case 'set-user-role': {
        const body = await req.json();
        const { userId, role, action: roleAction } = body;

        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: 'userId and role are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent removing own admin role
        if (userId === adminId && role === 'admin' && roleAction === 'remove') {
          return new Response(
            JSON.stringify({ error: 'Cannot remove your own admin role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (roleAction === 'add') {
          const { error } = await supabase
            .from('user_roles')
            .upsert({
              user_id: userId,
              role,
              granted_by: adminId,
            }, {
              onConflict: 'user_id,role',
            });

          if (error) {
            throw new Error(`Failed to add role: ${error.message}`);
          }
        } else {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', role);

          if (error) {
            throw new Error(`Failed to remove role: ${error.message}`);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // DELETE USER
      // ============================================
      case 'delete-user': {
        const userId = url.searchParams.get('user_id');

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'user_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent deleting self
        if (userId === adminId) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user (cascades to all user data via ON DELETE CASCADE)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
          throw new Error(`Failed to delete user: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // GET STATS
      // ============================================
      case 'get-stats': {
        const [usersResult, invitesResult, activitiesResult] = await Promise.all([
          supabase.auth.admin.listUsers(),
          supabase.from('invites').select('status'),
          supabase.from('activities').select('id', { count: 'exact', head: true }),
        ]);

        const pendingInvites = invitesResult.data?.filter(i => i.status === 'pending').length || 0;
        const acceptedInvites = invitesResult.data?.filter(i => i.status === 'accepted').length || 0;

        return new Response(
          JSON.stringify({
            stats: {
              totalUsers: usersResult.data?.users.length || 0,
              pendingInvites,
              acceptedInvites,
              totalActivities: activitiesResult.count || 0,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
