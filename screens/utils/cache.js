// screens/utils/cache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default TTL for hospital list — "last known" offline fallback
const TTL_MS = 1000 * 60 * 30; // 30 minutes

// ─── Generic cache helpers ────────────────────────────────────────────────────

export async function cacheSet(key, value, ttlMs = TTL_MS) {
  try {
    const payload = { value, ts: Date.now(), ttl: ttlMs };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export async function cacheGet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { value, ts, ttl } = JSON.parse(raw);
    const maxAge = ttl ?? TTL_MS;
    if (Date.now() - ts > maxAge) return null;
    return value;
  } catch {
    return null;
  }
}

export async function cacheDelete(key) {
  try { await AsyncStorage.removeItem(key); } catch {}
}

// ─── Typed cache keys ─────────────────────────────────────────────────────────

/** Hospital list for a given location + radius */
export function hospitalListKey(lat, lng, radiusKm) {
  return `hospitals_list_${lat?.toFixed(3)}_${lng?.toFixed(3)}_${radiusKm}`;
}

/** Nearest hospital result (SOS screen) */
export function nearestHospitalKey(lat, lng) {
  return `nearest_hospital_${lat?.toFixed(3)}_${lng?.toFixed(3)}`;
}

/** Last known user location */
export const USER_LOCATION_KEY = 'user_last_location';

// Cache TTLs
export const TTL_HOSPITALS = 1000 * 60 * 30;   // 30 min — hospital list
export const TTL_NEAREST   = 1000 * 60 * 15;   // 15 min — nearest result
export const TTL_LOCATION  = 1000 * 60 * 60;   // 60 min — user location
export const TTL_OSM       = 1000 * 60 * 20;   // 20 min — raw OSM results
