import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows } from './ui/theme';

export default function Profile() {
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const email = user?.email || '';
  const initial = (displayName[0] || 'U').toUpperCase();

  const openEdit = () => {
    setEditName(displayName === 'User' ? '' : displayName);
    setEditOpen(true);
  };

  const saveName = async () => {
    if (!user || !editName.trim()) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim() })
      .eq('id', user.id);
    setBusy(false);
    if (error) Alert.alert('Error', error.message);
    else {
      await refreshProfile();
      setEditOpen(false);
      Alert.alert('Saved', 'Profile name updated.');
    }
  };

  const toggleStaffMode = async () => {
    if (!user) return;
    setBusy(true);
    const newRole = isStaff ? 'user' : 'staff';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    setBusy(false);
    if (error) Alert.alert('Error', error.message);
    else {
      await refreshProfile();
      Alert.alert('Updated', newRole === 'staff' ? 'Staff mode enabled.' : 'Staff mode disabled.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <ScrollView style={s.wrap} contentContainerStyle={s.content}>
        <Text style={s.kicker}>ACCOUNT</Text>
        <Text style={s.title}>Profile</Text>

        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{displayName}</Text>
            <Text style={s.userEmail}>{email}</Text>
            {isStaff && (
              <View style={s.roleBadge}>
                <Text style={s.roleText}>HOSPITAL STAFF</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={openEdit} style={s.editBtn}>
            <MaterialCommunityIcons name="pencil" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ProfileRow
          icon="account-edit"
          title="Edit display name"
          sub="Update how your name appears in the app."
          onPress={openEdit}
        />

        {isStaff ? (
          <>
            <Text style={s.section}>HOSPITAL STAFF</Text>
            <ProfileRow icon="shield-outline" title="Disable staff mode" sub="Return to patient view." onPress={toggleStaffMode} busy={busy} />
            <ProfileRow icon="clipboard-list-outline" title="Open staff dashboard" sub="Register hospitals, edit beds & addresses." onPress={() => navigation.navigate('StaffDashboard')} darkIcon />
          </>
        ) : (
          <>
            <Text style={s.section}>HOSPITAL STAFF</Text>
            <ProfileRow icon="shield-check-outline" title="Enable staff mode" sub="For hospital staff updating bed availability." onPress={toggleStaffMode} busy={busy} />
          </>
        )}

        <Text style={s.section}>SESSION</Text>
        <ProfileRow icon="logout" title="Sign out" sub="End your session." onPress={signOut} danger />

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit display name</Text>
            <TextInput
              style={s.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              autoFocus
            />
            <View style={s.modalRow}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditOpen(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveName} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ProfileRow({ icon, title, sub, onPress, danger, darkIcon, busy }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8} disabled={busy}>
      <View style={[s.rowIcon, danger && s.rowIconDanger, darkIcon && s.rowIconDark]}>
        {busy ? (
          <ActivityIndicator color={danger ? '#fff' : Colors.text} size="small" />
        ) : (
          <MaterialCommunityIcons name={icon} size={22} color={danger ? '#fff' : darkIcon ? '#fff' : Colors.text} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.sub} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 52, paddingHorizontal: Sp.md },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '900', color: Colors.text, marginBottom: Sp.lg },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.lg, marginBottom: Sp.md, ...Shadows.sm,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5E3C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  userName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.sub, marginTop: 2 },
  editBtn: { padding: 8 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: Colors.text, paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radii.pill, marginTop: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1, marginBottom: Sp.sm, marginTop: Sp.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.md, marginBottom: Sp.sm, ...Shadows.sm,
  },
  rowIcon: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: Colors.bad },
  rowIconDark: { backgroundColor: Colors.text },
  rowTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.sub, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Sp.lg },
  modalCard: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: Sp.md },
  modalInput: { backgroundColor: Colors.bg, borderRadius: Radii.md, height: 48, paddingHorizontal: Sp.md, fontSize: 16 },
  modalRow: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.lg },
  modalCancel: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, backgroundColor: Colors.bg },
  modalCancelText: { fontWeight: '700', color: Colors.sub },
  modalSave: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, backgroundColor: Colors.primary },
  modalSaveText: { fontWeight: '800', color: '#fff' },
});
