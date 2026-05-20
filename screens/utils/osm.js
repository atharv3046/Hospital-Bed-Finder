// screens/utils/osm.js
import { supabase } from '../../supabase';

/**
 * Fetches hospitals from OpenStreetMap (Overpass API) near a location.
 * Uses in-memory cache to avoid repeated API calls within 5 minutes.
 */

let _osmCache = { key: '', data: [], ts: 0 };
const OSM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function discoverHospitals(lat, lng, radiusKm = 10) {
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;

    // Return cached result if still fresh
    if (_osmCache.key === cacheKey && Date.now() - _osmCache.ts < OSM_CACHE_TTL) {
        return _osmCache.data;
    }

    try {
        const radiusMeters = radiusKm * 1000;
        const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error('OSM API Error:', response.status);
            return _osmCache.key === cacheKey ? _osmCache.data : [];
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('OSM API returned non-JSON:', contentType);
            return [];
        }

        const data = await response.json();

        const hospitals = (data.elements || []).map(el => {
            const name = el.tags.name || 'Unnamed Hospital';
            const address = el.tags['addr:street']
                ? `${el.tags['addr:street']}, ${el.tags['addr:city'] || ''}`
                : 'Address not available in OSM';

            const phone = el.tags['contact:phone'] || el.tags.phone || null;

            const hLat = el.lat || el.center?.lat;
            const hLng = el.lon || el.center?.lon;

            // Simple distance for sorting
            const R = 6371;
            const dLat = (hLat - lat) * Math.PI / 180;
            const dLon = (hLng - lng) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(hLat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceKm = Math.round(R * c * 10) / 10;

            return {
                name,
                address,
                phone,
                lat: hLat,
                lng: hLng,
                distance_km: distanceKm,
                type: 'General',
            };
        });

        // Cache the result
        _osmCache = { key: cacheKey, data: hospitals, ts: Date.now() };

        // Sync to Supabase in the background — don't block the UI
        if (hospitals.length > 0) {
            syncHospitalsToSupabase(hospitals).catch(() => {});
        }

        return hospitals;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('OSM request timed out');
        } else {
            console.error('OSM Discovery Error:', error);
        }
        return _osmCache.key === cacheKey ? _osmCache.data : [];
    }
}

async function syncHospitalsToSupabase(hospitals) {
    try {
        // Batch check: get all hospital names at once instead of one-by-one
        const names = hospitals.map(h => h.name);
        const { data: existing } = await supabase
            .from('hospitals')
            .select('name, lat')
            .in('name', names);

        const existingSet = new Set(
            (existing || []).map(e => `${e.name}_${(e.lat || 0).toFixed(3)}`)
        );

        // Filter to only new hospitals
        const newHospitals = hospitals.filter(
            h => !existingSet.has(`${h.name}_${(h.lat || 0).toFixed(3)}`)
        );

        // Batch insert all new hospitals at once
        if (newHospitals.length > 0) {
            await supabase.from('hospitals').insert(newHospitals);
        }
    } catch (e) {
        console.error('Sync Error:', e);
    }
}
