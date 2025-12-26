// screens/Profile.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, PrimaryButton } from './ui/kit';

export default function Profile({ navigation }) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    // If AuthProvider is still determining user/profile, we wait
    if (authLoading) return;

    if (profile) {
      setName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBloodGroup(profile.blood_group || '');
      setAddress(profile.address || '');
    }
    setLoading(false);
  }, [profile, user, authLoading]);

  const onSave = async () => {
    try {
      if (!user) return;
      setBusy(true);
      const payload = {
        id: user.id,
        full_name: name || null,
        phone: phone || null,
        blood_group: bloodGroup || null,
        address: address || null,
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Settings Saved', 'Your preferences have been synchronized across all devices.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <MotiView from={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <MaterialCommunityIcons name="account-circle" size={80} color={Colors.primary} />
          </View>
          <Text style={s.emailText}>{user?.email}</Text>
          <Text style={s.roleText}>Verified Medical Citizen</Text>
        </View>

        <Card style={s.card}>
          <Text style={s.secTitle}>Personal Details</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={18} color={Colors.sub} />
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your Name" />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Phone</Text>
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={Colors.sub} />
              <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="Primary Contact" keyboardType="phone-pad" />
            </View>
          </View>

          <Text style={s.label}>Blood Group</Text>
          <View style={s.chipRow}>
            {bloodGroups.map(bg => (
              <TouchableOpacity key={bg} onPress={() => setBloodGroup(bg)} style={[s.chip, bloodGroup === bg && s.chipActive]}>
                <Text style={[s.chipText, bloodGroup === bg && s.chipTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Home Address</Text>
            <View style={[s.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.sub} />
              <TextInput style={[s.input, { textAlignVertical: 'top' }]} value={address} onChangeText={setAddress} placeholder="Address for emergency use" multiline />
            </View>
          </View>

          <PrimaryButton
            title="Update Profile"
            onPress={onSave}
            busy={busy}
            style={{ marginTop: Sp.md }}
          />
        </Card>

        <Card style={[s.card, { marginTop: Sp.md }]}>
          <Text style={s.secTitle}>Account Management</Text>

          <MenuOption
            icon="shield-account-outline"
            label="Staff Portal Access"
            onPress={() => navigation.navigate('StaffDashboard')}
          />
          <MenuOption
            icon="hospital-marker"
            label="Hospital Registry"
            onPress={() => navigation.navigate('GeneralHospitals')}
          />
          <MenuOption
            icon="alert-decagram-outline"
            label="Emergency Protocol"
            onPress={() => navigation.navigate('EmergencyRequest')}
          />

          <View style={s.divider} />

          <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={Colors.bad} />
            <Text style={s.logoutText}>Sign Out Account</Text>
          </TouchableOpacity>
        </Card>
      </MotiView>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MenuOption({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <View style={s.menuLeft}>
        <View style={s.menuIcon}>
          <MaterialCommunityIcons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={s.menuLabel}>{label}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.sub} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { alignItems: 'center', paddingVertical: Sp.lg },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.sm, marginBottom: 12 },
  emailText: { fontSize: 16, fontWeight: '800', color: Colors.text },
  roleText: { fontSize: 12, color: Colors.accent, fontWeight: '700', marginTop: 4 },

  card: { padding: Sp.lg },
  secTitle: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: Sp.md },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '900', color: Colors.sub, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: Radii.md, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: Colors.text },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 16 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.pill, backgroundColor: Colors.bg },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.sub, fontWeight: '800' },
  chipTextActive: { color: '#fff' },

  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },

  divider: { height: 1, backgroundColor: Colors.line, marginVertical: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  logoutText: { marginLeft: 12, fontSize: 14, fontWeight: '800', color: Colors.bad }
});
