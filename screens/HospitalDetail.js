import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, Alert, ScrollView, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { Badge, BedProgressBar } from './ui/kit';
import { useHospitals } from './HospitalContext';
import {
  getAvailabilityStatus, STATUS_LABELS, STATUS_TONES, getBedCounts,
  hasBedData, displayAddress, formatLastUpdated, isPersistentlyFull,
  formatDistance,
} from './utils/hospitals';

const BED_TYPES = [
  { key: 'general', label: 'General Beds',  icon: 'bed',              avKey: 'bed_av_general',  totalKey: 'bed_total_general'  },
  { key: 'icu',     label: 'ICU Beds',       icon: 'heart-pulse',      avKey: 'bed_av_icu',      totalKey: 'bed_total_icu'      },
  { key: 'oxygen',  label: 'Oxygen Beds',    icon: 'lungs',            avKey: 'bed_av_oxygen',   totalKey: 'bed_total_oxygen'   },
];

// ─── Single bed card ──────────────────────────────────────────────────────────
function BedCard({ label, icon, count, total, registered }) {
  const hasData  = registered && total > 0;
  const pct      = hasData ? count / total : 0;
  const toneColor = !hasData ? Colors.sub : count > 0 ? Colors.good : Colors.bad;

  return (
    <View style={d.bedCard}>
      <View style={d.bedCardTop}>
        <View style={[d.bedIconCircle, { backgroundColor: toneColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={18} color={toneColor} />
        </View>
        <Text style={d.bedLabel}>{label}</Text>
        {hasData && count > 0 && (
          <View style={d.bedAvailBadge}>
            <Text style={d.bedAvailText}>AVAILABLE</Text>
          </View>
        )}
      </View>
      <View style={d.bedCountRow}>
        <Text style={[d.bedAv, { color: toneColor }]}>
          {registered ? count : '—'}
        </Text>
        <Text style={d.bedTotal}> / {registered ? total : '—'}</Text>
      </View>
      <BedProgressBar
        available={count}
        total={total}
        height={8}
        style={{ marginTop: 8 }}
        unknown={!hasData}
      />
    </View>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, text, color }) {
  if (!text) return null;
  return (
    <View style={d.infoRow}>
      <MaterialCommunityIcons name={icon} size={15} color={color || Colors.sub} />
      <Text style={[d.infoText, color && { color }]}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HospitalDetail({ route, navigation }) {
  const { hospitalId, hospitalData } = route.params;
  const { getHospitalById } = useHospitals();

  const isOsm       = typeof hospitalId === 'string' && hospitalId.startsWith('osm-');
  const isValidUUID = !isOsm && /^[0-9a-f-]{36}$/i.test(String(hospitalId));

  // ── Seed from context map (instant) or route params ──────────────────────
  // Priority: context map > route params > null (triggers Supabase fetch)
  const seedData = getHospitalById(hospitalId) ?? hospitalData ?? null;
  const [h, setH] = useState(seedData);
  const [liveUpdated, setLiveUpdated] = useState(false); // true after first live update

  useEffect(() => { if (isOsm) navigation.goBack(); }, [isOsm]);

  // ── Supabase fetch — only runs if hospital NOT in context map ─────────────
  const fetchFromSupabase = async () => {
    if (!isValidUUID) return;
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', hospitalId)
      .maybeSingle();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) setH(data);
  };

  useEffect(() => {
    // If we already have data from the context map, skip the initial fetch
    if (!seedData && isValidUUID) {
      fetchFromSupabase();
    }

    // Always subscribe for real-time bed count updates
    if (!isValidUUID) return;
    const channel = supabase
      .channel(`hospital-detail-${hospitalId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hospitals',
        filter: `id=eq.${hospitalId}`,
      }, payload => {
        if (payload.new) {
          setH(payload.new);        // apply live update directly from payload
          setLiveUpdated(true);     // show "just updated" indicator
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [hospitalId]);

  // ─── Loading state (only if we had no cached data at all) ─────────────────
  if (!h) {
    return (
      <View style={d.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={d.loadingText}>Loading hospital…</Text>
      </View>
    );
  }

  const status    = getAvailabilityStatus(h);
  const counts    = getBedCounts(h);
  const registered = hasBedData(h);
  const persistent = isPersistentlyFull(h);
  const updated    = liveUpdated ? 'Updated just now' : formatLastUpdated(h.updated_at);

  const callNow = () => {
    const phone = h.phone?.trim();
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('No phone listed', 'This hospital has not registered a phone number.');
  };

  const directions = () => {
    if (h.lat && h.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`);
    } else {
      Alert.alert('No coordinates', 'GPS location not available for this hospital.');
    }
  };

  return (
    <View style={d.wrap}>
      <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <View style={d.hero}>
          <TouchableOpacity style={d.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>

          {/* Live badge — visible after a real-time update */}
          {liveUpdated && (
            <View style={d.liveBadge}>
              <View style={d.liveDot} />
              <Text style={d.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <View style={d.identityWrap}>
          <Text style={d.kicker}>HOSPITAL DETAILS</Text>
          <View style={d.nameRow}>
            <Text style={d.name} numberOfLines={3}>{h.name}</Text>
            <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
          </View>

          {/* Info rows */}
          <InfoRow icon="map-marker-outline" text={displayAddress(h)} />
          {h.distance_km != null && (
            <InfoRow icon="map-marker-distance" text={formatDistance(h.distance_km)} color={Colors.primary} />
          )}
          <InfoRow icon="phone-outline" text={h.phone} />
          {updated && <InfoRow icon="clock-outline" text={updated} />}
          {persistent && (
            <View style={d.warnBanner}>
              <MaterialCommunityIcons name="alert" size={16} color={Colors.warn} />
              <Text style={d.warnText}>Full for 2+ hours — consider calling ahead</Text>
            </View>
          )}
        </View>

        {/* ── Bed availability ──────────────────────────────────────────── */}
        <Text style={d.section}>BED AVAILABILITY</Text>
        {BED_TYPES.map(({ key, label, icon }) => {
          const c = counts[key];
          return (
            <BedCard
              key={key}
              label={label}
              icon={icon}
              count={c.av}
              total={c.total}
              registered={registered}
            />
          );
        })}

        {!registered && (
          <View style={d.noDataBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.sub} />
            <Text style={d.noDataText}>
              Bed counts not yet registered. Staff can update via the dashboard.
            </Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      <View style={d.footer}>
        <TouchableOpacity style={d.dirBtn} onPress={directions} activeOpacity={0.85}>
          <MaterialCommunityIcons name="navigation-variant" size={20} color={Colors.primary} />
          <Text style={d.dirText}>DIRECTIONS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={d.callBtn} onPress={callNow} activeOpacity={0.85}>
          <MaterialCommunityIcons name="phone" size={20} color="#fff" />
          <Text style={d.callText}>CALL NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  wrap:    { flex: 1, backgroundColor: Colors.bg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.sub, fontSize: 14 },
  scroll:  { paddingBottom: Sp.xl },

  // Hero
  hero: {
    height: 160, marginBottom: 0,
    backgroundColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: Sp.md, paddingTop: 52,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.good, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Identity
  identityWrap: {
    backgroundColor: '#fff', marginHorizontal: Sp.md,
    marginTop: -24, borderRadius: Radii.xl, padding: Sp.lg,
    ...Shadows.md, marginBottom: Sp.md,
  },
  kicker:  { fontSize: 10, fontWeight: '800', color: Colors.sub, letterSpacing: 1.2, marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: Sp.sm },
  name:    { fontSize: 22, fontWeight: '900', color: Colors.text, flex: 1, lineHeight: 28 },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  infoText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 18 },

  // Warn
  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: Radii.md, padding: Sp.sm,
    marginTop: Sp.sm, borderWidth: 1, borderColor: '#FDE68A',
  },
  warnText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.warn },

  // Section header
  section: {
    fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1,
    marginBottom: Sp.sm, paddingHorizontal: Sp.md,
  },

  // Bed card
  bedCard: {
    backgroundColor: '#fff', borderRadius: Radii.lg,
    padding: Sp.md, marginHorizontal: Sp.md, marginBottom: Sp.sm,
    ...Shadows.sm,
  },
  bedCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bedIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bedLabel:      { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  bedAvailBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.pill, borderWidth: 1, borderColor: '#BBF7D0' },
  bedAvailText:  { fontSize: 9, fontWeight: '800', color: Colors.good, letterSpacing: 0.8 },
  bedCountRow:   { flexDirection: 'row', alignItems: 'baseline' },
  bedAv:         { fontSize: 38, fontWeight: '900', lineHeight: 44 },
  bedTotal:      { fontSize: 20, color: Colors.sub, fontWeight: '600' },

  // No data
  noDataBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: Radii.lg,
    padding: Sp.md, marginHorizontal: Sp.md, marginTop: Sp.sm,
    borderWidth: 1, borderColor: Colors.line,
  },
  noDataText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 18 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    padding: Sp.md, paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: Colors.line,
    ...Shadows.md,
  },
  dirBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: Radii.lg,
    borderWidth: 2, borderColor: Colors.primary,
  },
  dirText:  { fontWeight: '800', color: Colors.primary, fontSize: 13 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: Radii.lg,
    backgroundColor: Colors.bad,
    shadowColor: Colors.bad, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  callText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
