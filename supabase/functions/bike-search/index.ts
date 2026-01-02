// Supabase Edge Function for searching bikes from GeometryGeeks
// This function acts as a proxy to avoid CORS issues and parse the HTML results

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BikeSearchResult {
  name: string;
  brand: string;
  model: string;
  year: number | null;
  url: string;
  bikeType: string | null;
}

interface BikeGeometry {
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

interface BikeDetails {
  name: string;
  brand: string;
  model: string;
  year: number | null;
  bikeType: string | null;
  sizes: string[];
  geometries: BikeGeometry[];
}

// Common bike brands for prefix matching
const BIKE_BRANDS = [
  'pinarello', 'specialized', 'trek', 'cannondale', 'giant', 'cervelo', 'bianchi',
  'colnago', 'scott', 'canyon', 'merida', 'orbea', 'factor', 'wilier', 'look',
  'felt', 'bmc', 'fuji', 'kona', 'santa cruz', 'yeti', 'pivot', 'ibis', 'niner',
  'salsa', 'surly', 'all city', 'ritchey', 'cinelli', 'de rosa', 'ridley',
  'lapierre', 'cube', 'focus', 'rose', 'argon', 'chapter2', 'parlee', 'mosaic',
  'moots', 'allied', 'open', 'lauf', '3t', 'titici', 'dogma', 'tarmac', 'madone',
  'emonda', 'domane', 'roubaix', 'diverge', 'crux', 'aethos', 'venge', 'allez',
  'supersix', 'synapse', 'topstone', 'slate', 'systemsix', 'caad', 'propel',
  'defy', 'tcr', 'revolt', 'aeroad', 'ultimate', 'endurace', 'grail', 'grizl',
  'speedmax', 'inflite', 'exceed', 'lux', 'spectral', 'neuron', 'strive',
];

// Find brands that match the query prefix
function expandBrandQuery(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.length < 2) return [query];

  const matchingBrands = BIKE_BRANDS.filter(brand =>
    brand.startsWith(queryLower) && brand !== queryLower
  );

  // Return original query plus any matching brand expansions
  return [query, ...matchingBrands.slice(0, 3)]; // Limit to 3 expansions
}

// Infer bike type from model name or category
function inferBikeType(name: string, category?: string): string | null {
  const lowerName = (name + ' ' + (category || '')).toLowerCase();

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
  if (lowerName.includes('cyclocross') || lowerName.includes('cx') || lowerName.includes('cross')) {
    return 'cyclocross';
  }
  if (lowerName.includes('mtb') || lowerName.includes('mountain') || lowerName.includes('enduro') ||
      lowerName.includes('trail') || lowerName.includes('downhill') || lowerName.includes('xc')) {
    return 'mountain';
  }
  if (lowerName.includes('e-bike') || lowerName.includes('ebike') || lowerName.includes('electric')) {
    return 'ebike';
  }
  if (lowerName.includes('hybrid') || lowerName.includes('fitness') || lowerName.includes('commuter')) {
    return 'hybrid';
  }
  // Default to road for aero/endurance/race bikes
  if (lowerName.includes('aero') || lowerName.includes('race') || lowerName.includes('endurance') ||
      lowerName.includes('road') || lowerName.includes('slr') || lowerName.includes('tarmac') ||
      lowerName.includes('madone') || lowerName.includes('emonda') || lowerName.includes('dogma') ||
      lowerName.includes('ultimate') || lowerName.includes('aeroad') || lowerName.includes('tcr') ||
      lowerName.includes('propel') || lowerName.includes('supersix') || lowerName.includes('roubaix') ||
      lowerName.includes('domane') || lowerName.includes('defy') || lowerName.includes('synapse')) {
    return 'road';
  }

  return null;
}

