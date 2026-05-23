import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { getAvailabilityStatus, MARKER_COLORS, displayAddress, hasBedData } from './utils/hospitals';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusColor(h) {
  return MARKER_COLORS[getAvailabilityStatus(h)] || MARKER_COLORS.unknown;
}

export default function MapComponent({ userLocation, hospitals = [], onSelectHospital }) {
  const html = useMemo(() => {
    const centerLat = userLocation?.lat || 12.9716;
    const centerLng = userLocation?.lng || 77.5946;

    const markerDefs = hospitals
      .filter(h => h.lat && h.lng)
      .map((h, i) => {
        const color = statusColor(h);
        const name = escapeHtml(h.name);
        const addr = escapeHtml(displayAddress(h));
        const g = hasBedData(h) ? (h.bed_av_general ?? 0) : '—';
        const icu = hasBedData(h) ? (h.bed_av_icu ?? 0) : '—';
        const o2 = hasBedData(h) ? (h.bed_av_oxygen ?? 0) : '—';
        const status = getAvailabilityStatus(h).toUpperCase();
        const id = escapeHtml(String(h.id));
        return `
      const icon${i} = L.divIcon({
        className: 'pin-${i}',
        html: '<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      const m${i} = L.marker([${h.lat}, ${h.lng}], { icon: icon${i} });
      m${i}.bindPopup("<b>${name}</b><br><span style='color:${color};font-weight:700'>${status}</span><br>${addr}<br>G:${g} ICU:${icu} O₂:${o2}");
      m${i}.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ id: "${id}" }));
      });
      markers.addLayer(m${i});
    `;
      })
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .marker-cluster-small { background-color: rgba(34, 197, 94, 0.35); }
          .marker-cluster-medium { background-color: rgba(245, 158, 11, 0.4); }
          .marker-cluster-large { background-color: rgba(239, 68, 68, 0.4); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${centerLat}, ${centerLng}], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          L.circleMarker([${centerLat}, ${centerLng}], {
            color: '#0B4D73', fillColor: '#1A7DA8', fillOpacity: 0.6, radius: 10
          }).bindPopup("You are here").addTo(map);
          const markers = L.markerClusterGroup({ maxClusterRadius: 50, spiderfyOnMaxZoom: true });
          ${markerDefs}
          map.addLayer(markers);
          if (markers.getLayers().length) {
            try { map.fitBounds(markers.getBounds().pad(0.15)); } catch(e) {}
          }
        </script>
      </body>
      </html>
    `;
  }, [userLocation, hospitals]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const hospital = hospitals.find(h => String(h.id) === String(data.id));
      if (hospital && onSelectHospital) onSelectHospital(hospital);
    } catch { /* ignore */ }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Hospital map"
        />
      </View>
    );
  }

  let WebView;
  try {
    WebView = require('react-native-webview').WebView;
  } catch {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EEF2' },
  map: { flex: 1 },
});
