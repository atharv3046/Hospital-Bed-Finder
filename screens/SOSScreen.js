import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, Alert, Animated, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { useHospitals } from './HospitalContext';
import {
  findNearestWithBeds, formatDistance, getBedCounts, hasBedData,
  fetchNearbyHospitals, requestLocation, displayAddress,
} from './utils/hospitals';

// ─── Emergency number data ────────────────────────────────────────────────────
const EMERGENCY_NUMBERS = [
  {
    number: '108',
    label: 'Ambulance',
    sublabel: 'Medical Emergency',
    icon: 'ambulance',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  {
    number: '112',
    label: 'Emergency',
    sublabel: 'National Helpline',
    icon: 'shield-alert-outline',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
];

// ─── Emergency call card — fixed layout, no text wrapping ────────────────────
function EmergencyCallButton({ number, label, sublabel, icon, color, bg, border }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  const call = () => {
    Alert.alert(
      `Call ${number}?`,
      `This will dial ${number} — ${label}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `📞 Call ${number}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${number}`) },
      ]
    );
  };

  return (
    <Animated.View style={[s.callCard, { backgroundColor: bg, borderColor: border, transform: [{ scale }] }]}>
      <TouchableOpacity
        style={s.callCardInner}
        onPress={call}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Icon */}
        <View style={[s.callIconCircle, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={22} color="#fff" />
        </View>

        {/* Text stacked vertically — prevents wrapping */}
        <View style={s.callTextCol}>
          <Text style={[s.callNumber, { color }]} numberOfLines={1}>{number}</Text>
          <Text style={s.callLabel} numberOfLines={1}>{label}</Text>
          <Text style={s.callSublabel} numberOfLines={1}>{sublabel}</Text>
        </View>

        {/* Phone icon */}
        <View style={[s.callPhoneCircle, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name="phone" size={16} color={color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Bed count chip ───────────────────────────────────────────────────────────
function BedChip({ count, label, good }) {
  const hasCount = count > 0;
  return (
    <View style={[s.bedChip, hasCount ? s.bedChipGood : s.bedChipEmpty]}>
      <Text style={[s.bedChipNum, { color: hasCount ? Colors.good : Colors.sub }]}>{count}</Text>
      <Text style={s.bedChipLabel}>{label}</Text>
    </View>
  );
}

// ─── Pulsing "Find Nearest" button ───────────────────────────────────────────
function PulseButton({ onPress, disabled, searching }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (searching || disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.8,  duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1,   duration: 800, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [searching, disabled]);

  return (
    <View style={s.pulseWrap}>
      {/* Outer glow ring */}
      <Animated.View style={[s.pulseRing, { opacity: glow }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={s.sosBtn}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.88}
        >
          {searching ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={s.sosInner}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="crosshairs-gps" size={36} color={Colors.bad} />
              </View>
              <Text style={s.sosLabel}>FIND NEAREST</Text>
              <Text style={s.sosSub}>Tap to locate beds</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ nearest, onCall, onDirections, onDetails, onReset }) {
  const beds = getBedCounts(nearest);
  const hasPhone = !!(nearest?.phone?.trim());

  return (
    <View style={s.resultCard}>
      {/* Top pill badge */}
      <View style={s.availBadge}>
        <View style={s.availDot} />
        <Text style={s.availText}>CLOSEST AVAILABLE</Text>
      </View>

      {/* Hospital name + address */}
      <Text style={s.hospName} numberOfLines={2}>{nearest.name}</Text>
      <View style={s.addrRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.sub} />
        <Text style={s.hospAddr} numberOfLines={2}>{displayAddress(nearest)}</Text>
      </View>

      {/* Distance chip */}
      <View style={s.distBadge}>
        <MaterialCommunityIcons name="map-marker-distance" size={14} color={Colors.primary} />
        <Text style={s.distText}>{formatDistance(nearest.distance_km)}</Text>
      </View>

      {/* Bed counts */}
      <View style={s.bedRow}>
        <BedChip count={beds.general.av} label="GENERAL" />
        <BedChip count={beds.icu.av}     label="ICU" />
        <BedChip count={beds.oxygen.av}  label="OXYGEN" />
      </View>

      {/* Primary action */}
      <TouchableOpacity style={s.callBtn} onPress={onCall} activeOpacity={0.85}>
        <MaterialCommunityIcons name="phone" size={20} color="#fff" />
        <Text style={s.callBtnText}>{hasPhone ? 'CALL HOSPITAL' : 'CALL 112'}</Text>
      </TouchableOpacity>

      {/* Secondary actions */}
      <View style={s.actionRow}>
        <TouchableOpacity style={s.iconActionBtn} onPress={onDirections}>
          <MaterialCommunityIcons name="navigation-variant" size={20} color={Colors.primary} />
          <Text style={s.iconActionLabel}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.iconActionBtn} onPress={onDetails}>
          <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
          <Text style={s.iconActionLabel}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.iconActionBtn} onPress={onReset}>
          <MaterialCommunityIcons name="refresh" size={20} color={Colors.sub} />
          <Text style={[s.iconActionLabel, { color: Colors.sub }]}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SOSScreen() {
  const navigation = useNavigation();
  const { hospitals, loading, coords, nearest: preloadedNearest } = useHospitals();
  const [nearest, setNearest] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (preloadedNearest && !nearest) setNearest(preloadedNearest);
  }, [preloadedNearest]);

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
            ? 'All reporting hospitals are full. Try List view or call 112.'
            : 'No hospitals have registered bed counts yet.'
        );
      }
    } finally {
      setSearching(false);
    }
  };

  const callHospital = () => {
    const phone = nearest?.phone?.trim();
    Linking.openURL(`tel:${phone || '112'}`);
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
    <ScrollView
      style={s.wrap}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.kickerRow}>
          <View style={s.kickerDot} />
          <Text style={s.kicker}>EMERGENCY MODE</Text>
        </View>
        <Text style={s.title}>Need a bed now?</Text>
        <Text style={s.sub}>Tap the button below to find the nearest available hospital.</Text>
      </View>

      {/* ── One-tap emergency calls ─────────────────────────────────────── */}
      <View style={s.emergencyRow}>
        {EMERGENCY_NUMBERS.map(n => (
          <EmergencyCallButton key={n.number} {...n} />
        ))}
      </View>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>OR FIND A BED</Text>
        <View style={s.dividerLine} />
      </View>

      {/* ── Find nearest / result ──────────────────────────────────────── */}
      {!nearest ? (
        <View style={s.center}>
          <PulseButton
            onPress={findNearest}
            disabled={loading}
            searching={searching || loading}
          />
          <Text style={s.tapHint}>
            {loading ? 'Loading hospitals…' : 'Tap to find the closest bed'}
          </Text>
        </View>
      ) : (
        <ResultCard
          nearest={nearest}
          onCall={callHospital}
          onDirections={getDirections}
          onDetails={openDetails}
          onReset={() => setNearest(null)}
        />
      )}

      {/* ── Footer disclaimer ──────────────────────────────────────────── */}
      <View style={s.footer}>
        <MaterialCommunityIcons name="information-outline" size={13} color={Colors.sub} />
        <Text style={s.disclaimer}>
          108 · Ambulance  ·  112 · National Emergency  ·  102 · Women &amp; Child
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingTop: 52, paddingHorizontal: Sp.md, paddingBottom: 110 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { marginBottom: Sp.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.bad },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.bad, letterSpacing: 1.2 },
  title: { fontSize: 27, fontWeight: '900', color: Colors.text, lineHeight: 33 },
  sub: { fontSize: 13, color: Colors.sub, marginTop: 6, lineHeight: 19 },

  // ── Emergency call cards ─────────────────────────────────────────────────────
  emergencyRow: { flexDirection: 'row', gap: 10, marginBottom: Sp.md },
  callCard: {
    flex: 1, borderRadius: Radii.lg, borderWidth: 1.5, ...Shadows.sm,
  },
  callCardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10,
  },
  callIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  callTextCol: { flex: 1, minWidth: 0 },
  callNumber: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  callLabel: { fontSize: 12, fontWeight: '700', color: '#374151', lineHeight: 15 },
  callSublabel: { fontSize: 10, fontWeight: '500', color: Colors.sub, lineHeight: 13 },
  callPhoneCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Divider ──────────────────────────────────────────────────────────────────
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, marginBottom: Sp.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.line },
  dividerText: { fontSize: 10, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },

  // ── Find nearest ─────────────────────────────────────────────────────────────
  center: { alignItems: 'center', paddingVertical: Sp.xl },
  pulseWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 2, borderColor: Colors.bad,
  },
  sosBtn: {
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: Colors.bad,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.bad,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  sosInner: { alignItems: 'center' },
  iconCircle: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  sosLabel: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  tapHint: { marginTop: 16, fontSize: 13, color: Colors.sub, textAlign: 'center' },

  // ── Result card ──────────────────────────────────────────────────────────────
  resultCard: {
    backgroundColor: '#fff', borderRadius: Radii.xl,
    padding: Sp.lg, ...Shadows.md,
    borderWidth: 1, borderColor: Colors.line,
  },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radii.pill, alignSelf: 'flex-start', marginBottom: Sp.sm,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.good },
  availText: { fontSize: 10, fontWeight: '800', color: Colors.good, letterSpacing: 1 },

  hospName: { fontSize: 21, fontWeight: '900', color: Colors.text, lineHeight: 26, marginBottom: 6 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 10 },
  hospAddr: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 18 },

  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radii.md, alignSelf: 'flex-start', marginBottom: Sp.md,
  },
  distText: { fontSize: 13, fontWeight: '800', color: Colors.primary },

  // Bed row
  bedRow: { flexDirection: 'row', gap: 8, marginBottom: Sp.lg },
  bedChip: {
    flex: 1, borderRadius: Radii.md, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  bedChipGood: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bedChipEmpty: { backgroundColor: Colors.bg, borderColor: Colors.line },
  bedChipNum: { fontSize: 24, fontWeight: '900' },
  bedChipLabel: { fontSize: 9, fontWeight: '800', color: Colors.sub, marginTop: 2, letterSpacing: 0.5 },

  // Primary CTA
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.bad, borderRadius: Radii.lg, height: 52, marginBottom: Sp.sm,
    shadowColor: Colors.bad, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  callBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  // Secondary actions — 3 equal chips
  actionRow: { flexDirection: 'row', gap: 8 },
  iconActionBtn: {
    flex: 1, height: 52, borderRadius: Radii.md,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  iconActionLabel: { fontSize: 10, fontWeight: '800', color: Colors.primary },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: Sp.lg,
  },
  disclaimer: { fontSize: 11, color: Colors.sub, textAlign: 'center', lineHeight: 16, flex: 1 },
});
