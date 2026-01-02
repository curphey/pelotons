import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import type {
  Bike,
  BikeInput,
  BikeGeometry,
  BikeGeometryInput,
  BikeFitPosition,
  BikeFitPositionInput,
  BikeDrivetrain,
  BikeDrivetrainInput,
  BikeTire,
  BikeTireInput,
  ZinnMeasurements,
  ZinnMeasurementsInput,
} from '@peloton/shared';

// ============================================================================
// useBikes - Main hook for bike list management
// ============================================================================

interface UseBikesReturn {
  bikes: Bike[];
  loading: boolean;
  error: string | null;
  createBike: (data: BikeInput) => Promise<Bike | null>;
  updateBike: (id: string, data: Partial<BikeInput>) => Promise<boolean>;
  deleteBike: (id: string) => Promise<boolean>;
  setDefaultBike: (id: string) => Promise<boolean>;
  createGeometry: (bikeId: string, data: BikeGeometryInput) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useBikes(): UseBikesReturn {
  const { user } = useAuth();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBikes = useCallback(async () => {
    if (!user) {
      setBikes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBikes((data || []).map(mapDbToBike));
    } catch (err) {
      console.error('Error fetching bikes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bikes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBikes();
  }, [fetchBikes]);

  const createBike = useCallback(async (data: BikeInput): Promise<Bike | null> => {
    if (!user) return null;

    try {
      setError(null);

      const dbData = mapBikeInputToDb(data, user.id);

      const { data: result, error: insertError } = await supabase
        .from('bikes')
        .insert(dbData)
        .select()
        .single();

      if (insertError) throw insertError;

      const newBike = mapDbToBike(result);
      setBikes(prev => [newBike, ...prev]);
      return newBike;
    } catch (err) {
      console.error('Error creating bike:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bike');
      return null;
    }
  }, [user]);

  const updateBike = useCallback(async (id: string, data: Partial<BikeInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const dbData: Record<string, unknown> = {};
      if (data.name !== undefined) dbData.name = data.name;
      if (data.bikeType !== undefined) dbData.bike_type = data.bikeType;
      if (data.brand !== undefined) dbData.brand = data.brand;
      if (data.model !== undefined) dbData.model = data.model;
      if (data.year !== undefined) dbData.year = data.year;
      if (data.frameSize !== undefined) dbData.frame_size = data.frameSize;
      if (data.frameMaterial !== undefined) dbData.frame_material = data.frameMaterial;
      if (data.color !== undefined) dbData.color = data.color;
      if (data.weightKg !== undefined) dbData.weight_kg = data.weightKg;
      if (data.photoUrl !== undefined) dbData.photo_url = data.photoUrl;
      if (data.isDefault !== undefined) dbData.is_default = data.isDefault;
      if (data.isActive !== undefined) dbData.is_active = data.isActive;
      if (data.purchaseDate !== undefined) dbData.purchase_date = data.purchaseDate;
      if (data.purchasePrice !== undefined) dbData.purchase_price = data.purchasePrice;
      if (data.geometryGeeksUrl !== undefined) dbData.geometry_geeks_url = data.geometryGeeksUrl;

      const { error: updateError } = await supabase
        .from('bikes')
        .update(dbData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refetch to get updated data (including trigger-updated fields)
      await fetchBikes();
      return true;
    } catch (err) {
      console.error('Error updating bike:', err);
      setError(err instanceof Error ? err.message : 'Failed to update bike');
      return false;
    }
  }, [user, fetchBikes]);

  const deleteBike = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('bikes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setBikes(prev => prev.filter(b => b.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting bike:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bike');
      return false;
    }
  }, [user]);

  const setDefaultBike = useCallback(async (id: string): Promise<boolean> => {
    return updateBike(id, { isDefault: true });
  }, [updateBike]);

