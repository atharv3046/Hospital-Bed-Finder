import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MapComponent({ userLocation, hospitals = [], onSelectHospital }) {
  const html = useMemo(() => {
    const centerLat = userLocation?.lat || 12.9716;
    const centerLng = userLocation?.lng || 77.5946;

    const markers = hospitals
      .filter(h => h.lat && h.lng)
      .map((h, i) => {
        const name = escapeHtml(h.name);
        const addr = escapeHtml(h.address || '');
        const g = h.bed_av_general || 0;
        const icu = h.bed_av_icu || 0;
        const o2 = h.bed_av_oxygen || 0;
        return `
      const m${i} = L.marker([${h.lat}, ${h.lng}]).addTo(map);
      m${i}.bindPopup("<b>${name}</b><br>${addr}<br>G:${g} ICU:${icu} O₂:${o2}");
      m${i}.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ id: "${h.id}" }));
      });
    `;
      })
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
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
          ${markers}
        </script>
      </body>
      </html>
    `;
  }, [userLocation, hospitals]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const hospital = hospitals.find(h => h.id === data.id);
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
