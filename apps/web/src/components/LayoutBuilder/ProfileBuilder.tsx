import { useState, Component, ReactNode } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import {
  DataProfile,
  DataProfileWithScreens,
  ProfileScreen,
  Widget,
  DEVICE_PRESETS,
  DEFAULT_DEVICE,
  type ScreenTemplate,
  adaptTemplateToGrid,
} from '@peloton/shared';
import { ProfileList } from './ProfileList';
import { ProfileEditor } from './ProfileEditor';
import { ScreenEditor } from './ScreenEditor';

type EditorView = 'list' | 'profile' | 'screen';

// Error boundary to catch render errors
class ProfileBuilderErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{this.state.error?.message || 'Unknown error'}</p>
          <p className="text-sm text-red-500">
            This may be because the database tables haven't been created yet.
            Please run the migration: <code className="bg-red-100 px-1 rounded">004_enhance_layouts.sql</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProfileBuilderInner() {
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    getProfileWithScreens,
    addScreen,
    updateScreen,
    deleteScreen,
    reorderScreens,
  } = useProfiles();

  const [view, setView] = useState<EditorView>('list');
  const [selectedProfile, setSelectedProfile] = useState<DataProfileWithScreens | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<ProfileScreen | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

  // Load profile with screens when selected
  const handleSelectProfile = async (profile: DataProfile) => {
    const profileWithScreens = await getProfileWithScreens(profile.id);
    if (profileWithScreens) {
      setSelectedProfile(profileWithScreens);
      setSelectedScreen(null);
      setSelectedWidget(null);
      setView('profile');
    }
  };

  // Create new profile
  const handleCreateProfile = async () => {
    const newProfile = await createProfile({
      name: 'New Profile',
      deviceType: DEFAULT_DEVICE,
    });
    if (newProfile) {
      // Create a default data screen
      await addScreen({
        profileId: newProfile.id,
        name: 'Data Screen 1',
        screenType: 'data',
        gridColumns: DEVICE_PRESETS[DEFAULT_DEVICE].suggestedGrid.columns,
        gridRows: DEVICE_PRESETS[DEFAULT_DEVICE].suggestedGrid.rows,
        widgets: [],
      });
      // Refresh and select
      const profileWithScreens = await getProfileWithScreens(newProfile.id);
      if (profileWithScreens) {
        setSelectedProfile(profileWithScreens);
        setView('profile');
      }
    }
  };

  // Delete profile
  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      await deleteProfile(profileId);
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
        setSelectedScreen(null);
        setView('list');
      }
    }
  };

  // Update profile
  const handleUpdateProfile = async (
    profileId: string,
    updates: { name?: string; deviceType?: string }
  ) => {
    await updateProfile(profileId, updates);
    if (selectedProfile?.id === profileId) {
      setSelectedProfile({
        ...selectedProfile,
        ...updates,
      });
    }
  };

  // Set active profile
  const handleSetActive = async (profileId: string) => {
    await setActiveProfile(profileId);
  };

  // Select screen for editing
  const handleSelectScreen = (screen: ProfileScreen) => {
    setSelectedScreen(screen);
    setSelectedWidget(null);
    setView('screen');
  };

  // Add new screen to profile
  const handleAddScreen = async (screenType: 'data' | 'map') => {
    if (!selectedProfile) return;

    const device = DEVICE_PRESETS[selectedProfile.deviceType] || DEVICE_PRESETS[DEFAULT_DEVICE];
    const screenCount = selectedProfile.screens.length;

    const newScreen = await addScreen({
      profileId: selectedProfile.id,
      name: screenType === 'map' ? 'Map Screen' : `Data Screen ${screenCount + 1}`,
      screenType,
      gridColumns: device.suggestedGrid.columns,
      gridRows: device.suggestedGrid.rows,
      widgets: [],
    });

    if (newScreen) {
      setSelectedProfile({
        ...selectedProfile,
        screens: [...selectedProfile.screens, newScreen],
      });
    }
  };

  // Add screen from template
  const handleAddScreenFromTemplate = async (template: ScreenTemplate) => {
    if (!selectedProfile) return;

    const device = DEVICE_PRESETS[selectedProfile.deviceType] || DEVICE_PRESETS[DEFAULT_DEVICE];
    const { columns, rows } = device.suggestedGrid;

    // Adapt template widgets to the target grid
    const { widgets, warnings } = adaptTemplateToGrid(template, columns, rows);

    // Show warning if some widgets won't fit
    if (warnings.length > 0) {
      const proceed = window.confirm(
        `Some widgets from the template won't fit in your ${columns}×${rows} grid:\n\n` +
          warnings.join('\n') +
          '\n\nDo you want to continue with the widgets that fit?'
      );
      if (!proceed) return;
    }

    const newScreen = await addScreen({
      profileId: selectedProfile.id,
      name: template.name,
      screenType: 'data',
      gridColumns: columns,
      gridRows: rows,
      widgets,
    });

    if (newScreen) {
      setSelectedProfile({
        ...selectedProfile,
        screens: [...selectedProfile.screens, newScreen],
      });
    }
  };

  // Update screen
  const handleUpdateScreen = async (
    screenId: string,
    updates: { name?: string; gridColumns?: number; gridRows?: number; widgets?: Widget[] }
  ) => {
    const updated = await updateScreen(screenId, updates);
    if (updated && selectedProfile) {
      const updatedScreens = selectedProfile.screens.map((s) =>
        s.id === screenId ? updated : s
      );
      setSelectedProfile({ ...selectedProfile, screens: updatedScreens });
      if (selectedScreen?.id === screenId) {
        setSelectedScreen(updated);
      }
    }
  };

  // Delete screen
  const handleDeleteScreen = async (screenId: string) => {
    if (window.confirm('Are you sure you want to delete this screen?')) {
      const success = await deleteScreen(screenId);
      if (success && selectedProfile) {
        const updatedScreens = selectedProfile.screens.filter((s) => s.id !== screenId);
        setSelectedProfile({ ...selectedProfile, screens: updatedScreens });
        if (selectedScreen?.id === screenId) {
          setSelectedScreen(null);
          setView('profile');
        }
      }
    }
  };

  // Reorder screens
  const handleReorderScreens = async (screenIds: string[]) => {
    if (!selectedProfile) return;

    await reorderScreens(selectedProfile.id, screenIds);
    const reorderedScreens = screenIds
      .map((id) => selectedProfile.screens.find((s) => s.id === id))
      .filter((s): s is ProfileScreen => s !== undefined)
      .map((s, index) => ({ ...s, position: index }));

    setSelectedProfile({ ...selectedProfile, screens: reorderedScreens });
  };

  // Back navigation
  const handleBack = () => {
    if (view === 'screen') {
      setSelectedScreen(null);
      setSelectedWidget(null);
      setView('profile');
    } else if (view === 'profile') {
      setSelectedProfile(null);
      setView('list');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view !== 'list' && (
              <button
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {view === 'list' && 'Data Profiles'}
                {view === 'profile' && selectedProfile?.name}
                {view === 'screen' && selectedScreen?.name}
              </h1>
              {view === 'list' && (
                <p className="text-sm text-gray-500">
                  Configure data screens for your rides
                </p>
              )}
              {view === 'profile' && selectedProfile && (
                <p className="text-sm text-gray-500">
                  {DEVICE_PRESETS[selectedProfile.deviceType]?.name || selectedProfile.deviceType} • {selectedProfile.screens.length} screens
                </p>
              )}
              {view === 'screen' && selectedScreen && (
                <p className="text-sm text-gray-500">
                  {selectedScreen.gridColumns} × {selectedScreen.gridRows} grid
                </p>
              )}
            </div>
          </div>

          {view === 'list' && (
            <button
              onClick={handleCreateProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Profile
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' && (
          <ProfileList
            profiles={profiles}
            onSelect={handleSelectProfile}
            onDelete={handleDeleteProfile}
            onSetActive={handleSetActive}
          />
        )}

        {view === 'profile' && selectedProfile && (
          <ProfileEditor
            profile={selectedProfile}
            onUpdateProfile={handleUpdateProfile}
            onSelectScreen={handleSelectScreen}
            onAddScreen={handleAddScreen}
            onAddScreenFromTemplate={handleAddScreenFromTemplate}
            onDeleteScreen={handleDeleteScreen}
            onReorderScreens={handleReorderScreens}
          />
        )}

        {view === 'screen' && selectedScreen && selectedProfile && (
          <ScreenEditor
            screen={selectedScreen}
            deviceType={selectedProfile.deviceType}
            onUpdateScreen={handleUpdateScreen}
            selectedWidget={selectedWidget}
            onSelectWidget={setSelectedWidget}
          />
        )}
      </div>
    </div>
  );
}

// Export wrapped with error boundary
export function ProfileBuilder() {
  return (
    <ProfileBuilderErrorBoundary>
      <ProfileBuilderInner />
    </ProfileBuilderErrorBoundary>
  );
}
