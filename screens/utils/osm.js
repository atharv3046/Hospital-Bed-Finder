// screens/utils/osm.js
import { supabase } from '../../supabase';

/**
 * Fetches hospitals from OpenStreetMap (Overpass API) near a location.
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radiusKm 
 */
export async function discoverHospitals(lat, lng, radiusKm = 10) {
    try {
        const radiusMeters = radiusKm * 1000;
        const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            console.error('OSM API Error:', response.status, text.slice(0, 100));
            return [];
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
                type: 'General', // Default
            };
        });

        // Synchronize found hospitals to Supabase
        // We attempt to upsert them using name and location as a pseudo-unique key if id is missing
        // For simplicity, we'll just insert non-existing ones
        if (hospitals.length > 0) {
            await syncHospitalsToSupabase(hospitals);
        }

        return hospitals;
    } catch (error) {
        console.error('OSM Discovery Error:', error);
        return [];
    }
}

async function syncHospitalsToSupabase(hospitals) {
    try {
        // Basic de-duplication strategy: Check if a hospital with same name exists near coords
        // Or just try to insert and let RLS/Unique constraints handle it if defined.
        // Since we don't have unique constraints on name, we'll do a soft-sync.

        // For each discovered hospital, we add it to Supabase if it's not already there.
        // This allows bed counts to be tracked.
        for (const h of hospitals) {
            const { data: existing } = await supabase
                .from('hospitals')
                .select('id')
                .eq('name', h.name)
                .gte('lat', h.lat - 0.001)
                .lte('lat', h.lat + 0.001)
                .maybeSingle();

            if (!existing) {
                await supabase.from('hospitals').insert(h);
            }
        }
    } catch (e) {
        console.error('Sync Error:', e);
    }
}
