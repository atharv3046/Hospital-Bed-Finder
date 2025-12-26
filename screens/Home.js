// screens/Home.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Linking, ScrollView, Dimensions } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, PrimaryButton } from './ui/kit';

const { width } = Dimensions.get('window');

export default function Home({ navigation }) {
  const [stats, setStats] = useState({ hospitals: 0, beds: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState(null);
  const [placeLabel, setPlaceLabel] = useState('Detecting location…');

  useEffect(() => {
    fetchStats();
    detectLocation();
  }, []);

  const detectLocation = async () => {
    try {
      setPlaceLabel('Detecting location…');
      const { status } = await Location.getForegroundPermissionsAsync();
      let finalStatus = status;
      if (status !== 'granted') {
        const { status: askStatus } = await Location.requestForegroundPermissionsAsync();
        finalStatus = askStatus;
      }

      if (finalStatus !== 'granted') {
        setPlaceLabel('Permission denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (addr) {
        setPlaceLabel(`${addr.city || addr.region || addr.name || ''}`);
      } else {
        setPlaceLabel('Current Location');
      }
    } catch (e) {
      setPlaceLabel('Tap to retry');
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error, count } = await supabase
        .from('hospitals')
        .select('bed_av_icu, bed_av_oxygen, bed_av_general', { count: 'exact' });

      if (!error && data) {
        const totalBeds = data.reduce((acc, h) =>
          acc + (h.bed_av_icu || 0) + (h.bed_av_oxygen || 0) + (h.bed_av_general || 0), 0);
        setStats({ hospitals: count || data.length, beds: totalBeds });
      }
    } catch (e) {
      // console.log('Favorites load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const goList = () => navigation.navigate('MainTabs', { screen: 'List', params: { coords, q: query?.trim() || null } });
  const emergencyCall = () => Linking.openURL('tel:112');

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Location Badge */}
      <MotiView
        from={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.topRow}
      >
        <TouchableOpacity
          onPress={detectLocation}
          activeOpacity={0.7}
          style={s.locBadge}
        >
          <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
          <Text style={s.locText}>{placeLabel}</Text>
        </TouchableOpacity>
      </MotiView>

      {/* Hero Analytics */}
      <Card style={s.hero}>
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
          <Text style={s.heroSub}>NETWORK OVERVIEW</Text>
          <Text style={s.heroTitle}>Live Dashboard</Text>
        </MotiView>

        <View style={s.statsWrapper}>
          <MotiView
            from={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 300 }}
            style={s.statBox}
          >
            <Text style={s.statNum}>{stats.hospitals}</Text>
            <Text style={s.statName}>Hospitals</Text>
          </MotiView>
          <View style={s.vDivider} />
          <MotiView
            from={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 400 }}
            style={s.statBox}
          >
            <Text style={s.statNum}>{stats.beds}+</Text>
            <Text style={s.statName}>Active Beds</Text>
          </MotiView>
        </View>
      </Card>

      {/* Modern Search */}
      <View style={s.searchSection}>
        <View style={s.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color={Colors.sub} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by hospital, city or address"
            placeholderTextColor={Colors.sub + '80'}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={goList}
          />
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={goList}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions Grid */}
      <Text style={s.sectionHeader}>Quick Actions</Text>
      <View style={s.actionGrid}>
        <ActionIcon
          name="hospital-building"
          label="Global Registry"
          color="#3B82F6"
          onPress={() => navigation.navigate('GeneralHospitals')}
        />
        <ActionIcon
          name="calendar-clock"
          label="Schedules"
          color="#8B5CF6"
          onPress={() => navigation.navigate('FutureAvailability')}
        />
        <ActionIcon
          name="plus-circle-outline"
          label="Add Facility"
          color="#10B981"
          onPress={() => navigation.navigate('AddHospital')}
        />
      </View>

      {/* Emergency Footer */}
      <TouchableOpacity style={s.emergencyCard} onPress={emergencyCall}>
        <View style={s.emergencyIcon}>
          <MaterialCommunityIcons name="phone-plus" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={s.emergencyTitle}>Emergency Help</Text>
          <Text style={s.emergencySub}>Instantly dial emergency services</Text>
        </View>
        <Text style={s.emergencyNum}>112</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActionIcon({ name, label, color, onPress }) {
  return (
    <TouchableOpacity style={s.actionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.actionCircle, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={name} size={28} color={color} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md },

  topRow: { alignItems: 'center', marginBottom: Sp.md, marginTop: 10 },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    ...Shadows.sm
  },
  locText: { fontSize: 13, fontWeight: '700', color: Colors.text, marginLeft: 4 },

  hero: {
    padding: Sp.lg,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
    overflow: 'hidden'
  },
  heroSub: { fontSize: 11, fontWeight: '900', color: Colors.accent, letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontSize: Typo.h1, fontWeight: '900', color: '#fff' },

  statsWrapper: {
    flexDirection: 'row',
    marginTop: Sp.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.md,
    paddingVertical: 12,
    width: '100%'
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '900', color: '#fff' },
  statName: { fontSize: 11, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase' },
  vDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  searchSection: { flexDirection: 'row', marginTop: Sp.md, gap: 12 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    height: 60,
    ...Shadows.md
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: Colors.text, fontWeight: '500' },
  searchBtn: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md
  },

  sectionHeader: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text, marginTop: Sp.lg, marginBottom: Sp.md },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sp.lg },
  actionItem: { alignItems: 'center', width: (width - 48) / 3 },
  actionCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: 16,
    marginTop: Sp.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.bad,
    ...Shadows.md
  },
  emergencyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.bad, alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  emergencySub: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  emergencyNum: { fontSize: 18, fontWeight: '900', color: Colors.bad }
});
