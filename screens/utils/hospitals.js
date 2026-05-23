import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../supabase.js';
import { discoverHospitals } from './osm.js';
import { cacheGet, cacheSet } from './cache.js';

export const BED_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'general', label: 'GENERAL' },
  { key: 'icu', label: 'ICU' },
  { key: 'oxygen', label: 'OXYGEN' },
];

export const MARKER_COLORS = {
  open: '#22C55E',
  limited: '#F59E0B',
  full: '#EF4444',
  unknown: '#94A3B8',
};

const OSM_ADDR_PLACEHOLDER = 'address not available in osm';

export function isOsmId(id) {
  return typeof id === 'string' && id.startsWith('osm-');
}

export function hasBedData(h) {
  const c = getBedCounts(h);
  return c.general.total + c.icu.total + c.oxygen.total > 0;
}

export function formatAddress(h) {
  const addr = (h?.address || '').trim();
  if (!addr || addr.toLowerCase().includes(OSM_ADDR_PLACEHOLDER)) {
    return h?.address_manual || null;
  }
  return addr;
}

export function displayAddress(h) {
  return formatAddress(h) || 'Address not registered — staff can add one';
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(km < 10 ? 2 : 1)} km away`;
}

export function formatLastUpdated(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${d.toLocaleDateString()}`;
}

export function hoursSinceUpdate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

/** Warn when registered hospital has been at 0 beds for 2+ hours */
export function isPersistentlyFull(h) {
  if (!hasBedData(h)) return false;
  const av = totalAvailable(h);
  if (av > 0) return false;
  const hrs = hoursSinceUpdate(h.updated_at);
  return hrs != null && hrs >= 2;
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
  if (!hasBedData(h)) return 'unknown';

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

export const STATUS_LABELS = {
  open: 'AVAILABLE',
  limited: 'LIMITED',
  full: 'FULL',
  unknown: 'NO DATA',
};
export const STATUS_TONES = {
  open: 'good',
  limited: 'warn',
  full: 'bad',
  unknown: 'neutral',
};

export function getAreaStats(hospitals) {
  const registered = hospitals.filter(hasBedData);
  const full = registered.filter(h => getAvailabilityStatus(h) === 'full');
  const open = registered.filter(h => getAvailabilityStatus(h) === 'open');
  const limited = registered.filter(h => getAvailabilityStatus(h) === 'limited');
  const noData = hospitals.filter(h => !hasBedData(h));
  const totalBeds = registered.reduce((sum, h) => sum + totalAvailable(h), 0);
  const persistentlyFull = registered.filter(isPersistentlyFull);

  return {
    total: hospitals.length,
    registered: registered.length,
    fullCount: full.length,
    openCount: open.length,
    limitedCount: limited.length,
    noDataCount: noData.length,
    totalBedsAvailable: totalBeds,
    persistentlyFull,
  };
}

export function filterByBedType(list, filter) {
  if (!filter || filter === 'all') return list;
  const key = filter === 'general' ? 'bed_av_general' : filter === 'icu' ? 'bed_av_icu' : 'bed_av_oxygen';
  return list.filter(h => !hasBedData(h) || (h[key] || 0) > 0);
}

export function sortByDistance(list) {
  return [...list].sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
}

export function findNearestWithBeds(list, filter = 'all') {
  const eligible = list.filter(h => hasBedData(h) && getAvailabilityStatus(h, filter) !== 'full');
  const withBeds = filterByBedType(eligible, filter);
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
  const dbKeys = new Set(combined.map(h => `${h.name.toLowerCase()}_${(h.lat || 0).toFixed(3)}`));
  osmHospitals.forEach(oh => {
    const key = `${oh.name.toLowerCase()}_${(oh.lat || 0).toFixed(3)}`;
    if (!dbKeys.has(key)) {
      combined.push({
        ...oh,
        id: `osm-${oh.lat}-${oh.lng}`,
        bed_av_icu: null,
        bed_av_oxygen: null,
        bed_av_general: null,
        bed_total_icu: 0,
        bed_total_oxygen: 0,
        bed_total_general: 0,
        is_osm: true,
      });
    }
  });

  return sortByDistance(combined);
}

const CACHE_KEY = 'nearby_hospitals_cache';

export function useNearbyHospitals(initialCoords = null, radiusKm = 25) {
  const [coords, setCoords] = useState(initialCoords);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (c = coords, showRefresh = false) => {
    let target = c;
    if (!target?.lat) {
      target = await requestLocation();
      if (target) setCoords(target);
    }
    if (!target?.lat) {
      const cached = await cacheGet(CACHE_KEY);
      if (cached?.list?.length) {
        setHospitals(cached.list);
        setFromCache(true);
      }
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
      setFromCache(false);
      await cacheSet(CACHE_KEY, { list, coords: target, at: new Date().toISOString() });
    } catch (e) {
      const cached = await cacheGet(CACHE_KEY);
      if (cached?.list?.length) {
        setHospitals(cached.list);
        setFromCache(true);
      } else {
        setError(e.message);
      }
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
    fromCache,
    refresh: () => load(coords, true),
    reload: load,
  };
}
