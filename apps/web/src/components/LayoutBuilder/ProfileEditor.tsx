import { useState } from 'react';
import {
  DataProfileWithScreens,
  ProfileScreen,
  DEVICE_PRESETS,
  DEVICE_PRESET_LIST,
  type ScreenTemplate,
} from '@peloton/shared';
import { PhoneSimulator } from './PhoneSimulator';
import { TemplateGallery } from './TemplateGallery';

interface ProfileEditorProps {
  profile: DataProfileWithScreens;
  onUpdateProfile: (profileId: string, updates: { name?: string; deviceType?: string }) => void;
  onSelectScreen: (screen: ProfileScreen) => void;
  onAddScreen: (screenType: 'data' | 'map') => void;
  onAddScreenFromTemplate: (template: ScreenTemplate) => void;
  onDeleteScreen: (screenId: string) => void;
  onReorderScreens: (screenIds: string[]) => void;
}

export function ProfileEditor({
  profile,
  onUpdateProfile,
  onSelectScreen,
  onAddScreen,
  onAddScreenFromTemplate,
  onDeleteScreen,
}: ProfileEditorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const devicePreset = DEVICE_PRESETS[profile.deviceType];
  const targetGrid = devicePreset?.suggestedGrid || { columns: 3, rows: 4 };

  const handleSaveName = () => {
    if (editName.trim() && editName !== profile.name) {
      onUpdateProfile(profile.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleDeviceChange = (deviceType: string) => {
    onUpdateProfile(profile.id, { deviceType });
  };

  return (
    <div className="h-full flex">
      {/* Left side - Settings & Screens */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Profile Settings
        </h2>

        <div className="grid gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setEditName(profile.name);
                      setIsEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditName(profile.name);
                    setIsEditingName(false);
                  }}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => setIsEditingName(true)}
              >
                <span>{profile.name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
          </div>

          {/* Device */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
            <select
              value={profile.deviceType}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEVICE_PRESET_LIST.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.suggestedGrid.columns}×{device.suggestedGrid.rows} grid)
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Screen size: {DEVICE_PRESETS[profile.deviceType]?.screenWidth}×
              {DEVICE_PRESETS[profile.deviceType]?.screenHeight} points
            </p>
          </div>
        </div>
      </div>

      {/* Screens List */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Screens ({profile.screens.length})
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Screen
            </button>
            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => {
                      onAddScreen('data');
                      setShowAddMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                    </svg>
                    Blank Data Screen
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowTemplateGallery(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span>
                      From Template...
                      <span className="text-xs text-gray-400 ml-1">NEW</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onAddScreen('map');
                      setShowAddMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg flex items-center gap-2 border-t border-gray-100"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Map Screen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {profile.screens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No screens yet. Add a data or map screen to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.screens.map((screen, index) => (
              <div
                key={screen.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer group"
                onClick={() => onSelectScreen(screen)}
              >
                {/* Position indicator */}
                <div className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-sm font-medium">
                  {index + 1}
                </div>

                {/* Screen info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {screen.screenType === 'map' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                    )}
                    <span className="font-medium text-gray-900">{screen.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {screen.screenType === 'map' ? (
                      'Full-screen map view'
                    ) : (
                      `${screen.gridColumns}×${screen.gridRows} grid • ${screen.widgets.length} widgets`
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectScreen(screen);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit screen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScreen(screen.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete screen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Users will scroll through screens in this order while riding. Drag to reorder.
        </p>
      </div>
        </div>
      </div>

      {/* Right side - Phone Simulator */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Preview
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            See how your screens will look on your device
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <PhoneSimulator
            deviceType={profile.deviceType}
            screens={profile.screens}
            onScreenSelect={onSelectScreen}
            scale={3}
          />
        </div>
      </div>

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={onAddScreenFromTemplate}
        targetGrid={targetGrid}
      />
    </div>
  );
}
