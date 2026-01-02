// Supabase Edge Function for validating invite codes during signup
// This function is public (no auth required) as it's called before signup

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inviteCode, email } = await req.json();

    if (!inviteCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the invite by code
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !invite) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid invite code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is pending
    if (invite.status !== 'pending') {
      const statusMessages: Record<string, string> = {
        accepted: 'This invite has already been used',
        expired: 'This invite has expired',
        revoked: 'This invite has been revoked',
      };
      return new Response(
        JSON.stringify({ valid: false, error: statusMessages[invite.status] || 'Invalid invite' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return new Response(
        JSON.stringify({ valid: false, error: 'This invite has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email matches
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This invite was sent to a different email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invite is valid
    return new Response(
      JSON.stringify({
        valid: true,
        invite: {
          id: invite.id,
          email: invite.email,
          personalMessage: invite.personal_message,
          expiresAt: invite.expires_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validate invite error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Failed to validate invite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
