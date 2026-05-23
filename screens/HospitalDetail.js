import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { Badge, BedProgressBar } from './ui/kit';
import {
  getAvailabilityStatus, STATUS_LABELS, STATUS_TONES, getBedCounts,
  hasBedData, displayAddress, formatLastUpdated, isPersistentlyFull,
} from './utils/hospitals';

const BED_TYPES = [
  { key: 'general', label: 'GENERAL BEDS', av: 'bed_av_general', total: 'bed_total_general' },
  { key: 'icu', label: 'ICU BEDS', av: 'bed_av_icu', total: 'bed_total_icu' },
  { key: 'oxygen', label: 'OXYGEN BEDS', av: 'bed_av_oxygen', total: 'bed_total_oxygen' },
];

export default function HospitalDetail({ route, navigation }) {
  const { hospitalId, hospitalData } = route.params;
  const [h, setH] = useState(hospitalData || null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const isOsm = typeof hospitalId === 'string' && hospitalId.startsWith('osm-');
  const isValidUUID = !isOsm && /^[0-9a-f-]{36}$/i.test(hospitalId);

  useEffect(() => {
    if (isOsm) {
      navigation.goBack();
    }
  }, [isOsm]);

  const load = async () => {
    if (!isValidUUID) return;
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', hospitalId)
      .maybeSingle();
    if (error) Alert.alert('Error', error.message);
    if (data) {
      setH(data);
      setUpdatedAt(data.updated_at ? new Date(data.updated_at) : new Date());
    }
  };

  useEffect(() => {
    if (!isValidUUID) return;
    load();
    const channel = supabase
      .channel(`hospital-detail-${hospitalId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'hospitals', filter: `id=eq.${hospitalId}`,
      }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [hospitalId]);

  if (!h) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const status = getAvailabilityStatus(h);
  const counts = getBedCounts(h);

  const callNow = () => {
    if (h.phone) Linking.openURL(`tel:${h.phone}`);
    else Alert.alert('No phone', 'Phone number not listed for this hospital.');
  };

  const directions = () => {
    if (h.lat && h.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`);
    } else {
      Alert.alert('No location', 'GPS coordinates not available.');
    }
  };

  return (
    <View style={s.wrap}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={s.kicker}>HOSPITAL</Text>
        <View style={s.titleRow}>
          <Text style={s.name}>{h.name}</Text>
          <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
        </View>

        <View style={s.addrRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={Colors.sub} />
          <Text style={s.addr}>{displayAddress(h)}</Text>
        </View>

        {formatLastUpdated(h.updated_at) && (
          <View style={s.updatedRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.sub} />
            <Text style={s.updated}>{formatLastUpdated(h.updated_at)}</Text>
          </View>
        )}
        {isPersistentlyFull(h) && (
          <Text style={s.warn}>This hospital has reported no beds for 2+ hours.</Text>
        )}

        <Text style={s.section}>BED AVAILABILITY</Text>
        {BED_TYPES.map(({ key, label }) => {
          const c = counts[key];
          const registered = hasBedData(h);
          return (
            <View key={key} style={s.bedCard}>
              <Text style={s.bedLabel}>{label}</Text>
              <View style={s.bedCountRow}>
                <Text style={[s.bedAv, { color: !registered ? Colors.sub : c.av > 0 ? Colors.good : Colors.bad }]}>
                  {registered ? c.av : '—'}
                </Text>
                <Text style={s.bedTotal}> / {registered ? c.total : '—'}</Text>
              </View>
              <BedProgressBar available={c.av} total={c.total} height={8} style={{ marginTop: Sp.sm }} unknown={!registered || c.total <= 0} />
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.dirBtn} onPress={directions}>
          <MaterialCommunityIcons name="navigation" size={20} color={Colors.text} />
          <Text style={s.dirText}>DIRECTIONS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.callBtn} onPress={callNow}>
          <MaterialCommunityIcons name="phone" size={20} color="#fff" />
          <Text style={s.callText}>CALL NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Sp.md, paddingBottom: Sp.xl },
  hero: {
    height: 180, marginHorizontal: -Sp.md, marginBottom: Sp.md,
    backgroundColor: Colors.bg,
    justifyContent: 'flex-start', padding: Sp.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm,
  },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  name: { fontSize: 26, fontWeight: '900', color: Colors.text, flex: 1 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Sp.sm },
  addr: { flex: 1, fontSize: 14, color: Colors.sub, lineHeight: 20 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Sp.sm },
  updated: { fontSize: 13, color: Colors.sub },
  warn: { fontSize: 13, color: Colors.warn, fontWeight: '700', marginTop: Sp.sm },
  section: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1, marginTop: Sp.lg, marginBottom: Sp.sm },
  bedCard: {
    backgroundColor: Colors.bg, borderRadius: Radii.lg, padding: Sp.md, marginBottom: Sp.sm,
  },
  bedLabel: { fontSize: 11, fontWeight: '800', color: Colors.sub },
  bedCountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  bedAv: { fontSize: 36, fontWeight: '900' },
  bedTotal: { fontSize: 18, color: Colors.sub, fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, padding: Sp.md, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.line,
  },
  dirBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: Radii.md, borderWidth: 2, borderColor: Colors.text,
  },
  dirText: { fontWeight: '800', color: Colors.text },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: Radii.md, backgroundColor: Colors.bad,
  },
  callText: { color: '#fff', fontWeight: '800' },
});
