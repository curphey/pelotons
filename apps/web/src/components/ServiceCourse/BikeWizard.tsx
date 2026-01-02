import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBikes } from '@/hooks/useBikes';
import {
  useBikeSearch,
  useBikeDetails,
  inferBikeType,
  inferFrameMaterial,
  type BikeSearchResult,
  type BikeGeometry,
} from '@/hooks/useBikeSearch';
import {
  useBikeFit,
  type BikeSetupCalculation,
} from '@/hooks/useBikeFit';
import { BikeFitDiagram } from './BikeFitDiagram';
import {
  BikeInput,
  BikeType,
  FrameMaterial,
  BikeGeometryInput,
  BIKE_TYPE_LABELS,
  FRAME_MATERIAL_LABELS,
} from '@peloton/shared';

const BIKE_TYPES: BikeType[] = [
  'road', 'gravel', 'mountain', 'time_trial', 'track', 'cyclocross', 'hybrid', 'ebike', 'other'
];

const FRAME_MATERIALS: FrameMaterial[] = [
  'carbon', 'aluminum', 'steel', 'titanium', 'other'
];

type WizardMode = 'search' | 'manual';

interface WizardState {
  step: number;
  mode: WizardMode;
  // From search
  selectedBike: BikeSearchResult | null;
  selectedSize: string;
  availableSizes: string[];
  geometryData: BikeGeometry[];
  // Editable fields
  brand: string;
  model: string;
  year: number | null;
  bikeType: BikeType;
  frameMaterial: FrameMaterial | null;
  frameSize: string;
  name: string;
  color: string;
  weightKg: number | null;
  geometryGeeksUrl: string;
  geometry: BikeGeometryInput;
}

