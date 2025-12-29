import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import type { AthleteProfile, AthleteProfileInput } from '@peloton/shared';

interface UseAthleteProfileReturn {
  profile: AthleteProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateProfile: (data: AthleteProfileInput) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useAthleteProfile(): UseAthleteProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // No profile exists yet - that's okay
        if (fetchError.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(mapDbToProfile(data));
      }
    } catch (err) {
      console.error('Error fetching athlete profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (data: AthleteProfileInput): Promise<boolean> => {
    if (!user) return false;

    try {
      setSaving(true);
      setError(null);

      const dbData = {
        user_id: user.id,
        display_name: data.displayName ?? null,
        date_of_birth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        weight_kg: data.weightKg ?? null,
        height_cm: data.heightCm ?? null,
        ftp_watts: data.ftpWatts ?? null,
        max_hr_bpm: data.maxHrBpm ?? null,
        resting_hr_bpm: data.restingHrBpm ?? null,
        lthr_bpm: data.lthrBpm ?? null,
        unit_system: data.unitSystem ?? 'metric',
        updated_at: new Date().toISOString(),
      };

      // Upsert - create if doesn't exist, update if it does
      const { data: result, error: upsertError } = await supabase
        .from('athlete_profiles')
        .upsert(dbData, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setProfile(mapDbToProfile(result));
      return true;
    } catch (err) {
      console.error('Error saving athlete profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    profile,
    loading,
    saving,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}

// Map database row to AthleteProfile type
function mapDbToProfile(row: Record<string, unknown>): AthleteProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string | null,
    dateOfBirth: row.date_of_birth as string | null,
    gender: row.gender as AthleteProfile['gender'],
    weightKg: row.weight_kg as number | null,
    heightCm: row.height_cm as number | null,
    ftpWatts: row.ftp_watts as number | null,
    maxHrBpm: row.max_hr_bpm as number | null,
    restingHrBpm: row.resting_hr_bpm as number | null,
    lthrBpm: row.lthr_bpm as number | null,
    unitSystem: (row.unit_system as 'metric' | 'imperial') ?? 'metric',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
