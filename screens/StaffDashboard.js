import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { BedProgressBar } from './ui/kit';

const BED_FIELDS = [
  { av: 'bed_av_general', total: 'bed_total_general', label: 'General Beds' },
  { av: 'bed_av_icu', total: 'bed_total_icu', label: 'ICU Beds' },
  { av: 'bed_av_oxygen', total: 'bed_total_oxygen', label: 'Oxygen Beds' },
];

export default function StaffDashboard({ navigation }) {
  const { user, profile } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [selectedId, setSelectedId] = useState(profile?.hospital_id || null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';

  const loadHospitals = async () => {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name');
    if (!error) setHospitals(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (isStaff) loadHospitals();
    else setLoading(false);
  }, [isStaff]);

  useEffect(() => {
    const h = hospitals.find(x => x.id === selectedId);
    if (h) {
      setForm({
        bed_av_general: String(h.bed_av_general ?? 0),
        bed_total_general: String(h.bed_total_general ?? 0),
        bed_av_icu: String(h.bed_av_icu ?? 0),
        bed_total_icu: String(h.bed_total_icu ?? 0),
        bed_av_oxygen: String(h.bed_av_oxygen ?? 0),
        bed_total_oxygen: String(h.bed_total_oxygen ?? 0),
      });
    }
  }, [selectedId, hospitals]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const payload = {};
    BED_FIELDS.forEach(({ av, total }) => {
      payload[av] = Math.max(0, parseInt(form[av], 10) || 0);
      payload[total] = Math.max(0, parseInt(form[total], 10) || 0);
      if (payload[av] > payload[total]) payload[av] = payload[total];
    });
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('hospitals').update(payload).eq('id', selectedId);
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Saved', 'Bed counts updated. Patients will see changes in real time.');
      loadHospitals();
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!isStaff) {
    return (
      <View style={s.center}>
        <MaterialCommunityIcons name="lock" size={56} color={Colors.sub} />
        <Text style={s.blockTitle}>Staff access required</Text>
        <Text style={s.blockSub}>Enable staff mode from your Profile to update bed counts.</Text>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkText}>← Back to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selected = hospitals.find(h => h.id === selectedId);

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHospitals(); }} />}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
      </TouchableOpacity>

      <Text style={s.kicker}>STAFF DASHBOARD</Text>
      <Text style={s.title}>Update bed counts</Text>
      <Text style={s.sub}>Changes sync instantly to the map and list for patients.</Text>

      <Text style={s.label}>SELECT HOSPITAL</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hospScroll}>
        {hospitals.map(h => (
          <TouchableOpacity
            key={h.id}
            style={[s.hospChip, selectedId === h.id && s.hospChipActive]}
            onPress={() => setSelectedId(h.id)}
          >
            <Text style={[s.hospChipText, selectedId === h.id && s.hospChipTextActive]} numberOfLines={1}>
              {h.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <>
          <Text style={s.hospName}>{selected.name}</Text>
          {BED_FIELDS.map(({ av, total, label }) => {
            const avNum = parseInt(form[av], 10) || 0;
            const totalNum = parseInt(form[total], 10) || 0;
            return (
              <View key={av} style={s.bedCard}>
                <Text style={s.bedLabel}>{label.toUpperCase()}</Text>
                <BedProgressBar available={avNum} total={totalNum} height={8} />
                <View style={s.inputRow}>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLbl}>Available</Text>
                    <TextInput
                      style={s.input}
                      keyboardType="number-pad"
                      value={form[av]}
                      onChangeText={t => setForm(f => ({ ...f, [av]: t }))}
                    />
                  </View>
                  <Text style={s.slash}>/</Text>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLbl}>Capacity</Text>
                    <TextInput
                      style={s.input}
                      keyboardType="number-pad"
                      value={form[total]}
                      onChangeText={t => setForm(f => ({ ...f, [total]: t }))}
                    />
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveText}>PUBLISH LIVE COUNTS</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 52, paddingHorizontal: Sp.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Sp.xl },
  blockTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: Sp.md },
  blockSub: { fontSize: 14, color: Colors.sub, textAlign: 'center', marginTop: 8 },
  backLink: { marginTop: Sp.lg },
  backLinkText: { color: Colors.primary, fontWeight: '700' },
  back: { marginBottom: Sp.md },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text },
  sub: { fontSize: 14, color: Colors.sub, marginTop: 6, marginBottom: Sp.lg },
  label: { fontSize: 11, fontWeight: '800', color: Colors.sub, marginBottom: Sp.sm },
  hospScroll: { marginBottom: Sp.md, maxHeight: 44 },
  hospChip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radii.pill,
    backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: Colors.line,
  },
  hospChipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  hospChipText: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: 160 },
  hospChipTextActive: { color: '#fff' },
  hospName: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: Sp.md },
  bedCard: {
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.md,
    marginBottom: Sp.sm, ...Shadows.sm,
  },
  bedLabel: { fontSize: 11, fontWeight: '800', color: Colors.sub, marginBottom: Sp.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: Sp.sm },
  inputGroup: { flex: 1 },
  inputLbl: { fontSize: 10, color: Colors.sub, marginBottom: 4 },
  input: {
    backgroundColor: Colors.bg, borderRadius: Radii.sm, height: 44,
    paddingHorizontal: Sp.md, fontSize: 18, fontWeight: '800', color: Colors.text,
  },
  slash: { fontSize: 24, color: Colors.sub, marginHorizontal: 12, marginTop: 16 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.md, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: Sp.lg, ...Shadows.md,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
