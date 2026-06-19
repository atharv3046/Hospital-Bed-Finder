// screens/HospitalContext.js
//
// Global preloaded hospital store. Single source of truth for:
//   • hospitals[]         — sorted array for FlatList
//   • hospitalsMap        — Map<id,hospital> for O(1) lookup (HospitalDetail)
//   • areaStats           — precomputed, never recalculated per-render
//   • openHospitals[]     — prefiltered open list
//   • fullHospitals[]     — prefiltered full list
//   • nearest             — SOS result, cached 15 min
//   • favoriteIds[]       — loaded once per session
//   • ready               — true once first data (cached or fresh) is served
//   • Stale-while-revalidate pattern
//   • 5-min foreground throttle
//
import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useRef, useState,
} from 'react';
import { AppState, InteractionManager } from 'react-native';
import {
  fetchNearbyHospitals, findNearestWithBeds,
  requestLocation, getCachedLocation,
  getAreaStats, getAvailabilityStatus, hasBedData,
} from './utils/hospitals';
import {
  cacheGet, cacheSet,
  hospitalListKey, nearestHospitalKey,
  TTL_NEAREST,
} from './utils/cache';
import { getFavoriteIds } from './utils/favorites';

const HospitalContext = createContext(null);

const RADIUS_KM = 25;
const FOREGROUND_THROTTLE_MS = 5 * 60 * 1000;

// ─── Pure: derive all computed values from a hospital list ────────────────────
// Called once per fetch, not on every render.
function deriveData(list) {
  const m = new Map();
  list.forEach(h => m.set(String(h.id), h));

  const open = list.filter(h => hasBedData(h) && getAvailabilityStatus(h) === 'open');
  const full = list.filter(h => hasBedData(h) && getAvailabilityStatus(h) === 'full');
  const limited = list.filter(h => hasBedData(h) && getAvailabilityStatus(h) === 'limited');
  const stats = getAreaStats(list);

  return { map: m, open, full, limited, stats };
}

export function HospitalProvider({ user, children }) {
  // ─── Raw state (set by loader) ────────────────────────────────────────────
  const [hospitals, setHospitals]         = useState([]);
  const [coords, setCoords]               = useState(null);
  const [nearest, setNearest]             = useState(null);
  const [favoriteIds, setFavoriteIds]     = useState([]);
  const [ready, setReady]                 = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [fromCache, setFromCache]         = useState(false);

  // ─── Precomputed derived data — rebuilt only when hospitals array changes ──
  // This is the key optimization: screens never run filter/reduce/sort
  const {
    map: hospitalsMap,
    open: openHospitals,
    full: fullHospitals,
    limited: limitedHospitals,
    stats: areaStats,
  } = useMemo(() => deriveData(hospitals), [hospitals]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const lastFetchRef = useRef(0);
  const mountedRef   = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Core loader — stale-while-revalidate ─────────────────────────────────
  const loadAll = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!mountedRef.current) return;

    // ── Phase 1: serve cached data instantly → setReady(true) ───────────────
    let location = await getCachedLocation();
    if (!location) location = await requestLocation();

    if (!location) {
      const legacyCache = await cacheGet('nearby_hospitals_cache');
      if (legacyCache?.list?.length && mountedRef.current) {
        setHospitals(legacyCache.list);
        setFromCache(true);
      }
      if (mountedRef.current) setReady(true);
      return;
    }

    if (mountedRef.current) setCoords(location);

    const listKey = hospitalListKey(location.lat, location.lng, RADIUS_KM);
    const cachedList = await cacheGet(listKey);

    if (cachedList && mountedRef.current) {
      // Paint the UI with cached data immediately
      setHospitals(cachedList);
      setFromCache(true);
      setReady(true);

      // Serve cached nearest too
      const nearestKey = nearestHospitalKey(location.lat, location.lng);
      const cachedNearest = await cacheGet(nearestKey);
      if (cachedNearest && mountedRef.current) setNearest(cachedNearest);

      // Skip background refresh if data is still fresh
      const age = Date.now() - lastFetchRef.current;
      if (!forceRefresh && age < FOREGROUND_THROTTLE_MS) {
        if (mountedRef.current) setFromCache(false);
        return;
      }
    }

    // ── Phase 2: fetch fresh data silently in the background ────────────────
    if (mountedRef.current) setRefreshing(true);
    try {
      const freshList = await fetchNearbyHospitals(location, RADIUS_KM);
      if (!mountedRef.current) return;

      setHospitals(freshList);      // triggers useMemo → rebuilds all derived data
      setFromCache(false);
      lastFetchRef.current = Date.now();

      // Cache & set nearest
      const nearestKey = nearestHospitalKey(location.lat, location.lng);
      const near = findNearestWithBeds(freshList, 'all');
      if (near) {
        await cacheSet(nearestKey, near, TTL_NEAREST);
        if (mountedRef.current) setNearest(near);
      }

      // Favorites (background, non-blocking)
      if (user?.id) {
        getFavoriteIds().then(ids => {
          if (mountedRef.current) setFavoriteIds(ids);
        });
      }

      if (mountedRef.current) setReady(true);
    } catch (err) {
      console.warn('[HospitalContext] fetch error:', err?.message);
      if (!ready && mountedRef.current) setReady(true);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [user?.id, ready]);

  // ─── Preload after first paint ────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setHospitals([]);
      setCoords(null);
      setNearest(null);
      setFavoriteIds([]);
      setReady(false);
      lastFetchRef.current = 0;
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => loadAll());
    return () => task.cancel();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Foreground refresh (throttled) ──────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && user && ready) {
        const age = Date.now() - lastFetchRef.current;
        if (age >= FOREGROUND_THROTTLE_MS) loadAll();
      }
    });
    return () => sub.remove();
  }, [user, ready, loadAll]);

  // ─── Public helpers ───────────────────────────────────────────────────────

  // O(1) lookup — HospitalDetail uses this instead of a Supabase query
  const getHospitalById = useCallback(
    id => hospitalsMap.get(String(id)) ?? null,
    [hospitalsMap]
  );

  const refresh = useCallback(() => loadAll({ forceRefresh: true }), [loadAll]);

  const updateFavorites = useCallback(async () => {
    if (!user?.id) return;
    const ids = await getFavoriteIds();
    if (mountedRef.current) setFavoriteIds(ids);
  }, [user?.id]);

  return (
    <HospitalContext.Provider value={{
      // ── Lists (for FlatList / filtering) ──────────────────────────────────
      hospitals,          // full sorted array
      openHospitals,      // prefiltered: status === 'open'
      fullHospitals,      // prefiltered: status === 'full'
      limitedHospitals,   // prefiltered: status === 'limited'

      // ── Maps (for O(1) lookup) ─────────────────────────────────────────────
      hospitalsMap,       // Map<String(id), hospital>
      getHospitalById,    // (id) => hospital | null

      // ── Precomputed stats (no filter/reduce on render) ─────────────────────
      areaStats,          // { total, registered, openCount, fullCount, … }

      // ── Other data ────────────────────────────────────────────────────────
      coords,
      nearest,
      favoriteIds,

      // ── Status ────────────────────────────────────────────────────────────
      ready,
      refreshing,
      fromCache,

      // ── Actions ───────────────────────────────────────────────────────────
      refresh,
      updateFavorites,
      setCoords,
    }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospitals() {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospitals must be used inside <HospitalProvider>');
  return ctx;
}
