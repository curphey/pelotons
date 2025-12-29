import { useState, useEffect } from 'react';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import {
  calculatePowerZones,
  calculateHeartRateZones,
  calculateAge,
  estimateMaxHr,
  type AthleteProfileInput,
} from '@peloton/shared';

export function ProfilePage() {
  const { profile, loading, saving, error, updateProfile } = useAthleteProfile();
  const [formData, setFormData] = useState<AthleteProfileInput>({
    displayName: '',
    dateOfBirth: '',
    gender: null,
    weightKg: null,
    heightCm: null,
    ftpWatts: null,
    maxHrBpm: null,
    restingHrBpm: null,
    lthrBpm: null,
    unitSystem: 'metric',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        ftpWatts: profile.ftpWatts,
        maxHrBpm: profile.maxHrBpm,
        restingHrBpm: profile.restingHrBpm,
        lthrBpm: profile.lthrBpm,
        unitSystem: profile.unitSystem,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    const success = await updateProfile(formData);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleChange = (field: keyof AthleteProfileInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof AthleteProfileInput, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    handleChange(field, num);
  };

  // Calculate estimated max HR from age
  const estimatedMaxHr = formData.dateOfBirth
    ? estimateMaxHr(calculateAge(formData.dateOfBirth))
    : null;

  // Calculate zones for preview
  const powerZones = formData.ftpWatts ? calculatePowerZones(formData.ftpWatts) : null;
  const hrZones = formData.maxHrBpm
    ? calculateHeartRateZones(formData.maxHrBpm, formData.lthrBpm)
    : null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Athlete Profile</h1>
        <p className="mt-1 text-gray-600">
          Your profile data is used to calculate metrics like W/kg, power zones, and heart rate zones.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName ?? ''}
                onChange={(e) => handleChange('displayName', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth ?? ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.dateOfBirth && (
                <p className="mt-1 text-sm text-gray-500">
                  Age: {calculateAge(formData.dateOfBirth)} years
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender ?? ''}
                onChange={(e) =>
                  handleChange('gender', e.target.value || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit System
              </label>
              <select
                value={formData.unitSystem}
                onChange={(e) =>
                  handleChange('unitSystem', e.target.value as 'metric' | 'imperial')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="metric">Metric (kg, km)</option>
                <option value="imperial">Imperial (lb, mi)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Physical Stats */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Physical Stats</h2>
          <p className="text-sm text-gray-500 mb-4">Used for W/kg and fit calculations</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight ({formData.unitSystem === 'metric' ? 'kg' : 'lb'})
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.weightKg ?? ''}
                onChange={(e) => handleNumberChange('weightKg', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={formData.unitSystem === 'metric' ? '70' : '154'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height ({formData.unitSystem === 'metric' ? 'cm' : 'in'})
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.heightCm ?? ''}
                onChange={(e) => handleNumberChange('heightCm', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={formData.unitSystem === 'metric' ? '175' : '69'}
              />
            </div>
          </div>
        </section>

        {/* Power Settings */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Power Settings</h2>
          <p className="text-sm text-gray-500 mb-4">
            FTP is used for power zones, %FTP, Intensity Factor (IF), and TSS calculations
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FTP (Functional Threshold Power)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.ftpWatts ?? ''}
                  onChange={(e) => handleNumberChange('ftpWatts', e.target.value)}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="250"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">W</span>
              </div>
              {formData.ftpWatts && formData.weightKg && (
                <p className="mt-1 text-sm text-gray-500">
                  W/kg: {(formData.ftpWatts / formData.weightKg).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Power Zones Preview */}
          {powerZones && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Power Zones (Coggan)</h3>
              <div className="space-y-1">
                {powerZones.zones.map((zone) => (
                  <div key={zone.zone} className="flex items-center text-sm">
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="w-8">Z{zone.zone}</span>
                    <span className="w-32">{zone.name}</span>
                    <span className="text-gray-600">
                      {zone.minWatts}-{zone.maxWatts ?? '∞'}W
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Heart Rate Settings */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Heart Rate Settings</h2>
          <p className="text-sm text-gray-500 mb-4">
            Used for heart rate zones and training intensity tracking
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max HR</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="250"
                  value={formData.maxHrBpm ?? ''}
                  onChange={(e) => handleNumberChange('maxHrBpm', e.target.value)}
                  className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={estimatedMaxHr?.toString() ?? '185'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  bpm
                </span>
              </div>
              {estimatedMaxHr && !formData.maxHrBpm && (
                <button
                  type="button"
                  onClick={() => handleChange('maxHrBpm', estimatedMaxHr)}
                  className="mt-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  Use estimated ({estimatedMaxHr} bpm)
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resting HR</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="150"
                  value={formData.restingHrBpm ?? ''}
                  onChange={(e) => handleNumberChange('restingHrBpm', e.target.value)}
                  className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  bpm
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LTHR</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="250"
                  value={formData.lthrBpm ?? ''}
                  onChange={(e) => handleNumberChange('lthrBpm', e.target.value)}
                  className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="165"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  bpm
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Lactate Threshold HR</p>
            </div>
          </div>

          {/* HR Zones Preview */}
          {hrZones && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Heart Rate Zones</h3>
              <div className="space-y-1">
                {hrZones.zones.map((zone) => (
                  <div key={zone.zone} className="flex items-center text-sm">
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="w-8">Z{zone.zone}</span>
                    <span className="w-32">{zone.name}</span>
                    <span className="text-gray-600">
                      {zone.minBpm}-{zone.maxBpm ?? '∞'} bpm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
