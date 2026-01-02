import { useState, useCallback } from 'react';

export interface BikeSearchResult {
  name: string;
  brand: string;
  model: string;
  year: number | null;
  url: string;
  bikeType: string | null;
}

export interface BikeGeometry {
  size: string;
  stackMm: number | null;
  reachMm: number | null;
  seatTubeLengthMm: number | null;
  seatTubeAngle: number | null;
  effectiveTopTubeMm: number | null;
  headTubeLengthMm: number | null;
  headTubeAngle: number | null;
  chainstayLengthMm: number | null;
  wheelbaseMm: number | null;
  bbDropMm: number | null;
  bbHeightMm: number | null;
  forkRakeMm: number | null;
  trailMm: number | null;
  standoverHeightMm: number | null;
}

export interface BikeDetails {
  name: string;
  brand: string;
  model: string;
  year: number | null;
  bikeType: string | null;
  sizes: string[];
  geometries: BikeGeometry[];
}

// Get the edge function URL
function getEdgeFunctionUrl(): string {
  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  // Replace the regular supabase URL with the functions URL
  return supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');
}

export function useBikeSearch() {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BikeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const baseUrl = getEdgeFunctionUrl();
      const url = `${baseUrl}/bike-search?action=search&q=${encodeURIComponent(query)}`;

      // Use anon key for public bike search (doesn't require user auth)
      const anonKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search bikes');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    searching,
    results,
    error,
    clearResults,
  };
}

export function useBikeDetails() {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<BikeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (bikeUrl: string) => {
    if (!bikeUrl) {
      setDetails(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = getEdgeFunctionUrl();
      const url = `${baseUrl}/bike-search?action=details&url=${encodeURIComponent(bikeUrl)}`;

      // Use anon key for public bike details (doesn't require user auth)
      const anonKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bike details');
      }

      const data = await response.json();
      setDetails(data.details || null);
      return data.details || null;
    } catch (err) {
      console.error('Fetch details error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bike details');
      setDetails(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetails = useCallback(() => {
    setDetails(null);
    setError(null);
  }, []);

  return {
    fetchDetails,
    loading,
    details,
    error,
    clearDetails,
  };
}

// Utility function to infer bike type locally (fallback)
export function inferBikeType(name: string): string | null {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('gravel') || lowerName.includes('grizl') || lowerName.includes('topstone') ||
      lowerName.includes('diverge') || lowerName.includes('checkpoint') || lowerName.includes('aspero') ||
      lowerName.includes('crux') || lowerName.includes('exploro') || lowerName.includes('revolt')) {
    return 'gravel';
  }
  if (lowerName.includes('time trial') || lowerName.includes('tt') || lowerName.includes('triathlon') ||
      lowerName.includes('speedmax') || lowerName.includes('p-series') || lowerName.includes('plasma') ||
      lowerName.includes('shiv') || lowerName.includes('speed concept') || lowerName.includes('trinity')) {
    return 'time_trial';
  }
  if (lowerName.includes('track') || lowerName.includes('velodrome') || lowerName.includes('fixed')) {
    return 'track';
  }
  if (lowerName.includes('cyclocross') || lowerName.includes('cx')) {
    return 'cyclocross';
  }
  if (lowerName.includes('mtb') || lowerName.includes('mountain') || lowerName.includes('enduro') ||
      lowerName.includes('downhill') || lowerName.includes('xc')) {
    return 'mountain';
  }
  if (lowerName.includes('e-bike') || lowerName.includes('ebike') || lowerName.includes('electric')) {
    return 'ebike';
  }
  if (lowerName.includes('hybrid') || lowerName.includes('fitness') || lowerName.includes('commuter')) {
    return 'hybrid';
  }
  // Default assumptions based on common model names
  if (lowerName.includes('aero') || lowerName.includes('race') || lowerName.includes('endurance') ||
      lowerName.includes('road') || lowerName.includes('slr') || lowerName.includes('tarmac') ||
      lowerName.includes('madone') || lowerName.includes('emonda') || lowerName.includes('dogma') ||
      lowerName.includes('ultimate') || lowerName.includes('aeroad') || lowerName.includes('tcr') ||
      lowerName.includes('propel') || lowerName.includes('supersix') || lowerName.includes('roubaix') ||
      lowerName.includes('domane') || lowerName.includes('defy') || lowerName.includes('synapse')) {
    return 'road';
  }

  return 'road'; // Default to road
}

// Utility to infer frame material from model name (fallback)
export function inferFrameMaterial(name: string): string | null {
  const lowerName = name.toLowerCase();

  if (lowerName.includes(' cf ') || lowerName.includes(' sl ') || lowerName.includes(' slr ') ||
      lowerName.includes('carbon') || lowerName.includes(' c ') || lowerName.includes(' pro ')) {
    return 'carbon';
  }
  if (lowerName.includes('aluminum') || lowerName.includes('aluminium') || lowerName.includes(' al ') ||
      lowerName.includes('caad') || lowerName.includes('allez')) {
    return 'aluminum';
  }
  if (lowerName.includes('steel') || lowerName.includes('chromoly') || lowerName.includes('reynolds')) {
    return 'steel';
  }
  if (lowerName.includes('titanium') || lowerName.includes(' ti ')) {
    return 'titanium';
  }

  return 'carbon'; // Default assumption for modern bikes
}
