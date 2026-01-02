import { useState } from 'react';
import { useAdminInvites } from '@/hooks/useAdmin';
import { InviteWithCreator } from '@peloton/shared';

export function InvitesPage() {
  const { invites, loading, error, createInvite, revokeInvite, fetchInvites } = useAdminInvites();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    const invite = await createInvite(email, message || undefined);

    if (invite) {
      setEmail('');
      setMessage('');
    } else {
      setCreateError('Failed to create invite');
    }

    setCreating(false);
  };

  const handleCopyLink = async (invite: InviteWithCreator) => {
    const link = `${window.location.origin}/auth?invite=${invite.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (confirm('Are you sure you want to revoke this invite?')) {
      await revokeInvite(inviteId);
    }
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    fetchInvites(status || undefined);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-600' },
      revoked: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading && invites.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invite Management</h1>
        <p className="text-gray-600 mt-1">Invite new users to the platform</p>
      </div>

      {/* Create Invite Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Invite</h2>
        <form onSubmit={handleCreateInvite} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (optional)
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Welcome to Pelotons! We're excited to have you..."
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Invite'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Invites</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Invites Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invites.map((invite) => (
              <tr key={invite.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invite.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invite.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invite.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invite.creatorEmail || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {invite.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleCopyLink(invite)}
                          className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          {copiedId === invite.id ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                    {invite.status === 'accepted' && invite.usedAt && (
                      <span className="text-xs text-gray-500">
                        Used {new Date(invite.usedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {invites.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">No invites found</div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How invites work</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Create an invite by entering the user's email address</li>
          <li>2. Copy the invite link and send it to the user manually</li>
          <li>3. The user clicks the link and creates their account using the same email</li>
          <li>4. Invites expire after 7 days if not used</li>
        </ul>
      </div>
    </div>
  );
}
