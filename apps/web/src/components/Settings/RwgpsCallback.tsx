import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRwgps } from '@/hooks/useRwgps';

export function RwgpsCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useRwgps();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  // Suppress unused variable warning - processing is used for UI state
  void processing;

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setProcessing(false);
        return;
      }

      if (!code || !state) {
        setError('Missing OAuth parameters');
        setProcessing(false);
        return;
      }

      try {
        await handleOAuthCallback(code, state);
        // Redirect to settings page on success
        navigate('/settings', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete OAuth');
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Failed
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/settings', { replace: true })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connecting to RideWithGPS
        </h2>
        <p className="text-gray-600">
          Please wait while we complete the connection...
        </p>
      </div>
    </div>
  );
}
