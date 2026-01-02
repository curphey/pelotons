import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from root directory (for local development)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  // Use process.env for Vercel, fallback to loadEnv for local dev
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  const mapboxToken = process.env.MAPBOX_TOKEN || env.MAPBOX_TOKEN;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.MAPBOX_TOKEN': JSON.stringify(mapboxToken),
    },
    optimizeDeps: {
      include: ['@peloton/shared'],
    },
    build: {
      commonjsOptions: {
        include: [/shared/, /node_modules/],
      },
    },
  };
});
