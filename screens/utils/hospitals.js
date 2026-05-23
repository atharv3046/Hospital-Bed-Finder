import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../supabase.js';
import { discoverHospitals } from './osm.js';

export const BED_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'general', label: 'GENERAL' },
  { key: 'icu', label: 'ICU' },
  { key: 'oxygen', label: 'OXYGEN' },
];

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(km < 10 ? 2 : 1)} km away`;
}

export function getBedCounts(h) {
  return {
    general: { av: h.bed_av_general || 0, total: h.bed_total_general || 0 },
    icu: { av: h.bed_av_icu || 0, total: h.bed_total_icu || 0 },
    oxygen: { av: h.bed_av_oxygen || 0, total: h.bed_total_oxygen || 0 },
  };
}

export function totalAvailable(h, filter = 'all') {
  const c = getBedCounts(h);
  if (filter === 'general') return c.general.av;
  if (filter === 'icu') return c.icu.av;
  if (filter === 'oxygen') return c.oxygen.av;
  return c.general.av + c.icu.av + c.oxygen.av;
}

export function getAvailabilityStatus(h, filter = 'all') {
  const c = getBedCounts(h);
  let av = 0;
  let total = 0;
  if (filter === 'general') {
    av = c.general.av; total = c.general.total;
  } else if (filter === 'icu') {
    av = c.icu.av; total = c.icu.total;
  } else if (filter === 'oxygen') {
    av = c.oxygen.av; total = c.oxygen.total;
  } else {
    av = c.general.av + c.icu.av + c.oxygen.av;
    total = c.general.total + c.icu.total + c.oxygen.total;
  }
  if (av <= 0) return 'full';
  if (total > 0 && av / total <= 0.25) return 'limited';
  return 'open';
}

export const STATUS_LABELS = { open: 'AVAILABLE', limited: 'LIMITED', full: 'FULL' };
export const STATUS_TONES = { open: 'good', limited: 'warn', full: 'bad' };

export function filterByBedType(list, filter) {
  if (!filter || filter === 'all') return list;
  const key = filter === 'general' ? 'bed_av_general' : filter === 'icu' ? 'bed_av_icu' : 'bed_av_oxygen';
  return list.filter(h => (h[key] || 0) > 0);
}

export function sortByDistance(list) {
  return [...list].sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
}

export function findNearestWithBeds(list, filter = 'all') {
  const withBeds = filterByBedType(list, filter).filter(h => getAvailabilityStatus(h, filter) !== 'full');
  return sortByDistance(withBeds)[0] || null;
}

export async function requestLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

export async function fetchNearbyHospitals(coords, radiusKm = 25) {
  if (!coords?.lat) return [];

  const [osmResult, dbResult] = await Promise.allSettled([
    discoverHospitals(coords.lat, coords.lng, radiusKm),
    supabase.rpc('nearby_hospitals', {
      user_lat: coords.lat,
      user_lng: coords.lng,
      radius_km: parseFloat(radiusKm),
    }),
  ]);

  const osmHospitals = osmResult.status === 'fulfilled' ? osmResult.value : [];
  const dbHospitals = dbResult.status === 'fulfilled' ? (dbResult.value?.data || []) : [];

  const combined = [...dbHospitals];
  const dbNames = new Set(combined.map(h => h.name.toLowerCase()));
  osmHospitals.forEach(oh => {
    if (!dbNames.has(oh.name.toLowerCase())) {
      combined.push({
        ...oh,
        id: `osm-${oh.lat}-${oh.lng}`,
        bed_av_icu: 0,
        bed_av_oxygen: 0,
        bed_av_general: 0,
        bed_total_icu: 0,
        bed_total_oxygen: 0,
        bed_total_general: 0,
      });
    }
  });

  return sortByDistance(combined);
}

export function useNearbyHospitals(initialCoords = null, radiusKm = 25) {
  const [coords, setCoords] = useState(initialCoords);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (c = coords, showRefresh = false) => {
    let target = c;
    if (!target?.lat) {
      target = await requestLocation();
      if (target) setCoords(target);
    }
    if (!target?.lat) {
      setError('Location permission required');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const list = await fetchNearbyHospitals(target, radiusKm);
      setHospitals(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coords, radiusKm]);

  useEffect(() => {
    load(initialCoords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coords?.lat) return undefined;
    const channel = supabase
      .channel('hospitals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        load(coords, true);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [coords?.lat, coords?.lng]);

  return {
    coords,
    setCoords,
    hospitals,
    loading,
    refreshing,
    error,
    refresh: () => load(coords, true),
    reload: load,
  };
}
