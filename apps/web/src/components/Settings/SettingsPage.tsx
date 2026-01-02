import { RwgpsConnection } from './RwgpsConnection';

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and integrations
        </p>
      </div>

      {/* Integrations Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Integrations</h2>
        <div className="space-y-4">
          <RwgpsConnection />
        </div>
      </div>

      {/* Future sections can go here */}
      {/* <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Preferences</h2>
        ...
      </div> */}
    </div>
  );
}
