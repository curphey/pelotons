import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useSearchParams } from 'react-router-dom';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signUpWithInvite, validateInvite } = useAuth();
  const [searchParams] = useSearchParams();

  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Check for invite code in URL
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) {
      setInviteCode(code);
    }
  }, [searchParams]);

  // Validate invite when both email and code are present
  useEffect(() => {
    const validateIfReady = async () => {
      if (email && inviteCode && inviteCode.length === 32) {
        setValidatingInvite(true);
        setInviteValid(null);
        setInviteMessage(null);

        const result = await validateInvite(email, inviteCode);

        setInviteValid(result.valid);
        if (!result.valid && result.error) {
          setInviteMessage(result.error);
        }
        setValidatingInvite(false);
      } else {
        setInviteValid(null);
        setInviteMessage(null);
      }
    };

    const debounce = setTimeout(validateIfReady, 500);
    return () => clearTimeout(debounce);
  }, [email, inviteCode, validateInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode) {
      setError('Invite code is required to create an account');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUpWithInvite(email, password, inviteCode);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-6 rounded mb-6">
          <h3 className="font-bold mb-2">Check your email</h3>
          <p>We've sent you a confirmation link to {email}</p>
        </div>
        <button
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
      <p className="text-center text-gray-600 mb-8">
        Pelotons is currently in private beta. You need an invite to sign up.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
            Invite Code
          </label>
          <div className="relative">
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.trim())}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                inviteValid === true
                  ? 'border-green-500 bg-green-50'
                  : inviteValid === false
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Enter your invite code"
            />
            {validatingInvite && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            )}
            {!validatingInvite && inviteValid === true && (
              <div className="absolute right-3 top-2.5 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {!validatingInvite && inviteValid === false && (
              <div className="absolute right-3 top-2.5 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          {inviteMessage && (
            <p className="mt-1 text-sm text-red-600">{inviteMessage}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must match the email address your invite was sent to
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || inviteValid === false || validatingInvite}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sign in
        </button>
      </p>

      <p className="mt-4 text-center text-xs text-gray-500">
        Don't have an invite? Contact an administrator to request access.
      </p>
    </div>
  );
}
