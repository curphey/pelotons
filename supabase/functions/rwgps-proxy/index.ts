// Supabase Edge Function for RideWithGPS API integration
// Handles OAuth flow and proxies API requests to avoid CORS issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RWGPS_API_BASE = 'https://ridewithgps.com/api/v1';
const RWGPS_OAUTH_BASE = 'https://ridewithgps.com/oauth';

// Get environment variables
const RWGPS_API_KEY = Deno.env.get('RWGPS_API_KEY') || '';
const RWGPS_CLIENT_SECRET = Deno.env.get('RWGPS_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface RwgpsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

interface RwgpsUserResponse {
  user: {
    id: number;
    name: string;
    email: string;
    account_level: number;
  };
}

// Helper to make authenticated RWGPS API requests
async function rwgpsRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${RWGPS_API_BASE}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}

// Get user's RWGPS connection from database
async function getRwgpsConnection(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('rwgps_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get RWGPS connection: ${error.message}`);
  }

  return data;
}

// Save/update RWGPS connection in database
async function saveRwgpsConnection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rwgpsUserId: number,
  rwgpsUsername: string | null,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null
) {
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('rwgps_connections')
    .upsert({
      user_id: userId,
      rwgps_user_id: rwgpsUserId,
      rwgps_username: rwgpsUsername,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    throw new Error(`Failed to save RWGPS connection: ${error.message}`);
  }
}

// Delete RWGPS connection from database
async function deleteRwgpsConnection(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { error } = await supabase
    .from('rwgps_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete RWGPS connection: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Validate API key is configured
    if (!RWGPS_API_KEY || !RWGPS_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'RWGPS API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header and create supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && action !== 'oauth-callback') {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT if provided
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authorization token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }

    // Handle different actions
    switch (action) {
      case 'get-auth-url': {
        // Generate OAuth authorization URL
        const redirectUri = url.searchParams.get('redirect_uri');
        const state = url.searchParams.get('state');

        if (!redirectUri) {
          return new Response(
            JSON.stringify({ error: 'redirect_uri is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const authUrl = `${RWGPS_OAUTH_BASE}/authorize?` +
          `client_id=${encodeURIComponent(RWGPS_API_KEY)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code` +
          (state ? `&state=${encodeURIComponent(state)}` : '');

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'oauth-callback': {
        // Exchange OAuth code for tokens
        const code = url.searchParams.get('code');
        const redirectUri = url.searchParams.get('redirect_uri');
        const userIdParam = url.searchParams.get('user_id');

        if (!code || !redirectUri || !userIdParam) {
          return new Response(
            JSON.stringify({ error: 'code, redirect_uri, and user_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Exchange code for token
        const tokenResponse = await fetch(`${RWGPS_OAUTH_BASE}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: RWGPS_API_KEY,
            client_secret: RWGPS_CLIENT_SECRET,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to exchange OAuth code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokenData: RwgpsTokenResponse = await tokenResponse.json();

        // Get RWGPS user info
        const userResponse = await rwgpsRequest('/users/current.json', tokenData.access_token);
        if (!userResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to get RWGPS user info' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const userData: RwgpsUserResponse = await userResponse.json();

        // Save connection to database
        await saveRwgpsConnection(
          supabase,
          userIdParam,
          userData.user.id,
          userData.user.name,
          tokenData.access_token,
          tokenData.refresh_token || null,
          tokenData.expires_in || null
        );

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: userData.user.id,
              name: userData.user.name,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-connection': {
        // Get user's RWGPS connection status
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);

        return new Response(
          JSON.stringify({
            connected: !!connection,
            username: connection?.rwgps_username || null,
            connectedAt: connection?.connected_at || null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        // Remove RWGPS connection
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await deleteRwgpsConnection(supabase, userId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-routes': {
        // List user's routes from RWGPS
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const page = url.searchParams.get('page') || '1';
        const pageSize = url.searchParams.get('page_size') || '50';

        const response = await rwgpsRequest(
          `/users/${connection.rwgps_user_id}/routes.json?page=${page}&page_size=${pageSize}`,
          connection.access_token
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to list routes:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch routes from RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-route': {
        // Get single route details
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const routeId = url.searchParams.get('route_id');
        if (!routeId) {
          return new Response(
            JSON.stringify({ error: 'route_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await rwgpsRequest(
          `/routes/${routeId}.json`,
          connection.access_token
        );

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch route from RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'export-gpx': {
        // Download route as GPX
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const routeId = url.searchParams.get('route_id');
        if (!routeId) {
          return new Response(
            JSON.stringify({ error: 'route_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // GPX export uses a different URL pattern
        const gpxUrl = `https://ridewithgps.com/routes/${routeId}.gpx?auth_token=${connection.access_token}`;
        const response = await fetch(gpxUrl);

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to export GPX from RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const gpxData = await response.text();
        return new Response(
          JSON.stringify({ gpx: gpxData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-route': {
        // Create a new route on RWGPS from GPX
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get request body with GPX data
        const body = await req.json();
        const { gpx, name, description, visibility } = body;

        if (!gpx) {
          return new Response(
            JSON.stringify({ error: 'gpx data is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create multipart form data
        const formData = new FormData();
        formData.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), 'route.gpx');
        if (name) formData.append('route[name]', name);
        if (description) formData.append('route[description]', description);
        if (visibility !== undefined) formData.append('route[visibility]', visibility.toString());

        const response = await fetch(`${RWGPS_API_BASE}/routes.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to create route:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to create route on RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-collections': {
        // List user's collections from RWGPS
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const page = url.searchParams.get('page') || '1';
        const pageSize = url.searchParams.get('page_size') || '50';

        const response = await rwgpsRequest(
          `/users/${connection.rwgps_user_id}/collections.json?page=${page}&page_size=${pageSize}`,
          connection.access_token
        );

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch collections from RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-collection': {
        // Get collection with its routes
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connection = await getRwgpsConnection(supabase, userId);
        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Not connected to RideWithGPS' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const collectionId = url.searchParams.get('collection_id');
        if (!collectionId) {
          return new Response(
            JSON.stringify({ error: 'collection_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await rwgpsRequest(
          `/collections/${collectionId}.json`,
          connection.access_token
        );

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch collection from RideWithGPS' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Valid actions: get-auth-url, oauth-callback, get-connection, disconnect, list-routes, get-route, export-gpx, create-route, list-collections, get-collection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
