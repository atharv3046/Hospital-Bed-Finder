import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import {
  useNearbyHospitals, findNearestWithBeds, formatDistance, getBedCounts, hasBedData,
  fetchNearbyHospitals, requestLocation, displayAddress,
} from './utils/hospitals';

function PulseButton({ onPress, disabled, searching }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    if (!searching && !disabled) loop.start();
    return () => loop.stop();
  }, [searching, disabled]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={s.sosBtn}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.9}
      >
        {searching ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <View style={s.sosInner}>
            <View style={s.iconCircle}>
              <MaterialCommunityIcons name="alert-octagon" size={40} color={Colors.bad} />
            </View>
            <Text style={s.sosLabel}>FIND NEAREST</Text>
            <Text style={s.sosSub}>Tap for emergency</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SOSScreen() {
  const navigation = useNavigation();
  const { hospitals, loading, coords } = useNearbyHospitals(null, 50);
  const [nearest, setNearest] = useState(null);
  const [searching, setSearching] = useState(false);

  const findNearest = async () => {
    setSearching(true);
    try {
      const c = coords || await requestLocation();
      const list = c ? await fetchNearbyHospitals(c, 50) : hospitals;
      const found = findNearestWithBeds(list, 'all');
      setNearest(found);
      if (!found) {
        const withData = list.filter(hasBedData);
        Alert.alert(
          'No beds nearby',
          withData.length
            ? 'All reporting hospitals are full. Try List view or call emergency services (112).'
            : 'No hospitals have registered bed counts yet. Ask staff to update the dashboard.'
        );
      }
    } finally {
      setSearching(false);
    }
  };

  const callHospital = () => {
    if (nearest?.phone) Linking.openURL(`tel:${nearest.phone}`);
    else Linking.openURL('tel:112');
  };

  const getDirections = () => {
    if (nearest?.lat && nearest?.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`);
    }
  };

  const openDetails = () => {
    if (!nearest || String(nearest.id).startsWith('osm-')) return;
    navigation.navigate('HospitalDetail', { hospitalId: nearest.id, hospitalData: nearest });
  };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.kicker}>EMERGENCY MODE</Text>
        <Text style={s.title}>Need a bed now?</Text>
        <Text style={s.sub}>
          Tap below to instantly locate the closest hospital with availability.
        </Text>
      </View>

      {!nearest ? (
        <View style={s.center}>
          <PulseButton onPress={findNearest} disabled={loading} searching={searching || loading} />
        </View>
      ) : (
        <View style={s.resultCard}>
          <Text style={s.closestLabel}>CLOSEST AVAILABLE</Text>
          <Text style={s.hospName}>{nearest.name}</Text>
          <Text style={s.hospAddr}>{displayAddress(nearest)}</Text>
          <Text style={s.dist}>{formatDistance(nearest.distance_km).toUpperCase()}</Text>

          <View style={s.bedRow}>
            {[
              { key: 'general', label: 'GEN' },
              { key: 'icu', label: 'ICU' },
              { key: 'oxygen', label: 'O₂' },
            ].map(({ key, label }) => {
              const c = getBedCounts(nearest)[key];
              return (
                <View key={key} style={s.bedBox}>
                  <Text style={s.bedNum}>{c.av}</Text>
                  <Text style={s.bedLbl}>{label}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={s.callBtn} onPress={callHospital} activeOpacity={0.85}>
            <MaterialCommunityIcons name="phone" size={20} color="#fff" />
            <Text style={s.callText}>CALL HOSPITAL</Text>
          </TouchableOpacity>

          <View style={s.actionRow}>
            <TouchableOpacity style={s.dirBtn} onPress={getDirections}>
              <MaterialCommunityIcons name="navigation" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={s.detailsBtn} onPress={openDetails}>
              <Text style={s.detailsText}>DETAILS</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setNearest(null)}>
            <Text style={s.searchAgain}>Search again</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.disclaimer}>
        If life-threatening, also call your local emergency number.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: Sp.md },
  header: { marginBottom: Sp.lg },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.bad, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: Colors.sub, marginTop: 8, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sosBtn: {
    width: 240, minHeight: 240, borderRadius: 120,
    backgroundColor: Colors.bad, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Sp.lg, ...Shadows.lg,
  },
  sosInner: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: Sp.md,
  },
  sosLabel: {
    color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1,
    textAlign: 'center',
  },
  sosSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 6, textAlign: 'center' },
  resultCard: {
    flex: 1, borderWidth: 2, borderColor: Colors.text, borderRadius: Radii.lg,
    padding: Sp.lg, backgroundColor: '#fff',
  },
  closestLabel: { fontSize: 11, fontWeight: '800', color: Colors.bad, letterSpacing: 1 },
  hospName: { fontSize: 24, fontWeight: '900', color: Colors.text, marginTop: 8 },
  hospAddr: { fontSize: 14, color: Colors.sub, marginTop: 6 },
  dist: { fontSize: 16, fontWeight: '900', color: Colors.text, marginTop: Sp.md },
  bedRow: { flexDirection: 'row', gap: 10, marginTop: Sp.lg },
  bedBox: { flex: 1, backgroundColor: Colors.bg, borderRadius: Radii.md, padding: Sp.md, alignItems: 'center' },
  bedNum: { fontSize: 26, fontWeight: '900', color: Colors.text },
  bedLbl: { fontSize: 11, fontWeight: '800', color: Colors.sub, marginTop: 4 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.bad, borderRadius: Radii.md, height: 52, marginTop: Sp.lg,
  },
  callText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: Sp.sm },
  dirBtn: {
    width: 52, height: 52, borderRadius: Radii.md, borderWidth: 2, borderColor: Colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  detailsBtn: {
    flex: 1, height: 52, borderRadius: Radii.md, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  detailsText: { fontWeight: '800', color: Colors.text },
  searchAgain: { textAlign: 'center', marginTop: Sp.lg, color: Colors.sub, textDecorationLine: 'underline' },
  disclaimer: { fontSize: 12, color: Colors.sub, textAlign: 'center', marginBottom: 90, marginTop: Sp.md },
});
