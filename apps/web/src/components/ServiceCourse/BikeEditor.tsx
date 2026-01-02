import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBikes, useBikeDetails } from '@/hooks/useBikes';
import type {
  BikeInput,
  BikeType,
  FrameMaterial,
  BikeGeometryInput,
  BikeTireInput,
} from '@peloton/shared';
import {
  BIKE_TYPE_LABELS,
  FRAME_MATERIAL_LABELS,
} from '@peloton/shared';

const BIKE_TYPES: BikeType[] = [
  'road', 'gravel', 'mountain', 'time_trial', 'track', 'cyclocross', 'hybrid', 'ebike', 'other'
];

const FRAME_MATERIALS: FrameMaterial[] = [
  'carbon', 'aluminum', 'steel', 'titanium', 'other'
];

export function BikeEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id && id !== 'new';

  const { createBike, updateBike } = useBikes();
  const { bike, loading: loadingDetails } = useBikeDetails(isEditing ? id : null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BikeInput>({
    name: '',
    bikeType: 'road',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    frameSize: '',
    frameMaterial: null,
    color: '',
    weightKg: null,
    isDefault: false,
  });

  // Load existing bike data
  useEffect(() => {
    if (bike) {
      setFormData({
        name: bike.name,
        bikeType: bike.bikeType,
        brand: bike.brand || '',
        model: bike.model || '',
        year: bike.year || new Date().getFullYear(),
        frameSize: bike.frameSize || '',
        frameMaterial: bike.frameMaterial,
        color: bike.color || '',
        weightKg: bike.weightKg,
        isDefault: bike.isDefault,
      });
    }
  }, [bike]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error('Bike name is required');
      }

      // Clean up data
      const data: BikeInput = {
        ...formData,
        name: formData.name.trim(),
        brand: formData.brand?.trim() || null,
        model: formData.model?.trim() || null,
        frameSize: formData.frameSize?.trim() || null,
        color: formData.color?.trim() || null,
      };

      if (isEditing) {
        const success = await updateBike(id!, data);
        if (success) {
          navigate(`/bikes/${id}`);
        } else {
          throw new Error('Failed to update bike');
        }
      } else {
        const newBike = await createBike(data);
        if (newBike) {
          navigate(`/bikes/${newBike.id}`);
        } else {
          throw new Error('Failed to create bike');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && loadingDetails) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/bikes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to bikes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Bike' : 'Add New Bike'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Bike Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Canyon Aeroad"
            required
          />
        </div>

        {/* Bike Type */}
        <div>
          <label htmlFor="bikeType" className="block text-sm font-medium text-gray-700 mb-1">
            Bike Type *
          </label>
          <select
            id="bikeType"
            value={formData.bikeType}
            onChange={(e) => setFormData({ ...formData, bikeType: e.target.value as BikeType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {BIKE_TYPES.map((type) => (
              <option key={type} value={type}>
                {BIKE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Brand & Model */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              id="brand"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Canyon"
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              id="model"
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Aeroad CF SLX"
            />
          </div>
        </div>

        {/* Year & Frame Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              id="year"
              value={formData.year || ''}
              onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1980"
              max={new Date().getFullYear() + 1}
            />
          </div>
          <div>
            <label htmlFor="frameSize" className="block text-sm font-medium text-gray-700 mb-1">
              Frame Size
            </label>
            <input
              type="text"
              id="frameSize"
              value={formData.frameSize || ''}
              onChange={(e) => setFormData({ ...formData, frameSize: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 54cm, M, 17.5"
            />
          </div>
        </div>

        {/* Frame Material & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="frameMaterial" className="block text-sm font-medium text-gray-700 mb-1">
              Frame Material
            </label>
            <select
              id="frameMaterial"
              value={formData.frameMaterial || ''}
              onChange={(e) => setFormData({ ...formData, frameMaterial: (e.target.value || null) as FrameMaterial | null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select material</option>
              {FRAME_MATERIALS.map((material) => (
                <option key={material} value={material}>
                  {FRAME_MATERIAL_LABELS[material]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="weightKg" className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              id="weightKg"
              value={formData.weightKg || ''}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
              min="0"
              max="30"
              placeholder="e.g., 7.5"
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="text"
            id="color"
            value={formData.color || ''}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Stealth Black"
          />
        </div>

        {/* Default bike toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700">
            Set as default bike
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Bike'}
          </button>
          <Link
            to="/bikes"
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// Detail view component that shows bike with all tabs
export function BikeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bike, geometry, fitPosition, drivetrain, tires, loading, error, updateGeometry, updateTire } = useBikeDetails(id || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'geometry' | 'fit' | 'drivetrain' | 'tires'>('overview');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading bike</p>
          <p className="text-sm">{error || 'Bike not found'}</p>
          <Link to="/bikes" className="text-sm underline mt-2 inline-block">
            Return to bike list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/bikes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to bikes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{bike.name}</h1>
              {bike.isDefault && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {[bike.brand, bike.model, bike.year, bike.frameSize].filter(Boolean).join(' • ')}
            </p>
          </div>
          <button
            onClick={() => navigate(`/bikes/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'geometry', label: 'Geometry' },
            { id: 'fit', label: 'Fit Position' },
            { id: 'drivetrain', label: 'Drivetrain' },
            { id: 'tires', label: 'Tires' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {activeTab === 'overview' && (
          <OverviewTab bike={bike} geometry={geometry} fitPosition={fitPosition} drivetrain={drivetrain} tires={tires} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'geometry' && (
          <GeometryTab geometry={geometry} bikeId={bike.id} updateGeometry={updateGeometry} />
        )}
        {activeTab === 'fit' && (
          <FitTab fitPosition={fitPosition} bikeId={bike.id} />
        )}
        {activeTab === 'drivetrain' && (
          <DrivetrainTab drivetrain={drivetrain} bikeId={bike.id} />
        )}
        {activeTab === 'tires' && (
          <TiresTab tires={tires} bikeId={bike.id} updateTire={updateTire} />
        )}
      </div>
    </div>
  );
}

// Tab components (simplified for now)
function OverviewTab({ bike, geometry, fitPosition, drivetrain, tires, onNavigateTab }: {
  bike: ReturnType<typeof useBikeDetails>['bike'];
  geometry: ReturnType<typeof useBikeDetails>['geometry'];
  fitPosition: ReturnType<typeof useBikeDetails>['fitPosition'];
  drivetrain: ReturnType<typeof useBikeDetails>['drivetrain'];
  tires: ReturnType<typeof useBikeDetails>['tires'];
  onNavigateTab: (tab: 'geometry' | 'fit' | 'drivetrain' | 'tires') => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Info</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Type</dt>
              <dd className="text-sm font-medium">{bike ? BIKE_TYPE_LABELS[bike.bikeType] : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Material</dt>
              <dd className="text-sm font-medium">
                {bike?.frameMaterial ? FRAME_MATERIAL_LABELS[bike.frameMaterial] : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Weight</dt>
              <dd className="text-sm font-medium">{bike?.weightKg ? `${bike.weightKg} kg` : '-'}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Key Measurements</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Stack</dt>
              <dd className="text-sm font-medium">{geometry?.stackMm ? `${geometry.stackMm}mm` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Reach</dt>
              <dd className="text-sm font-medium">{geometry?.reachMm ? `${geometry.reachMm}mm` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Saddle Height</dt>
              <dd className="text-sm font-medium">{fitPosition?.saddleHeightMm ? `${fitPosition.saddleHeightMm}mm` : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Setup Status</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatusCard
            label="Geometry"
            hasData={!!geometry}
            fields={geometry ? [
              geometry.stackMm && 'Stack',
              geometry.reachMm && 'Reach',
            ].filter(Boolean).length : 0}
            onClick={() => onNavigateTab('geometry')}
          />
          <StatusCard
            label="Fit Position"
            hasData={!!fitPosition}
            fields={fitPosition ? [
              fitPosition.saddleHeightMm && 'Saddle',
              fitPosition.stemLengthMm && 'Stem',
            ].filter(Boolean).length : 0}
            onClick={() => onNavigateTab('fit')}
          />
          <StatusCard
            label="Drivetrain"
            hasData={!!drivetrain}
            fields={drivetrain ? [
              drivetrain.groupsetBrand && 'Groupset',
              drivetrain.crankLengthMm && 'Crank',
            ].filter(Boolean).length : 0}
            onClick={() => onNavigateTab('drivetrain')}
          />
          <StatusCard
            label="Tires"
            hasData={tires.length > 0}
            fields={tires.length}
            onClick={() => onNavigateTab('tires')}
          />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, hasData, fields, onClick }: { label: string; hasData: boolean; fields: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${hasData ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className={`text-xs ${hasData ? 'text-green-600' : 'text-gray-500'}`}>
        {hasData ? `${fields} field${fields !== 1 ? 's' : ''} set` : 'Not configured'}
      </p>
    </button>
  );
}

function GeometryTab({ geometry, bikeId: _bikeId, updateGeometry }: {
  geometry: ReturnType<typeof useBikeDetails>['geometry'];
  bikeId: string;
  updateGeometry: (data: BikeGeometryInput) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(!geometry);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<BikeGeometryInput>({
    stackMm: geometry?.stackMm ?? null,
    reachMm: geometry?.reachMm ?? null,
    seatTubeLengthMm: geometry?.seatTubeLengthMm ?? null,
    seatTubeAngle: geometry?.seatTubeAngle ?? null,
    effectiveTopTubeMm: geometry?.effectiveTopTubeMm ?? null,
    headTubeLengthMm: geometry?.headTubeLengthMm ?? null,
    headTubeAngle: geometry?.headTubeAngle ?? null,
    chainstayLengthMm: geometry?.chainstayLengthMm ?? null,
    wheelbaseMm: geometry?.wheelbaseMm ?? null,
    bbDropMm: geometry?.bbDropMm ?? null,
    forkRakeMm: geometry?.forkRakeMm ?? null,
    trailMm: geometry?.trailMm ?? null,
    source: geometry?.source ?? 'manual',
  });

  useEffect(() => {
    if (geometry) {
      setFormData({
        stackMm: geometry.stackMm,
        reachMm: geometry.reachMm,
        seatTubeLengthMm: geometry.seatTubeLengthMm,
        seatTubeAngle: geometry.seatTubeAngle,
        effectiveTopTubeMm: geometry.effectiveTopTubeMm,
        headTubeLengthMm: geometry.headTubeLengthMm,
        headTubeAngle: geometry.headTubeAngle,
        chainstayLengthMm: geometry.chainstayLengthMm,
        wheelbaseMm: geometry.wheelbaseMm,
        bbDropMm: geometry.bbDropMm,
        forkRakeMm: geometry.forkRakeMm,
        trailMm: geometry.trailMm,
        source: geometry.source,
      });
    }
  }, [geometry]);

  const handleSave = async () => {
    setSaving(true);
    const success = await updateGeometry(formData);
    setSaving(false);
    if (success) {
      setEditing(false);
    }
  };

  const GeometryInput = ({ label, field, unit, step = 1 }: { label: string; field: keyof BikeGeometryInput; unit: string; step?: number }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label} ({unit})</label>
      {editing ? (
        <input
          type="number"
          value={(formData[field] as number | null) ?? ''}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value ? parseFloat(e.target.value) : null })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          step={step}
        />
      ) : (
        <p className="text-sm font-medium">{(formData[field] as number | null) ?? '-'}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Frame Geometry</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        <GeometryInput label="Stack" field="stackMm" unit="mm" />
        <GeometryInput label="Reach" field="reachMm" unit="mm" />
        <GeometryInput label="Effective Top Tube" field="effectiveTopTubeMm" unit="mm" />
        <GeometryInput label="Seat Tube Length" field="seatTubeLengthMm" unit="mm" />
        <GeometryInput label="Seat Tube Angle" field="seatTubeAngle" unit="°" step={0.1} />
        <GeometryInput label="Head Tube Length" field="headTubeLengthMm" unit="mm" />
        <GeometryInput label="Head Tube Angle" field="headTubeAngle" unit="°" step={0.1} />
        <GeometryInput label="Chainstay" field="chainstayLengthMm" unit="mm" />
        <GeometryInput label="Wheelbase" field="wheelbaseMm" unit="mm" />
        <GeometryInput label="BB Drop" field="bbDropMm" unit="mm" />
        <GeometryInput label="Fork Rake" field="forkRakeMm" unit="mm" />
        <GeometryInput label="Trail" field="trailMm" unit="mm" />
      </div>

      {geometry?.source && (
        <p className="text-xs text-gray-500">
          Source: {geometry.source === 'geometry_geeks' ? 'GeometryGeeks' : 'Manual entry'}
          {geometry.importedAt && ` • Imported ${new Date(geometry.importedAt).toLocaleDateString()}`}
        </p>
      )}
    </div>
  );
}

function FitTab({ fitPosition, bikeId: _bikeId }: { fitPosition: ReturnType<typeof useBikeDetails>['fitPosition']; bikeId: string }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <p>Fit position editor coming soon</p>
      <p className="text-sm mt-2">
        {fitPosition ? 'Edit your bike fit measurements' : 'Add saddle, handlebar, and stem measurements'}
      </p>
    </div>
  );
}

function DrivetrainTab({ drivetrain, bikeId: _bikeId }: { drivetrain: ReturnType<typeof useBikeDetails>['drivetrain']; bikeId: string }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <p>Drivetrain editor coming soon</p>
      <p className="text-sm mt-2">
        {drivetrain ? 'Edit groupset and gearing' : 'Add your groupset, chainrings, and cassette'}
      </p>
    </div>
  );
}

function TiresTab({ tires, bikeId: _bikeId, updateTire }: {
  tires: ReturnType<typeof useBikeDetails>['tires'];
  bikeId: string;
  updateTire: (data: BikeTireInput) => Promise<boolean>;
}) {
  const [editingPosition, setEditingPosition] = useState<'front' | 'rear' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<BikeTireInput>>({});

  const frontTire = tires.find(t => t.position === 'front');
  const rearTire = tires.find(t => t.position === 'rear');

  const startEdit = (position: 'front' | 'rear') => {
    const existing = position === 'front' ? frontTire : rearTire;
    setFormData({
      position,
      brand: existing?.brand ?? '',
      model: existing?.model ?? '',
      widthMm: existing?.widthMm ?? 28,
      tireType: existing?.tireType ?? 'clincher',
      currentPressurePsi: existing?.currentPressurePsi ?? null,
    });
    setEditingPosition(position);
  };

  const handleSave = async () => {
    if (!formData.position || !formData.brand || !formData.model) return;
    setSaving(true);
    const success = await updateTire(formData as BikeTireInput);
    setSaving(false);
    if (success) {
      setEditingPosition(null);
    }
  };

  const TireCard = ({ position, tire }: { position: 'front' | 'rear'; tire: typeof frontTire }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium capitalize">{position} Tire</h4>
        <button
          onClick={() => startEdit(position)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {tire ? 'Edit' : 'Add'}
        </button>
      </div>
      {tire ? (
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Brand:</span> {tire.brand}</p>
          <p><span className="text-gray-500">Model:</span> {tire.model}</p>
          <p><span className="text-gray-500">Width:</span> {tire.widthMm}mm</p>
          {tire.tireType && <p><span className="text-gray-500">Type:</span> {tire.tireType}</p>}
          {tire.currentPressurePsi && <p><span className="text-gray-500">Pressure:</span> {tire.currentPressurePsi} PSI</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Not configured</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Tires</h3>

      {editingPosition ? (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium capitalize mb-4">Edit {editingPosition} Tire</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand *</label>
              <input
                type="text"
                value={formData.brand ?? ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="e.g., Continental"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
              <input
                type="text"
                value={formData.model ?? ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="e.g., GP5000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Width (mm)</label>
              <input
                type="number"
                value={formData.widthMm ?? ''}
                onChange={(e) => setFormData({ ...formData, widthMm: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={formData.tireType ?? 'clincher'}
                onChange={(e) => setFormData({ ...formData, tireType: e.target.value as 'clincher' | 'tubeless' | 'tubular' })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="clincher">Clincher</option>
                <option value="tubeless">Tubeless</option>
                <option value="tubular">Tubular</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pressure (PSI)</label>
              <input
                type="number"
                value={formData.currentPressurePsi ?? ''}
                onChange={(e) => setFormData({ ...formData, currentPressurePsi: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setEditingPosition(null)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.brand || !formData.model}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <TireCard position="front" tire={frontTire} />
          <TireCard position="rear" tire={rearTire} />
        </div>
      )}
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
