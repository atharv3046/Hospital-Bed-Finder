import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../supabase.js';
import { discoverHospitals } from './osm.js';
import {
  cacheGet, cacheSet,
  hospitalListKey, nearestHospitalKey,
  USER_LOCATION_KEY,
  TTL_HOSPITALS, TTL_NEAREST, TTL_LOCATION,
} from './cache.js';

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

/**
 * Request device location.
 * Caches the last known position for 60 min so subsequent screens load
 * instantly without re-requesting the GPS fix.
 */
export async function requestLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Location Required',
      'Please enable location access in your device settings to find nearby hospitals.',
    );
    return null;
  }
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
  // Cache last known location so other screens can skip the GPS wait
  await cacheSet(USER_LOCATION_KEY, coords, TTL_LOCATION);
  return coords;
}

/** Returns cached location immediately (no GPS wait) */
export async function getCachedLocation() {
  return cacheGet(USER_LOCATION_KEY);
}

export async function fetchNearbyHospitals(coords, radiusKm = 25) {
  if (!coords?.lat) return [];

  // Check hospital-list cache first (30 min TTL)
  const listKey = hospitalListKey(coords.lat, coords.lng, radiusKm);
  const cached = await cacheGet(listKey);
  if (cached) return cached;

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
  const dbKeys = new Set(combined.map(h => `${(h.name || '').toLowerCase()}_${(h.lat || 0).toFixed(3)}`));
  osmHospitals.forEach(oh => {
    const key = `${(oh.name || '').toLowerCase()}_${(oh.lat || 0).toFixed(3)}`;
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

  const sorted = sortByDistance(combined);

  // Cache the merged result
  await cacheSet(listKey, sorted, TTL_HOSPITALS);

  return sorted;
}

/**
 * Find and cache the nearest hospital with available beds.
 * Used by SOS screen — avoids re-running the search on re-renders.
 */
export async function fetchNearestHospital(coords, filter = 'all') {
  if (!coords?.lat) return null;

  const key = nearestHospitalKey(coords.lat, coords.lng);
  const cached = await cacheGet(key);
  if (cached) return cached;

  const list = await fetchNearbyHospitals(coords, 50);
  const nearest = findNearestWithBeds(list, filter);

  if (nearest) {
    await cacheSet(key, nearest, TTL_NEAREST);
  }
  return nearest;
}

// ─── Fallback cache key for useNearbyHospitals (generic offline backup) ──────
const LEGACY_CACHE_KEY = 'nearby_hospitals_cache';

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
      // Try the persisted location first — avoids GPS round-trip
      target = await getCachedLocation();
      if (!target) {
        target = await requestLocation();
      }
      if (target) setCoords(target);
    }

    if (!target?.lat) {
      const cached = await cacheGet(LEGACY_CACHE_KEY);
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

      // Detect if we got a fresh API result or served from cache
      const listKey = hospitalListKey(target.lat, target.lng, radiusKm);
      const isCached = !!(await cacheGet(listKey)); // will be true since we just set it
      setFromCache(false); // data is fresh/valid — not stale offline copy

      // Keep legacy cache as offline backup
      await cacheSet(LEGACY_CACHE_KEY, { list, coords: target, at: new Date().toISOString() });
    } catch (e) {
      const cached = await cacheGet(LEGACY_CACHE_KEY);
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