// Parse search results from GeometryGeeks HTML
function parseSearchResults(html: string, searchQuery: string): BikeSearchResult[] {
  const results: BikeSearchResult[] = [];
  const queryLower = searchQuery.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

  // Match bike entries - GeometryGeeks uses a table or list structure
  // Pattern: <a href="/bike/brand-model-year/">Brand Model Year</a>
  const linkPattern = /<a[^>]+href="(\/bike\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const fullName = match[2].trim();

    // Skip non-bike links
    if (!url.startsWith('/bike/') || url === '/bike/' || fullName.length < 3) continue;

    // Parse the URL slug: brand-model-year
    const slug = url.replace('/bike/', '').replace(/\/$/, '');
    const parts = slug.split('-');

    // Skip if slug is too short (likely not a real bike)
    if (parts.length < 2) continue;

    // Try to extract year (last part if it's a 4-digit number)
    let year: number | null = null;
    const lastPart = parts[parts.length - 1];
    if (/^\d{4}$/.test(lastPart)) {
      year = parseInt(lastPart, 10);
    }

    // First part is typically the brand
    const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';

    // Everything in between is the model
    const modelParts = year ? parts.slice(1, -1) : parts.slice(1);
    const model = modelParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    // Skip results that don't look like real bikes (too short name, no real model)
    if (fullName.length < 5 || (!model && !year)) continue;

    // Skip if no part of the search query matches the result
    const nameLower = fullName.toLowerCase();
    const slugLower = slug.toLowerCase();
    const hasMatch = queryWords.some(word =>
      nameLower.includes(word) || slugLower.includes(word)
    );
    if (!hasMatch) continue;

    const bikeType = inferBikeType(fullName);

    results.push({
      name: fullName,
      brand,
      model,
      year,
      url: `https://geometrygeeks.bike${url}`,
      bikeType,
    });
  }

  // Remove duplicates based on URL
  const seen = new Set<string>();
  const uniqueResults = results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort results by relevance:
  // 1. Brand starts with query (e.g., "pin" matches "Pinarello" first)
  // 2. Name contains query words
  // 3. Newer bikes first
  return uniqueResults.sort((a, b) => {
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();
    const aBrandLower = a.brand.toLowerCase();
    const bBrandLower = b.brand.toLowerCase();

    // Prioritize if brand starts with query
    const aStartsWithQuery = queryWords.some(w => aBrandLower.startsWith(w));
    const bStartsWithQuery = queryWords.some(w => bBrandLower.startsWith(w));
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;

    // Then sort by year (newer first)
    if (a.year && b.year && a.year !== b.year) {
      return b.year - a.year;
    }

    // Then alphabetically
    return aNameLower.localeCompare(bNameLower);
  });
}