  const createGeometry = useCallback(async (bikeId: string, data: BikeGeometryInput): Promise<boolean> => {
    if (!user) {
      console.error('createGeometry: No user');
      return false;
    }

    try {
      setError(null);

      const dbData = {
        bike_id: bikeId,
        stack_mm: data.stackMm ?? null,
        reach_mm: data.reachMm ?? null,
        seat_tube_length_mm: data.seatTubeLengthMm ?? null,
        seat_tube_angle: data.seatTubeAngle ?? null,
        effective_top_tube_mm: data.effectiveTopTubeMm ?? null,
        head_tube_length_mm: data.headTubeLengthMm ?? null,
        head_tube_angle: data.headTubeAngle ?? null,
        fork_rake_mm: data.forkRakeMm ?? null,
        fork_axle_to_crown_mm: data.forkAxleToCrownMm ?? null,
        trail_mm: data.trailMm ?? null,
        chainstay_length_mm: data.chainstayLengthMm ?? null,
        wheelbase_mm: data.wheelbaseMm ?? null,
        bb_drop_mm: data.bbDropMm ?? null,
        bb_height_mm: data.bbHeightMm ?? null,
        standover_height_mm: data.standoverHeightMm ?? null,
        source: data.source ?? 'manual',
        imported_at: data.source === 'geometry_geeks' ? new Date().toISOString() : null,
      };

      console.log('createGeometry: Saving to database:', dbData);

      const { data: result, error: upsertError } = await supabase
        .from('bike_geometries')
        .upsert(dbData, { onConflict: 'bike_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('createGeometry: Database error:', upsertError);
        throw upsertError;
      }

      console.log('createGeometry: Success:', result);
      return true;
    } catch (err) {
      console.error('Error creating geometry:', err);
      setError(err instanceof Error ? err.message : 'Failed to create geometry');
      return false;
    }
  }, [user]);

  return {
    bikes,
    loading,
    error,
    createBike,
    updateBike,
    deleteBike,
    setDefaultBike,
    createGeometry,
    refetch: fetchBikes,
  };
}

// ============================================================================
// useBikeDetails - Hook for a single bike with all related data
// ============================================================================

interface UseBikeDetailsReturn {
  bike: Bike | null;
  geometry: BikeGeometry | null;
  fitPosition: BikeFitPosition | null;
  drivetrain: BikeDrivetrain | null;
  tires: BikeTire[];
  loading: boolean;
  error: string | null;
  updateGeometry: (data: BikeGeometryInput) => Promise<boolean>;
  updateFitPosition: (data: BikeFitPositionInput) => Promise<boolean>;
  updateDrivetrain: (data: BikeDrivetrainInput) => Promise<boolean>;
  updateTire: (data: BikeTireInput) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useBikeDetails(bikeId: string | null): UseBikeDetailsReturn {
  const { user } = useAuth();
  const [bike, setBike] = useState<Bike | null>(null);
  const [geometry, setGeometry] = useState<BikeGeometry | null>(null);
  const [fitPosition, setFitPosition] = useState<BikeFitPosition | null>(null);
  const [drivetrain, setDrivetrain] = useState<BikeDrivetrain | null>(null);
  const [tires, setTires] = useState<BikeTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!user || !bikeId) {
      setBike(null);
      setGeometry(null);
      setFitPosition(null);
      setDrivetrain(null);
      setTires([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [bikeRes, geoRes, fitRes, driveRes, tireRes] = await Promise.all([
        supabase.from('bikes').select('*').eq('id', bikeId).single(),
        supabase.from('bike_geometries').select('*').eq('bike_id', bikeId).maybeSingle(),
        supabase.from('bike_fit_positions').select('*').eq('bike_id', bikeId).maybeSingle(),
        supabase.from('bike_drivetrains').select('*').eq('bike_id', bikeId).maybeSingle(),
        supabase.from('bike_tires').select('*').eq('bike_id', bikeId),
      ]);

      if (bikeRes.error) throw bikeRes.error;

      setBike(mapDbToBike(bikeRes.data));
      setGeometry(geoRes.data ? mapDbToGeometry(geoRes.data) : null);
      setFitPosition(fitRes.data ? mapDbToFitPosition(fitRes.data) : null);
      setDrivetrain(driveRes.data ? mapDbToDrivetrain(driveRes.data) : null);
      setTires((tireRes.data || []).map(mapDbToTire));
    } catch (err) {
      console.error('Error fetching bike details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bike details');
    } finally {
      setLoading(false);
    }
  }, [user, bikeId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const updateGeometry = useCallback(async (data: BikeGeometryInput): Promise<boolean> => {
    if (!user || !bikeId) return false;

    try {
      setError(null);

      const dbData = {
        bike_id: bikeId,
        stack_mm: data.stackMm ?? null,
        reach_mm: data.reachMm ?? null,
        seat_tube_length_mm: data.seatTubeLengthMm ?? null,
        seat_tube_angle: data.seatTubeAngle ?? null,
        effective_top_tube_mm: data.effectiveTopTubeMm ?? null,
        head_tube_length_mm: data.headTubeLengthMm ?? null,
        head_tube_angle: data.headTubeAngle ?? null,
        fork_rake_mm: data.forkRakeMm ?? null,
        fork_axle_to_crown_mm: data.forkAxleToCrownMm ?? null,
        trail_mm: data.trailMm ?? null,
        chainstay_length_mm: data.chainstayLengthMm ?? null,
        wheelbase_mm: data.wheelbaseMm ?? null,
        bb_drop_mm: data.bbDropMm ?? null,
        bb_height_mm: data.bbHeightMm ?? null,
        standover_height_mm: data.standoverHeightMm ?? null,
        source: data.source ?? 'manual',
        imported_at: data.source === 'geometry_geeks' ? new Date().toISOString() : null,
      };

      const { data: result, error: upsertError } = await supabase
        .from('bike_geometries')
        .upsert(dbData, { onConflict: 'bike_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setGeometry(mapDbToGeometry(result));
      return true;
    } catch (err) {
      console.error('Error updating geometry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update geometry');
      return false;
    }
  }, [user, bikeId]);

  const updateFitPosition = useCallback(async (data: BikeFitPositionInput): Promise<boolean> => {
    if (!user || !bikeId) return false;

    try {
      setError(null);

      const dbData = {
        bike_id: bikeId,
        saddle_height_mm: data.saddleHeightMm ?? null,
        saddle_setback_mm: data.saddleSetbackMm ?? null,
        saddle_fore_aft_mm: data.saddleForeAftMm ?? null,
        saddle_tilt_degrees: data.saddleTiltDegrees ?? null,
        saddle_brand: data.saddleBrand ?? null,
        saddle_model: data.saddleModel ?? null,
        handlebar_reach_mm: data.handlebarReachMm ?? null,
        handlebar_drop_mm: data.handlebarDropMm ?? null,
        handlebar_width_mm: data.handlebarWidthMm ?? null,
        handlebar_brand: data.handlebarBrand ?? null,
        handlebar_model: data.handlebarModel ?? null,
        stem_length_mm: data.stemLengthMm ?? null,
        stem_angle_degrees: data.stemAngleDegrees ?? null,
        spacer_stack_mm: data.spacerStackMm ?? null,
        cleat_fore_aft_mm: data.cleatForeAftMm ?? null,
        cleat_rotation_degrees: data.cleatRotationDegrees ?? null,
        cleat_lateral_mm: data.cleatLateralMm ?? null,
        knee_angle_degrees: data.kneeAngleDegrees ?? null,
        hip_angle_degrees: data.hipAngleDegrees ?? null,
        back_angle_degrees: data.backAngleDegrees ?? null,
        fit_date: data.fitDate ?? null,
        fit_type: data.fitType ?? null,
        fit_notes: data.fitNotes ?? null,
        fitter_name: data.fitterName ?? null,
      };

      const { data: result, error: upsertError } = await supabase
        .from('bike_fit_positions')
        .upsert(dbData, { onConflict: 'bike_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setFitPosition(mapDbToFitPosition(result));
      return true;
    } catch (err) {
      console.error('Error updating fit position:', err);
      setError(err instanceof Error ? err.message : 'Failed to update fit position');
      return false;
    }
  }, [user, bikeId]);

  const updateDrivetrain = useCallback(async (data: BikeDrivetrainInput): Promise<boolean> => {
    if (!user || !bikeId) return false;

    try {
      setError(null);

      const dbData = {
        bike_id: bikeId,
        drivetrain_type: data.drivetrainType,
        groupset_brand: data.groupsetBrand ?? null,
        groupset_model: data.groupsetModel ?? null,
        electronic_shifting: data.electronicShifting ?? 'none',
        chainring_1: data.chainring1 ?? null,
        chainring_2: data.chainring2 ?? null,
        chainring_3: data.chainring3 ?? null,
        cassette_speeds: data.cassetteSpeeds ?? null,
        cassette_teeth: data.cassetteTeeth ?? null,
        crank_length_mm: data.crankLengthMm ?? null,
        crank_brand: data.crankBrand ?? null,
        crank_model: data.crankModel ?? null,
        pedal_type: data.pedalType ?? null,
        pedal_brand: data.pedalBrand ?? null,
        pedal_model: data.pedalModel ?? null,
      };

      const { data: result, error: upsertError } = await supabase
        .from('bike_drivetrains')
        .upsert(dbData, { onConflict: 'bike_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setDrivetrain(mapDbToDrivetrain(result));
      return true;
    } catch (err) {
      console.error('Error updating drivetrain:', err);
      setError(err instanceof Error ? err.message : 'Failed to update drivetrain');
      return false;
    }
  }, [user, bikeId]);

  const updateTire = useCallback(async (data: BikeTireInput): Promise<boolean> => {
    if (!user || !bikeId) return false;

    try {
      setError(null);

      const dbData = {
        bike_id: bikeId,
        position: data.position,
        brand: data.brand,
        model: data.model,
        width_mm: data.widthMm,
        tire_type: data.tireType ?? null,
        rolling_resistance_watts: data.rollingResistanceWatts ?? null,
        weight_grams: data.weightGrams ?? null,
        puncture_resistance: data.punctureResistance ?? null,
        current_pressure_psi: data.currentPressurePsi ?? null,
        recommended_pressure_psi: data.recommendedPressurePsi ?? null,
        install_date: data.installDate ?? null,
        install_distance_km: data.installDistanceKm ?? null,
        brr_url: data.brrUrl ?? null,
      };

      const { data: result, error: upsertError } = await supabase
        .from('bike_tires')
        .upsert(dbData, { onConflict: 'bike_id,position' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setTires(prev => {
        const others = prev.filter(t => t.position !== data.position);
        return [...others, mapDbToTire(result)].sort((a) =>
          a.position === 'front' ? -1 : 1
        );
      });
      return true;
    } catch (err) {
      console.error('Error updating tire:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tire');
      return false;
    }
  }, [user, bikeId]);

  return {
    bike,
    geometry,
    fitPosition,
    drivetrain,
    tires,
    loading,
    error,
    updateGeometry,
    updateFitPosition,
    updateDrivetrain,
    updateTire,
    refetch: fetchDetails,
  };
}

// ============================================================================
// useZinnMeasurements - Hook for body measurements
// ============================================================================

interface UseZinnMeasurementsReturn {
  measurements: ZinnMeasurements | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateMeasurements: (data: ZinnMeasurementsInput) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useZinnMeasurements(): UseZinnMeasurementsReturn {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<ZinnMeasurements | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeasurements = useCallback(async () => {
    if (!user) {
      setMeasurements(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('zinn_measurements')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setMeasurements(data ? mapDbToZinnMeasurements(data) : null);
    } catch (err) {
      console.error('Error fetching measurements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load measurements');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const updateMeasurements = useCallback(async (data: ZinnMeasurementsInput): Promise<boolean> => {
    if (!user) return false;

    try {
      setSaving(true);
      setError(null);

      const dbData = {
        user_id: user.id,
        inseam_mm: data.inseamMm,
        stature_height_mm: data.statureHeightMm ?? null,
        trunk_length_mm: data.trunkLengthMm ?? null,
        arm_length_mm: data.armLengthMm ?? null,
        shoulder_width_mm: data.shoulderWidthMm ?? null,
        foot_length_mm: data.footLengthMm ?? null,
        flexibility: data.flexibility ?? null,
        riding_style: data.ridingStyle ?? null,
      };

      const { data: result, error: upsertError } = await supabase
        .from('zinn_measurements')
        .upsert(dbData, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setMeasurements(mapDbToZinnMeasurements(result));
      return true;
    } catch (err) {
      console.error('Error saving measurements:', err);
      setError(err instanceof Error ? err.message : 'Failed to save measurements');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    measurements,
    loading,
    saving,
    error,
    updateMeasurements,
    refetch: fetchMeasurements,
  };
}

// ============================================================================
// Mapping functions
// ============================================================================

function mapBikeInputToDb(data: BikeInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    name: data.name,
    bike_type: data.bikeType,
    brand: data.brand ?? null,
    model: data.model ?? null,
    year: data.year ?? null,
    frame_size: data.frameSize ?? null,
    frame_material: data.frameMaterial ?? null,
    color: data.color ?? null,
    weight_kg: data.weightKg ?? null,
    photo_url: data.photoUrl ?? null,
    is_default: data.isDefault ?? false,
    is_active: data.isActive ?? true,
    purchase_date: data.purchaseDate ?? null,
    purchase_price: data.purchasePrice ?? null,
    geometry_geeks_url: data.geometryGeeksUrl ?? null,
  };
}

function mapDbToBike(row: Record<string, unknown>): Bike {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    bikeType: row.bike_type as Bike['bikeType'],
    brand: row.brand as string | null,
    model: row.model as string | null,
    year: row.year as number | null,
    frameSize: row.frame_size as string | null,
    frameMaterial: row.frame_material as Bike['frameMaterial'],
    color: row.color as string | null,
    weightKg: row.weight_kg as number | null,
    photoUrl: row.photo_url as string | null,
    isDefault: row.is_default as boolean,
    isActive: row.is_active as boolean,
    purchaseDate: row.purchase_date as string | null,
    purchasePrice: row.purchase_price as number | null,
    geometryGeeksUrl: row.geometry_geeks_url as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDbToGeometry(row: Record<string, unknown>): BikeGeometry {
  return {
    id: row.id as string,
    bikeId: row.bike_id as string,
    stackMm: row.stack_mm as number | null,
    reachMm: row.reach_mm as number | null,
    seatTubeLengthMm: row.seat_tube_length_mm as number | null,
    seatTubeAngle: row.seat_tube_angle as number | null,
    effectiveTopTubeMm: row.effective_top_tube_mm as number | null,
    headTubeLengthMm: row.head_tube_length_mm as number | null,
    headTubeAngle: row.head_tube_angle as number | null,
    forkRakeMm: row.fork_rake_mm as number | null,
    forkAxleToCrownMm: row.fork_axle_to_crown_mm as number | null,
    trailMm: row.trail_mm as number | null,
    chainstayLengthMm: row.chainstay_length_mm as number | null,
    wheelbaseMm: row.wheelbase_mm as number | null,
    bbDropMm: row.bb_drop_mm as number | null,
    bbHeightMm: row.bb_height_mm as number | null,
    standoverHeightMm: row.standover_height_mm as number | null,
    source: row.source as BikeGeometry['source'],
    importedAt: row.imported_at as string | null,
  };
}

function mapDbToFitPosition(row: Record<string, unknown>): BikeFitPosition {
  return {
    id: row.id as string,
    bikeId: row.bike_id as string,
    saddleHeightMm: row.saddle_height_mm as number | null,
    saddleSetbackMm: row.saddle_setback_mm as number | null,
    saddleForeAftMm: row.saddle_fore_aft_mm as number | null,
    saddleTiltDegrees: row.saddle_tilt_degrees as number | null,
    saddleBrand: row.saddle_brand as string | null,
    saddleModel: row.saddle_model as string | null,
    handlebarReachMm: row.handlebar_reach_mm as number | null,
    handlebarDropMm: row.handlebar_drop_mm as number | null,
    handlebarWidthMm: row.handlebar_width_mm as number | null,
    handlebarBrand: row.handlebar_brand as string | null,
    handlebarModel: row.handlebar_model as string | null,
    stemLengthMm: row.stem_length_mm as number | null,
    stemAngleDegrees: row.stem_angle_degrees as number | null,
    spacerStackMm: row.spacer_stack_mm as number | null,
    cleatForeAftMm: row.cleat_fore_aft_mm as number | null,
    cleatRotationDegrees: row.cleat_rotation_degrees as number | null,
    cleatLateralMm: row.cleat_lateral_mm as number | null,
    kneeAngleDegrees: row.knee_angle_degrees as number | null,
    hipAngleDegrees: row.hip_angle_degrees as number | null,
    backAngleDegrees: row.back_angle_degrees as number | null,
    fitDate: row.fit_date as string | null,
    fitType: row.fit_type as BikeFitPosition['fitType'],
    fitNotes: row.fit_notes as string | null,
    fitterName: row.fitter_name as string | null,
  };
}

function mapDbToDrivetrain(row: Record<string, unknown>): BikeDrivetrain {
  return {
    id: row.id as string,
    bikeId: row.bike_id as string,
    drivetrainType: row.drivetrain_type as BikeDrivetrain['drivetrainType'],
    groupsetBrand: row.groupset_brand as string | null,
    groupsetModel: row.groupset_model as string | null,
    electronicShifting: row.electronic_shifting as BikeDrivetrain['electronicShifting'],
    chainring1: row.chainring_1 as number | null,
    chainring2: row.chainring_2 as number | null,
    chainring3: row.chainring_3 as number | null,
    cassetteSpeeds: row.cassette_speeds as number | null,
    cassetteTeeth: row.cassette_teeth as number[] | null,
    crankLengthMm: row.crank_length_mm as number | null,
    crankBrand: row.crank_brand as string | null,
    crankModel: row.crank_model as string | null,
    pedalType: row.pedal_type as BikeDrivetrain['pedalType'],
    pedalBrand: row.pedal_brand as string | null,
    pedalModel: row.pedal_model as string | null,
  };
}

function mapDbToTire(row: Record<string, unknown>): BikeTire {
  return {
    id: row.id as string,
    bikeId: row.bike_id as string,
    position: row.position as BikeTire['position'],
    brand: row.brand as string,
    model: row.model as string,
    widthMm: row.width_mm as number,
    tireType: row.tire_type as BikeTire['tireType'],
    rollingResistanceWatts: row.rolling_resistance_watts as number | null,
    weightGrams: row.weight_grams as number | null,
    punctureResistance: row.puncture_resistance as number | null,
    currentPressurePsi: row.current_pressure_psi as number | null,
    recommendedPressurePsi: row.recommended_pressure_psi as number | null,
    installDate: row.install_date as string | null,
    installDistanceKm: row.install_distance_km as number | null,
    brrUrl: row.brr_url as string | null,
  };
}

function mapDbToZinnMeasurements(row: Record<string, unknown>): ZinnMeasurements {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    inseamMm: row.inseam_mm as number,
    statureHeightMm: row.stature_height_mm as number | null,
    trunkLengthMm: row.trunk_length_mm as number | null,
    armLengthMm: row.arm_length_mm as number | null,
    shoulderWidthMm: row.shoulder_width_mm as number | null,
    footLengthMm: row.foot_length_mm as number | null,
    flexibility: row.flexibility as ZinnMeasurements['flexibility'],
    ridingStyle: row.riding_style as ZinnMeasurements['ridingStyle'],
  };
}
