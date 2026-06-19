// screens/utils/osm.js
import { supabase } from '../../supabase';
import { cacheGet, cacheSet, TTL_OSM } from './cache';

/**
 * Fetches hospitals from OpenStreetMap (Overpass API) near a location.
 *
 * Two-tier cache:
 *   1. In-memory  — instant, no I/O (cleared on app restart)
 *   2. AsyncStorage — survives restarts, 20-minute TTL
 *
 * POST-only to avoid 406 errors from large GET query strings.
 */

// In-memory cache (level-1)
let _memCache = { key: '', data: [], ts: 0 };
const MEM_TTL = 5 * 60 * 1000; // 5 minutes

// POST-only Overpass API endpoints (ordered by reliability)
const OSM_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

function osmCacheKey(lat, lng, radiusKm) {
  return `osm_hospitals_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;
}

async function postWithTimeout(url, queryBody, timeoutMs = 28000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: `data=${encodeURIComponent(queryBody)}`,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function discoverHospitals(lat, lng, radiusKm = 10) {
  const cacheKey = osmCacheKey(lat, lng, radiusKm);
  const storageKey = cacheKey; // same key used for AsyncStorage

  // ── Level-1: in-memory cache ──────────────────────────────────────────────
  if (_memCache.key === cacheKey && Date.now() - _memCache.ts < MEM_TTL) {
    return _memCache.data;
  }

  // ── Level-2: AsyncStorage cache (20 min TTL) ─────────────────────────────
  const stored = await cacheGet(storageKey);
  if (stored) {
    _memCache = { key: cacheKey, data: stored, ts: Date.now() };
    return stored;
  }

  // ── Level-3: Live Overpass API fetch ─────────────────────────────────────
  const radiusMeters = radiusKm * 1000;
  const query = `[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
);
out center;`;

  let response = null;
  let lastError = null;

  for (const url of OSM_ENDPOINTS) {
    try {
      const res = await postWithTimeout(url, query, 28000);
      if (res.ok) {
        response = res;
        break;
      } else {
        console.warn(`OSM Server ${new URL(url).hostname} returned status: ${res.status}`);
        lastError = `Status ${res.status}`;
      }
    } catch (err) {
      const reason = err.name === 'AbortError' ? 'timed out' : err.message;
      console.warn(`OSM Server ${new URL(url).hostname} failed: ${reason}`);
      lastError = reason;
    }
  }

  if (!response) {
    console.error('All OSM API endpoints failed. Last error:', lastError);
    // Return stale in-memory data rather than empty
    return _memCache.data.length > 0 ? _memCache.data : [];
  }

  try {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('OSM API returned non-JSON response:', contentType);
      return _memCache.data.length > 0 ? _memCache.data : [];
    }

    const data = await response.json();

    const hospitals = (data.elements || []).map(el => {
      const name = el.tags.name || 'Unnamed Hospital';
      const parts = [
        el.tags['addr:housenumber'],
        el.tags['addr:street'],
        el.tags['addr:suburb'] || el.tags['addr:neighbourhood'],
        el.tags['addr:city'] || el.tags['addr:town'] || el.tags['addr:village'],
        el.tags['addr:state'],
      ].filter(Boolean);
      const address = parts.length > 0
        ? parts.join(', ')
        : (el.tags['addr:full'] || null);

      const phone = el.tags['contact:phone'] || el.tags.phone || null;
      const hLat = el.lat || el.center?.lat;
      const hLng = el.lon || el.center?.lon;

      // Haversine distance
      const R = 6371;
      const dLat = (hLat - lat) * Math.PI / 180;
      const dLon = (hLng - lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(hLat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;

      return {
        name,
        address: address || null,
        phone,
        lat: hLat,
        lng: hLng,
        distance_km: distanceKm,
        type: 'General',
      };
    });

    // Update both cache levels
    _memCache = { key: cacheKey, data: hospitals, ts: Date.now() };
    await cacheSet(storageKey, hospitals, TTL_OSM);

    // Sync new hospitals to Supabase in background — don't block the UI
    if (hospitals.length > 0) {
      syncHospitalsToSupabase(hospitals).catch(() => {});
    }

    return hospitals;
  } catch (error) {
    console.error('OSM parse error:', error);
    return _memCache.data.length > 0 ? _memCache.data : [];
  }
}

async function syncHospitalsToSupabase(hospitals) {
  try {
    const names = hospitals.map(h => h.name);
    const { data: existing } = await supabase
      .from('hospitals')
      .select('name, lat')
      .in('name', names);

    const existingSet = new Set(
      (existing || []).map(e => `${e.name}_${(e.lat || 0).toFixed(3)}`)
    );

    const newHospitals = hospitals.filter(
      h => !existingSet.has(`${h.name}_${(h.lat || 0).toFixed(3)}`)
    );

    if (newHospitals.length > 0) {
      await supabase.from('hospitals').insert(newHospitals);
    }
  } catch (e) {
    console.error('Sync Error:', e);
  }
}
