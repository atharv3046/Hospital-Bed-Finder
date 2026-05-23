import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator,
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

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const email = user?.email || '';
  const initial = (displayName[0] || 'U').toUpperCase();

  const toggleStaffMode = async () => {
    if (!user) return;
    setBusy(true);
    const newRole = isStaff ? 'user' : 'staff';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
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
      </View>

      {isStaff && (
        <>
          <Text style={s.section}>HOSPITAL STAFF</Text>
          <ProfileRow
            icon="shield-outline"
            title="Disable staff mode"
            sub="You can update bed counts in the dashboard."
            onPress={toggleStaffMode}
            busy={busy}
          />
          <ProfileRow
            icon="clipboard-list-outline"
            title="Open staff dashboard"
            sub="Edit live bed counts."
            onPress={() => navigation.navigate('StaffDashboard')}
            darkIcon
          />
        </>
      )}

      {!isStaff && (
        <>
          <Text style={s.section}>HOSPITAL STAFF</Text>
          <ProfileRow
            icon="shield-check-outline"
            title="Enable staff mode"
            sub="For hospital staff updating bed availability."
            onPress={toggleStaffMode}
            busy={busy}
          />
        </>
      )}

      <Text style={s.section}>SESSION</Text>
      <ProfileRow
        icon="logout"
        title="Sign out"
        sub="End your session."
        onPress={signOut}
        danger
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function ProfileRow({ icon, title, sub, onPress, danger, darkIcon, busy }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8} disabled={busy}>
      <View style={[s.rowIcon, danger && s.rowIconDanger, darkIcon && s.rowIconDark]}>
        {busy ? (
          <ActivityIndicator color={danger ? '#fff' : Colors.text} size="small" />
        ) : (
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={danger ? '#fff' : darkIcon ? '#fff' : Colors.text}
          />
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
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.lg, marginBottom: Sp.lg, ...Shadows.sm,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5E3C',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  userName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.sub, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.text,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radii.pill, marginTop: 8,
  },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1, marginBottom: Sp.sm, marginTop: Sp.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.md, marginBottom: Sp.sm, ...Shadows.sm,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: Radii.md, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: Colors.bad },
  rowIconDark: { backgroundColor: Colors.text },
  rowTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.sub, marginTop: 2 },
});
