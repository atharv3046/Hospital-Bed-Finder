import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { BedProgressBar, NumberStepper } from './ui/kit';

const BED_FIELDS = [
  { av: 'bed_av_general', total: 'bed_total_general', label: 'General Beds' },
  { av: 'bed_av_icu', total: 'bed_total_icu', label: 'ICU Beds' },
  { av: 'bed_av_oxygen', total: 'bed_total_oxygen', label: 'Oxygen Beds' },
];

export default function StaffDashboard({ navigation }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('update');
  const [hospitals, setHospitals] = useState([]);
  const [selectedId, setSelectedId] = useState(profile?.hospital_id || null);
  const [form, setForm] = useState({});
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [regForm, setRegForm] = useState({
    name: '', address: '', phone: '', lat: '', lng: '',
    bed_av_general: '0', bed_total_general: '20',
    bed_av_icu: '0', bed_total_icu: '5',
    bed_av_oxygen: '0', bed_total_oxygen: '10',
  });

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';

  const loadHospitals = async () => {
    const { data, error } = await supabase.from('hospitals').select('*').order('name');
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
      setAddress(h.address || '');
    }
  }, [selectedId, hospitals]);

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setRegForm(f => ({
      ...f,
      lat: String(loc.coords.latitude),
      lng: String(loc.coords.longitude),
    }));
  };

  const performSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    const payload = { address: address.trim() || null, updated_at: new Date().toISOString() };
    BED_FIELDS.forEach(({ av, total }) => {
      payload[av] = Math.max(0, parseInt(form[av], 10) || 0);
      payload[total] = Math.max(0, parseInt(form[total], 10) || 0);
      if (payload[av] > payload[total]) payload[av] = payload[total];
    });

    const { error } = await supabase.from('hospitals').update(payload).eq('id', selectedId);
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Saved ✓', 'Bed counts and address updated. Patients see changes instantly.');
      loadHospitals();
    }
  };

  const save = () => {
    const totalAv = BED_FIELDS.reduce((s, { av }) => s + (parseInt(form[av], 10) || 0), 0);
    if (totalAv === 0) {
      Alert.alert(
        'Set all beds to zero?',
        'This will mark the hospital as FULL for patients. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, save', style: 'destructive', onPress: performSave },
        ]
      );
    } else {
      Alert.alert('Save changes?', 'This will update live bed counts for all users.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: performSave },
      ]);
    }
  };

  const registerHospital = async () => {
    if (!regForm.name.trim() || !regForm.address.trim()) {
      Alert.alert('Required', 'Hospital name and address are required.');
      return;
    }
    setSaving(true);
    const row = {
      name: regForm.name.trim(),
      address: regForm.address.trim(),
      phone: regForm.phone.trim() || null,
      lat: parseFloat(regForm.lat) || null,
      lng: parseFloat(regForm.lng) || null,
      type: 'Pvt',
      updated_at: new Date().toISOString(),
    };
    BED_FIELDS.forEach(({ av, total }) => {
      row[av] = Math.max(0, parseInt(regForm[av], 10) || 0);
      row[total] = Math.max(parseInt(regForm[total], 10) || 0, row[av]);
    });

    const { data, error } = await supabase.from('hospitals').insert(row).select().single();
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Registered', `${data.name} is now live on the map and list.`);
      setRegForm({
        name: '', address: '', phone: '', lat: '', lng: '',
        bed_av_general: '0', bed_total_general: '20',
        bed_av_icu: '0', bed_total_icu: '5',
        bed_av_oxygen: '0', bed_total_oxygen: '10',
      });
      setTab('update');
      loadHospitals();
      if (data?.id) setSelectedId(data.id);
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
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkText}>← Back to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selected = hospitals.find(h => h.id === selectedId);

  return (
    <View style={s.wrap}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHospitals(); }} />}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={s.kicker}>STAFF DASHBOARD</Text>
        <Text style={s.title}>Manage hospitals</Text>

        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'update' && s.tabActive]} onPress={() => setTab('update')}>
            <Text style={[s.tabText, tab === 'update' && s.tabTextActive]}>Update beds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'register' && s.tabActive]} onPress={() => setTab('register')}>
            <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Register new</Text>
          </TouchableOpacity>
        </View>

        {tab === 'register' ? (
          <>
            <Text style={s.label}>HOSPITAL NAME *</Text>
            <TextInput style={s.input} value={regForm.name} onChangeText={t => setRegForm(f => ({ ...f, name: t }))} placeholder="e.g. District Hospital" />
            <Text style={s.label}>FULL ADDRESS *</Text>
            <TextInput style={[s.input, s.textArea]} value={regForm.address} onChangeText={t => setRegForm(f => ({ ...f, address: t }))} placeholder="Street, area, city" multiline />
            <Text style={s.label}>PHONE</Text>
            <TextInput style={s.input} value={regForm.phone} onChangeText={t => setRegForm(f => ({ ...f, phone: t }))} keyboardType="phone-pad" />
            <TouchableOpacity style={s.locBtn} onPress={useMyLocation}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={Colors.primary} />
              <Text style={s.locBtnText}>Use my GPS for coordinates</Text>
            </TouchableOpacity>
            {BED_FIELDS.map(({ av, total, label }) => (
              <View key={av} style={s.bedCard}>
                <Text style={s.bedLabel}>{label.toUpperCase()}</Text>
                <View style={s.stepRow}>
                  <Text style={s.stepLbl}>Available</Text>
                  <NumberStepper value={regForm[av]} onChange={v => setRegForm(f => ({ ...f, [av]: v }))} />
                </View>
                <View style={s.stepRow}>
                  <Text style={s.stepLbl}>Capacity</Text>
                  <NumberStepper value={regForm[total]} onChange={v => setRegForm(f => ({ ...f, [total]: v }))} />
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
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
                <Text style={s.label}>ADDRESS (fixes OSM “not available”)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter full street address"
                  multiline
                />
                {BED_FIELDS.map(({ av, total, label }) => {
                  const avNum = parseInt(form[av], 10) || 0;
                  const totalNum = parseInt(form[total], 10) || 0;
                  return (
                    <View key={av} style={s.bedCard}>
                      <Text style={s.bedLabel}>{label.toUpperCase()}</Text>
                      <BedProgressBar available={avNum} total={totalNum} height={8} unknown={totalNum <= 0} />
                      <View style={s.stepRow}>
                        <Text style={s.stepLbl}>Available</Text>
                        <NumberStepper value={form[av]} onChange={v => setForm(f => ({ ...f, [av]: v }))} />
                      </View>
                      <View style={s.stepRow}>
                        <Text style={s.stepLbl}>Capacity</Text>
                        <NumberStepper value={form[total]} onChange={v => setForm(f => ({ ...f, [total]: v }))} max={500} />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.saveBtn}
          onPress={tab === 'register' ? registerHospital : save}
          disabled={saving || (tab === 'update' && !selectedId)}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={22} color="#fff" />
              <Text style={s.saveText}>
                {tab === 'register' ? 'REGISTER HOSPITAL' : 'SAVE CHANGES'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 52, paddingHorizontal: Sp.md, paddingBottom: Sp.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Sp.xl },
  blockTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: Sp.md },
  backLink: { marginTop: Sp.lg },
  backLinkText: { color: Colors.primary, fontWeight: '700' },
  back: { marginBottom: Sp.md },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: Sp.md },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: Sp.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radii.pill, backgroundColor: '#fff', alignItems: 'center' },
  tabActive: { backgroundColor: Colors.text },
  tabText: { fontWeight: '800', color: Colors.sub, fontSize: 13 },
  tabTextActive: { color: '#fff' },
  label: { fontSize: 11, fontWeight: '800', color: Colors.sub, marginBottom: Sp.sm, marginTop: Sp.sm },
  input: {
    backgroundColor: '#fff', borderRadius: Radii.md, paddingHorizontal: Sp.md,
    height: 48, fontSize: 15, color: Colors.text, ...Shadows.sm,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: Sp.sm },
  locBtnText: { color: Colors.primary, fontWeight: '700' },
  hospScroll: { marginBottom: Sp.md, maxHeight: 44 },
  hospChip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radii.pill,
    backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: Colors.line,
  },
  hospChipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  hospChipText: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: 160 },
  hospChipTextActive: { color: '#fff' },
  hospName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  bedCard: {
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.md,
    marginBottom: Sp.sm, ...Shadows.sm,
  },
  bedLabel: { fontSize: 11, fontWeight: '800', color: Colors.sub, marginBottom: Sp.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Sp.sm },
  stepLbl: { fontSize: 14, fontWeight: '700', color: Colors.text },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Sp.md, paddingBottom: 28, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: Colors.line, ...Shadows.md,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: Radii.md, height: 56,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