// Parse geometry table from a bike page
function parseGeometryTable(html: string): { sizes: string[]; geometries: BikeGeometry[] } {
  const geometries: BikeGeometry[] = [];
  const sizes: string[] = [];

  // Extract sizes from table headers - format: <th><strong>XS</strong></th>
  const headerPattern = /<th[^>]*>\s*<strong>\s*([^<]+)\s*<\/strong>\s*<\/th>/gi;
  let headerMatch;
  while ((headerMatch = headerPattern.exec(html)) !== null) {
    const size = headerMatch[1].trim();
    if (size && size !== '&nbsp;' && !sizes.includes(size)) {
      sizes.push(size);
    }
  }

  // If no sizes found with <strong>, try plain <th> with size patterns
  if (sizes.length === 0) {
    const simpleSizePattern = /<th[^>]*>\s*(XXS|XS|S|M|L|XL|XXL|\d{2}(?:cm)?)\s*<\/th>/gi;
    while ((headerMatch = simpleSizePattern.exec(html)) !== null) {
      const size = headerMatch[1].trim();
      if (size && !sizes.includes(size)) {
        sizes.push(size);
      }
    }
  }

  // Map data-parameter values to our geometry fields
  const parameterMap: Record<string, keyof BikeGeometry> = {
    'reach': 'reachMm',
    'stack': 'stackMm',
    'seat_tube_length': 'seatTubeLengthMm',
    'seat_tube_length_cc': 'seatTubeLengthMm',
    'seat_angle': 'seatTubeAngle',
    'top_tube': 'effectiveTopTubeMm',
    'head_tube': 'headTubeLengthMm',
    'head_angle': 'headTubeAngle',
    'chainstay': 'chainstayLengthMm',
    'wheelbase': 'wheelbaseMm',
    'bb_drop': 'bbDropMm',
    'bb_height': 'bbHeightMm',
    'fork_rake': 'forkRakeMm',
    'trail': 'trailMm',
    'standover': 'standoverHeightMm',
  };

  // Initialize geometry objects for each size
  for (const size of sizes) {
    geometries.push({
      size,
      stackMm: null,
      reachMm: null,
      seatTubeLengthMm: null,
      seatTubeAngle: null,
      effectiveTopTubeMm: null,
      headTubeLengthMm: null,
      headTubeAngle: null,
      chainstayLengthMm: null,
      wheelbaseMm: null,
      bbDropMm: null,
      bbHeightMm: null,
      forkRakeMm: null,
      trailMm: null,
      standoverHeightMm: null,
    });
  }

  // Extract data from <td> elements with data-parameter and data-slug attributes
  // Format: <td data-parameter="reach" data-slug="canyon-aeroad-2025-xs">333</td>
  const cellPattern = /<td[^>]*data-parameter="([^"]+)"[^>]*data-slug="([^"]+)"[^>]*>\s*([^<]+)\s*<\/td>/gi;
  let cellMatch;

  while ((cellMatch = cellPattern.exec(html)) !== null) {
    const parameter = cellMatch[1];
    const slug = cellMatch[2];
    const valueStr = cellMatch[3].trim().replace(',', '.'); // Handle European decimal format

    const field = parameterMap[parameter];
    if (!field) continue;

    // Extract size from slug (e.g., "canyon-aeroad-2025-xs" -> "xs")
    const slugParts = slug.split('-');
    const sizeFromSlug = slugParts[slugParts.length - 1].toUpperCase();

    // Find matching geometry by size
    const geoIndex = sizes.findIndex(s => s.toUpperCase() === sizeFromSlug);
    if (geoIndex === -1) continue;

    // Parse the value
    const value = parseFloat(valueStr);
    if (!isNaN(value)) {
      (geometries[geoIndex] as Record<string, unknown>)[field] = value;
    }
  }

  return { sizes, geometries };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    if (action === 'search') {
      // Search for bikes
      const query = url.searchParams.get('q');
      if (!query || query.length < 2) {
        return new Response(
          JSON.stringify({ error: 'Query must be at least 2 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Expand query to include matching brand names (e.g., "pin" -> ["pin", "pinarello", "pivot"])
      const queries = expandBrandQuery(query);
      const allResults: BikeSearchResult[] = [];
      const seenUrls = new Set<string>();

      // Fetch search results for each query
      for (const q of queries) {
        const searchUrl = `https://geometrygeeks.bike/bike-directory/search/?q=${encodeURIComponent(q)}`;
        try {
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BikeApp/1.0)',
            },
          });

          if (response.ok) {
            const html = await response.text();
            const results = parseSearchResults(html, q);

            // Add results, avoiding duplicates
            for (const result of results) {
              if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allResults.push(result);
              }
            }
          }
        } catch (e) {
          console.error(`Search failed for query "${q}":`, e);
        }
      }

      // Sort all results by relevance to original query
      const queryLower = query.toLowerCase();
      allResults.sort((a, b) => {
        const aBrandLower = a.brand.toLowerCase();
        const bBrandLower = b.brand.toLowerCase();

        // Prioritize exact brand prefix match with original query
        const aStartsWithQuery = aBrandLower.startsWith(queryLower);
        const bStartsWithQuery = bBrandLower.startsWith(queryLower);
        if (aStartsWithQuery && !bStartsWithQuery) return -1;
        if (!aStartsWithQuery && bStartsWithQuery) return 1;

        // Then sort by year (newer first)
        if (a.year && b.year && a.year !== b.year) {
          return b.year - a.year;
        }

        return 0;
      });

      // Limit results to prevent overwhelming the client
      const limitedResults = allResults.slice(0, 50);

      return new Response(
        JSON.stringify({ results: limitedResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'details') {
      // Get bike details including geometry
      const bikeUrl = url.searchParams.get('url');
      if (!bikeUrl) {
        return new Response(
          JSON.stringify({ error: 'Bike URL is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL is from GeometryGeeks
      if (!bikeUrl.includes('geometrygeeks.bike')) {
        return new Response(
          JSON.stringify({ error: 'Only GeometryGeeks URLs are supported' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(bikeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BikeApp/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`GeometryGeeks returned ${response.status}`);
      }

      const html = await response.text();

      // Parse bike name from title or heading
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const name = titleMatch ? titleMatch[1].replace(' - Geometry Geeks', '').trim() : '';

      // Parse the URL slug to extract details
      const urlPath = new URL(bikeUrl).pathname;
      const slug = urlPath.replace('/bike/', '').replace(/\/$/, '');
      const parts = slug.split('-');

      let year: number | null = null;
      const lastPart = parts[parts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        year = parseInt(lastPart, 10);
      }

      const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
      const modelParts = year ? parts.slice(1, -1) : parts.slice(1);
      const model = modelParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

      const { sizes, geometries } = parseGeometryTable(html);
      const bikeType = inferBikeType(name);

      const details: BikeDetails = {
        name,
        brand,
        model,
        year,
        bikeType,
        sizes,
        geometries,
      };

      return new Response(
        JSON.stringify({ details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
