// screens/MapComponent.js
import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapComponent({ userLocation, hospitals }) {
    const html = useMemo(() => {
        const centerLat = userLocation?.lat || 19.0760;
        const centerLng = userLocation?.lng || 72.8777;

        const markers = hospitals.map(h => `
      L.marker([${h.lat}, ${h.lng}])
        .bindPopup("<b>${h.name}</b><br>${h.address}<br>Beds: ${h.available_beds || 0}")
        .addTo(map);
    `).join('\n');

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          const map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          // User marker
          L.circleMarker([${centerLat}, ${centerLng}], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.5,
            radius: 8
          }).bindPopup("Your Location").addTo(map);

          ${markers}
        </script>
      </body>
      </html>
    `;
    }, [userLocation, hospitals]);

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <iframe
                    srcDoc={html}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Map"
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html }}
                style={styles.map}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#eee' },
    map: { flex: 1 }
});