export function BikeWizard() {
  const navigate = useNavigate();
  const { createBike, createGeometry } = useBikes();
  const { search, searching, results, clearResults } = useBikeSearch();
  const { fetchDetails, loading: loadingDetails } = useBikeDetails();
  const { fitData, loading: loadingFit, error: fitError, parseFitFile, clearFitData, calculateSetup } = useBikeFit();
  const fitFileInputRef = useRef<HTMLInputElement>(null);
  const [bikeSetup, setBikeSetup] = useState<BikeSetupCalculation | null>(null);

  const [state, setState] = useState<WizardState>({
    step: 1,
    mode: 'search',
    selectedBike: null,
    selectedSize: '',
    availableSizes: [],
    geometryData: [],
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    bikeType: 'road',
    frameMaterial: 'carbon',
    frameSize: '',
    name: '',
    color: '',
    weightKg: null,
    geometryGeeksUrl: '',
    geometry: {},
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        search(searchQuery);
        setShowDropdown(true);
      }, 300);
    } else {
      clearResults();
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, search, clearResults]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When bike is selected, fetch details and auto-fill
  const selectBike = useCallback(async (bike: BikeSearchResult) => {
    setShowDropdown(false);
    setSearchQuery(bike.name);

    // Infer data from the bike
    const bikeType = (bike.bikeType || inferBikeType(bike.name)) as BikeType;
    const frameMaterial = inferFrameMaterial(bike.name) as FrameMaterial;

    setState(s => ({
      ...s,
      selectedBike: bike,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      bikeType: bikeType || 'road',
      frameMaterial: frameMaterial || 'carbon',
      geometryGeeksUrl: bike.url,
    }));

    // Fetch detailed geometry
    const bikeDetails = await fetchDetails(bike.url);
    if (bikeDetails) {
      setState(s => ({
        ...s,
        availableSizes: bikeDetails.sizes,
        geometryData: bikeDetails.geometries,
        // Update bike type if we got more specific info
        bikeType: (bikeDetails.bikeType as BikeType) || s.bikeType,
      }));
    }
  }, [fetchDetails]);

  // When size is selected, auto-fill geometry
  const selectSize = useCallback((size: string) => {
    const geometryForSize = state.geometryData.find(g => g.size === size);
    console.log('Selecting size:', size, 'Geometry found:', geometryForSize);

    setState(s => ({
      ...s,
      selectedSize: size,
      frameSize: size,
      geometry: geometryForSize ? {
        stackMm: geometryForSize.stackMm,
        reachMm: geometryForSize.reachMm,
        seatTubeLengthMm: geometryForSize.seatTubeLengthMm,
        seatTubeAngle: geometryForSize.seatTubeAngle,
        effectiveTopTubeMm: geometryForSize.effectiveTopTubeMm,
        headTubeLengthMm: geometryForSize.headTubeLengthMm,
        headTubeAngle: geometryForSize.headTubeAngle,
        chainstayLengthMm: geometryForSize.chainstayLengthMm,
        wheelbaseMm: geometryForSize.wheelbaseMm,
        bbDropMm: geometryForSize.bbDropMm,
        bbHeightMm: geometryForSize.bbHeightMm,
        forkRakeMm: geometryForSize.forkRakeMm,
        trailMm: geometryForSize.trailMm,
        standoverHeightMm: geometryForSize.standoverHeightMm,
        source: 'geometry_geeks',
      } : s.geometry,
    }));
  }, [state.geometryData]);

  // Switch to manual mode
  const switchToManual = () => {
    setState(s => ({ ...s, mode: 'manual', selectedBike: null }));
    setSearchQuery('');
    clearResults();
  };

  // Handle fit file upload
  const handleFitFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await parseFitFile(file);
    }
    // Reset input so same file can be re-selected
    if (fitFileInputRef.current) {
      fitFileInputRef.current.value = '';
    }
  };

  // Recalculate bike setup when fit data or geometry changes
  useEffect(() => {
    if (fitData && state.geometry.stackMm && state.geometry.reachMm && state.geometry.headTubeAngle) {
      const setup = calculateSetup({
        stackMm: state.geometry.stackMm,
        reachMm: state.geometry.reachMm,
        headTubeAngle: state.geometry.headTubeAngle,
        headTubeLengthMm: state.geometry.headTubeLengthMm ?? undefined,
        seatTubeAngle: state.geometry.seatTubeAngle ?? undefined,
        seatTubeLengthMm: state.geometry.seatTubeLengthMm ?? undefined,
        bbDropMm: state.geometry.bbDropMm ?? undefined,
      });
      setBikeSetup(setup);
    } else {
      setBikeSetup(null);
    }
  }, [fitData, state.geometry, calculateSetup]);

  // Auto-generate bike name
  const generateName = () => {
    const parts = [state.brand, state.model, state.year].filter(Boolean);
    return parts.join(' ') || 'My Bike';
  };

  // Save bike
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const bikeData: BikeInput = {
        name: state.name || generateName(),
        bikeType: state.bikeType,
        brand: state.brand || null,
        model: state.model || null,
        year: state.year,
        frameSize: state.frameSize || null,
        frameMaterial: state.frameMaterial,
        color: state.color || null,
        weightKg: state.weightKg,
        geometryGeeksUrl: state.geometryGeeksUrl || null,
        isDefault: false,
      };

      const newBike = await createBike(bikeData);

      if (newBike) {
        // If we have geometry data, save it
        const hasGeometry = Object.values(state.geometry).some(v => v !== null && v !== undefined);
        if (hasGeometry) {
          console.log('Saving geometry:', state.geometry);
          const geoSuccess = await createGeometry(newBike.id, state.geometry);
          if (!geoSuccess) {
            console.warn('Failed to save geometry data');
          }
        } else {
          console.log('No geometry data to save');
        }

        navigate(`/bikes/${newBike.id}`);
      } else {
        throw new Error('Failed to create bike');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bike');
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const nextStep = () => setState(s => ({ ...s, step: s.step + 1 }));
  const prevStep = () => setState(s => ({ ...s, step: s.step - 1 }));

  // Check if ready to proceed from step 1
  const canProceedFromStep1 = state.selectedBike !== null || (state.mode === 'manual' && state.brand.length > 0);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {['Find Bike', 'Configure', 'Review'].map((label, idx) => (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                state.step > idx + 1
                  ? 'bg-green-500 text-white'
                  : state.step === idx + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {state.step > idx + 1 ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 2 && (
                <div className={`w-24 sm:w-32 h-1 mx-2 ${
                  state.step > idx + 1 ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Find Bike</span>
          <span>Configure</span>
          <span>Review</span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Find Bike */}
      {state.step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Find your bike</h2>
            <p className="text-sm text-gray-500">
              Search from 93,000+ bikes in the GeometryGeeks database
            </p>
          </div>

          {/* Search input - only show when no bike selected */}
          {!state.selectedBike && (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by brand, model, or year
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="e.g., Canyon Aeroad 2024, Specialized Tarmac, Trek Madone..."
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner />
                  </div>
                )}
              </div>

              {/* Search results dropdown */}
              {showDropdown && results.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {results.map((bike, idx) => (
                    <button
                      key={`${bike.url}-${idx}`}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      onClick={() => selectBike(bike)}
                    >
                      <div className="font-medium text-gray-900">{bike.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {bike.bikeType && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {BIKE_TYPE_LABELS[bike.bikeType as BikeType] || bike.bikeType}
                          </span>
                        )}
                        {bike.year && (
                          <span className="text-xs text-gray-500">{bike.year}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showDropdown && searchQuery.length >= 2 && !searching && results.length === 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <p className="text-gray-500 text-sm mb-2">No bikes found matching "{searchQuery}"</p>
                  <button
                    onClick={switchToManual}
                    className="text-blue-600 text-sm hover:text-blue-700"
                  >
                    Enter bike details manually
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selected bike display */}
          {state.selectedBike && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">{state.selectedBike.name}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      {BIKE_TYPE_LABELS[state.bikeType]}
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      {state.frameMaterial && FRAME_MATERIAL_LABELS[state.frameMaterial]}
                    </span>
                  </div>
                  {loadingDetails && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                      <LoadingSpinner className="w-4 h-4" />
                      Loading geometry data...
                    </div>
                  )}
                  {state.availableSizes.length > 0 && (
                    <div className="mt-2 text-sm text-green-700">
                      {state.availableSizes.length} sizes available with geometry data
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setState(s => ({ ...s, selectedBike: null, availableSizes: [], geometryData: [] }));
                    setSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Manual entry option */}
          {state.mode === 'search' && !state.selectedBike && (
            <div className="pt-4 border-t">
              <button
                onClick={switchToManual}
                className="text-gray-600 text-sm hover:text-gray-800"
              >
                Can't find your bike? <span className="text-blue-600">Enter details manually</span>
              </button>
            </div>
          )}

          {/* Manual entry form */}
          {state.mode === 'manual' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Manual Entry</h3>
                <button
                  onClick={() => setState(s => ({ ...s, mode: 'search' }))}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to search
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    value={state.brand}
                    onChange={(e) => setState(s => ({ ...s, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Canyon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={state.model}
                    onChange={(e) => setState(s => ({ ...s, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Aeroad CF SLX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={state.year || ''}
                    onChange={(e) => setState(s => ({ ...s, year: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="2024"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bike Type</label>
                  <select
                    value={state.bikeType}
                    onChange={(e) => setState(s => ({ ...s, bikeType: e.target.value as BikeType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {BIKE_TYPES.map(type => (
                      <option key={type} value={type}>{BIKE_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={nextStep}
              disabled={!canProceedFromStep1 || loadingDetails}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {state.step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Configure your bike</h2>
            <p className="text-sm text-gray-500">
              {state.selectedBike
                ? 'Select your size and customize details'
                : 'Enter your bike specifications'}
            </p>
          </div>

          {/* Size selection - show if we have geometry data */}
          {state.availableSizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frame Size <span className="text-green-600">(geometry will auto-fill)</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {state.availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => selectSize(size)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      state.selectedSize === size
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {state.selectedSize && state.geometry.stackMm && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="font-medium text-blue-900 mb-1">Auto-filled geometry for {state.selectedSize}</div>
                  <div className="text-blue-700">
                    Stack: {state.geometry.stackMm}mm, Reach: {state.geometry.reachMm}mm
                    {state.geometry.effectiveTopTubeMm && `, ETT: ${state.geometry.effectiveTopTubeMm}mm`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual size entry if no sizes available */}
          {state.availableSizes.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frame Size *</label>
              <input
                type="text"
                value={state.frameSize}
                onChange={(e) => setState(s => ({ ...s, frameSize: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., M, 54, 56cm"
              />
            </div>
          )}

          {/* Editable details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike Type</label>
              <select
                value={state.bikeType}
                onChange={(e) => setState(s => ({ ...s, bikeType: e.target.value as BikeType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {BIKE_TYPES.map(type => (
                  <option key={type} value={type}>{BIKE_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frame Material</label>
              <select
                value={state.frameMaterial || ''}
                onChange={(e) => setState(s => ({ ...s, frameMaterial: e.target.value as FrameMaterial }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {FRAME_MATERIALS.map(material => (
                  <option key={material} value={material}>{FRAME_MATERIAL_LABELS[material]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Geometry section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Geometry</label>
              {state.geometry.stackMm && (
                <span className="text-xs text-green-600">Auto-filled from GeometryGeeks</span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <GeometryField
                label="Stack"
                unit="mm"
                value={state.geometry.stackMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, stackMm: v } }))}
              />
              <GeometryField
                label="Reach"
                unit="mm"
                value={state.geometry.reachMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, reachMm: v } }))}
              />
              <GeometryField
                label="ETT"
                unit="mm"
                value={state.geometry.effectiveTopTubeMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, effectiveTopTubeMm: v } }))}
              />
              <GeometryField
                label="Seat Tube"
                unit="mm"
                value={state.geometry.seatTubeLengthMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, seatTubeLengthMm: v } }))}
              />
              <GeometryField
                label="STA"
                unit="°"
                value={state.geometry.seatTubeAngle}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, seatTubeAngle: v } }))}
                step={0.1}
              />
              <GeometryField
                label="HTA"
                unit="°"
                value={state.geometry.headTubeAngle}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, headTubeAngle: v } }))}
                step={0.1}
              />
              <GeometryField
                label="Head Tube"
                unit="mm"
                value={state.geometry.headTubeLengthMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, headTubeLengthMm: v } }))}
              />
              <GeometryField
                label="Chainstay"
                unit="mm"
                value={state.geometry.chainstayLengthMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, chainstayLengthMm: v } }))}
              />
              <GeometryField
                label="Wheelbase"
                unit="mm"
                value={state.geometry.wheelbaseMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, wheelbaseMm: v } }))}
              />
              <GeometryField
                label="BB Drop"
                unit="mm"
                value={state.geometry.bbDropMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, bbDropMm: v } }))}
              />
              <GeometryField
                label="Fork Rake"
                unit="mm"
                value={state.geometry.forkRakeMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, forkRakeMm: v } }))}
              />
              <GeometryField
                label="Trail"
                unit="mm"
                value={state.geometry.trailMm}
                onChange={(v) => setState(s => ({ ...s, geometry: { ...s.geometry, trailMm: v } }))}
              />
            </div>
          </div>

          {/* Frame Geometry Visualization */}
          {!fitData && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Frame Geometry</h3>
              {state.geometry.stackMm != null && state.geometry.reachMm != null ? (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    Stack: {state.geometry.stackMm}mm, Reach: {state.geometry.reachMm}mm,
                    STA: {state.geometry.seatTubeAngle ?? 73}°, HTA: {state.geometry.headTubeAngle ?? 73}°
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-center">
                    <BikeFitDiagram
                      geometry={{
                        stackMm: state.geometry.stackMm,
                        reachMm: state.geometry.reachMm,
                        seatTubeAngle: state.geometry.seatTubeAngle ?? 73,
                        headTubeAngle: state.geometry.headTubeAngle ?? 73,
                        seatTubeLengthMm: state.geometry.seatTubeLengthMm ?? undefined,
                        headTubeLengthMm: state.geometry.headTubeLengthMm ?? undefined,
                        chainstayLengthMm: state.geometry.chainstayLengthMm ?? undefined,
                        wheelbaseMm: state.geometry.wheelbaseMm ?? undefined,
                      }}
                      showMeasurements={true}
                      width={500}
                      height={300}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Select a frame size above to see geometry visualization</p>
                  {/* Sample diagram with default geometry */}
                  <div className="mt-3 flex justify-center opacity-50">
                    <BikeFitDiagram
                      geometry={{
                        stackMm: 560,
                        reachMm: 390,
                        seatTubeAngle: 73.5,
                        headTubeAngle: 73,
                      }}
                      showMeasurements={false}
                      width={400}
                      height={250}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bike Fit Import Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Bike Fit Position</h3>
                <p className="text-xs text-gray-500">Upload a Retül fit report to calculate setup requirements</p>
              </div>
              {fitData && (
                <button
                  onClick={clearFitData}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear fit data
                </button>
              )}
            </div>

            {/* File upload */}
            {!fitData && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  ref={fitFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFitFileUpload}
                  className="hidden"
                  id="fit-file-upload"
                />
                <label
                  htmlFor="fit-file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {loadingFit ? 'Processing...' : 'Click to upload Retül PDF'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">ZIN Report format supported</span>
                </label>
              </div>
            )}

            {fitError && (
              <div className="mt-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {fitError}
              </div>
            )}

            {/* Fit data loaded - show original fit summary */}
            {fitData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckIcon className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Fit data loaded</span>
                </div>
                <div className="text-sm text-purple-700 space-y-1">
                  {fitData.originalBike && (
                    <div>Original bike: {fitData.originalBike.make} {fitData.originalBike.model} {fitData.originalBike.size}</div>
                  )}
                  {fitData.fitDate && <div>Fit date: {fitData.fitDate}</div>}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-200">
                    <div>Saddle height: {fitData.fitPosition.saddleHeight}mm</div>
                    <div>Saddle setback: {fitData.fitPosition.saddleSetback}mm</div>
                    <div>Handlebar stack: {fitData.fitPosition.handlebarStack}mm</div>
                    <div>Handlebar reach: {fitData.fitPosition.handlebarReach}mm</div>
                  </div>
                </div>
              </div>
            )}

            {/* Calculated bike setup */}
            {bikeSetup && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Calculated Setup for This Frame</h4>

                {/* Visual bike fit diagram */}
                {state.geometry.stackMm && state.geometry.reachMm && (
                  <div className="bg-white rounded-lg p-3 mb-4 border border-green-100">
                    <BikeFitDiagram
                      geometry={{
                        stackMm: state.geometry.stackMm,
                        reachMm: state.geometry.reachMm,
                        seatTubeAngle: state.geometry.seatTubeAngle || 73,
                        headTubeAngle: state.geometry.headTubeAngle || 73,
                        seatTubeLengthMm: state.geometry.seatTubeLengthMm || undefined,
                        headTubeLengthMm: state.geometry.headTubeLengthMm || undefined,
                        chainstayLengthMm: state.geometry.chainstayLengthMm || undefined,
                        wheelbaseMm: state.geometry.wheelbaseMm || undefined,
                      }}
                      fitPosition={{
                        saddleHeight: bikeSetup.saddleHeight,
                        saddleSetback: bikeSetup.saddleSetback,
                        saddleAngle: bikeSetup.saddleAngle,
                        handlebarStack: fitData?.fitPosition.handlebarStack || 0,
                        handlebarReach: fitData?.fitPosition.handlebarReach || 0,
                        stemLength: bikeSetup.stem.stemLength,
                        stemAngle: bikeSetup.stem.stemAngle,
                        spacerStack: bikeSetup.stem.spacerStack,
                      }}
                      showMeasurements={true}
                      width={500}
                      height={320}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cockpit setup */}
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cockpit</h5>
                    <div className="space-y-2 text-sm">
                      <SetupRow label="Stem Length" value={`${bikeSetup.stem.stemLength}mm`} />
                      <SetupRow label="Stem Angle" value={`${bikeSetup.stem.stemAngle}°`} />
                      <SetupRow label="Spacer Stack" value={`${bikeSetup.stem.spacerStack}mm`} />
                      {bikeSetup.stem.stackDelta !== 0 && (
                        <div className={`text-xs ${Math.abs(bikeSetup.stem.stackDelta) > 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                          Bar height: {bikeSetup.stem.stackDelta > 0 ? '+' : ''}{bikeSetup.stem.stackDelta}mm vs fit
                        </div>
                      )}
                      {bikeSetup.stem.reachDelta !== 0 && (
                        <div className={`text-xs ${Math.abs(bikeSetup.stem.reachDelta) > 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                          Bar reach: {bikeSetup.stem.reachDelta > 0 ? '+' : ''}{bikeSetup.stem.reachDelta}mm vs fit
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Saddle setup */}
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Saddle</h5>
                    <div className="space-y-2 text-sm">
                      <SetupRow label="Saddle Height" value={`${bikeSetup.saddleHeight}mm`} highlight />
                      {bikeSetup.seatpostExtension !== null && (
                        <SetupRow label="Seatpost Extension" value={`~${bikeSetup.seatpostExtension}mm`} />
                      )}
                      <SetupRow label="Setback" value={`${Math.abs(bikeSetup.saddleSetback)}mm ${bikeSetup.saddleSetback < 0 ? 'behind BB' : 'ahead of BB'}`} />
                      <SetupRow label="Saddle Angle" value={`${bikeSetup.saddleAngle}°`} />
                      {bikeSetup.seatpostOffsetNeeded > 0 && (
                        <SetupRow label="Seatpost Offset" value={`${bikeSetup.seatpostOffsetNeeded}mm recommended`} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes and warnings */}
                {(bikeSetup.notes.length > 0 || bikeSetup.warnings.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    {bikeSetup.warnings.map((warning, i) => (
                      <div key={i} className="text-xs text-amber-700 flex items-start gap-1 mb-1">
                        <span className="mt-0.5">⚠️</span>
                        <span>{warning}</span>
                      </div>
                    ))}
                    {bikeSetup.notes.map((note, i) => (
                      <div key={i} className="text-xs text-green-700 mb-1">• {note}</div>
                    ))}
                  </div>
                )}

                {!bikeSetup.stem.isAchievable && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    Note: Exact fit position may not be achievable with standard components.
                    Consider the position deltas shown above.
                  </div>
                )}
              </div>
            )}

            {/* Missing geometry warning */}
            {fitData && !bikeSetup && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                Select a frame size above to calculate the setup requirements.
                Stack, reach, and head tube angle are required.
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={prevStep} className="px-6 py-2 text-gray-600 hover:text-gray-800">
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!state.frameSize && !state.selectedSize}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {state.step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Save</h2>
            <p className="text-sm text-gray-500">Confirm your bike details before saving</p>
          </div>

          {/* Bike name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bike Name</label>
            <input
              type="text"
              value={state.name || generateName()}
              onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <SummaryRow label="Brand" value={state.brand} />
            <SummaryRow label="Model" value={state.model} />
            <SummaryRow label="Year" value={state.year?.toString()} />
            <SummaryRow label="Size" value={state.frameSize || state.selectedSize} />
            <SummaryRow label="Type" value={BIKE_TYPE_LABELS[state.bikeType]} />
            <SummaryRow label="Material" value={state.frameMaterial ? FRAME_MATERIAL_LABELS[state.frameMaterial] : undefined} />
            {state.color && <SummaryRow label="Color" value={state.color} />}
            {state.weightKg && <SummaryRow label="Weight" value={`${state.weightKg} kg`} />}
          </div>

          {/* Geometry summary */}
          {state.geometry.stackMm && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-2">Geometry</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-blue-600">Stack:</span> {state.geometry.stackMm}mm</div>
                <div><span className="text-blue-600">Reach:</span> {state.geometry.reachMm}mm</div>
                {state.geometry.effectiveTopTubeMm && (
                  <div><span className="text-blue-600">ETT:</span> {state.geometry.effectiveTopTubeMm}mm</div>
                )}
                {state.geometry.seatTubeAngle && (
                  <div><span className="text-blue-600">STA:</span> {state.geometry.seatTubeAngle}°</div>
                )}
                {state.geometry.headTubeAngle && (
                  <div><span className="text-blue-600">HTA:</span> {state.geometry.headTubeAngle}°</div>
                )}
              </div>
            </div>
          )}

          {state.geometryGeeksUrl && (
            <div className="text-xs text-gray-500">
              Data source: <a href={state.geometryGeeksUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GeometryGeeks</a>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={prevStep} className="px-6 py-2 text-gray-600 hover:text-gray-800">
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Bike'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components
function GeometryField({
  label,
  unit,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  unit: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} <span className="text-gray-400">({unit})</span>
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        step={step}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingSpinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-blue-600 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function SetupRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={highlight ? 'font-semibold text-green-800' : 'font-medium text-gray-900'}>{value}</span>
    </div>
  );
}
