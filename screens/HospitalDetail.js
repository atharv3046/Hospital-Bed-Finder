// screens/HospitalDetail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { toggleFavorite, getFavoriteIds } from './utils/favorites.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

const { width } = Dimensions.get('window');

export default function HospitalDetail({ route, navigation }) {
  const { hospitalId } = route.params;
  const [h, setH] = useState(null);
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    (async () => { setFavIds(await getFavoriteIds()); })();
  }, []);
  const isFav = favIds.includes(hospitalId);

  const load = async () => {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', hospitalId).maybeSingle();

    if (error) Alert.alert('Error', error.message);
    setH(data);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`hospital-detail-${hospitalId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hospitals', filter: `id=eq.${hospitalId}` }, () => load()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [hospitalId]);

  const onToggleFav = async () => setFavIds(await toggleFavorite(hospitalId));
  const bookBed = (type) => navigation.navigate('BookingForm', { hospital: h, bedType: type });

  if (!h) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} />
        <Skeleton width="80%" height={200} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={s.hero}
      >
        <View style={s.heroOverlay}>
          <View style={s.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleFav} style={s.favBtn}>
              <MaterialCommunityIcons name={isFav ? "heart" : "heart-outline"} size={26} color={isFav ? "#EF4444" : "#fff"} />
            </TouchableOpacity>
          </View>
          <View style={s.heroTitleBox}>
            <Text style={s.heroName}>{h.name}</Text>
            <View style={s.locRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={Colors.accent} />
              <Text style={s.heroAddr}>{h.address || 'Location information unavailable'}</Text>
            </View>
          </View>
        </View>
      </MotiView>

      <MotiView from={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 200 }}>
        {/* Trust Indicators */}
        <View style={s.trustRow}>
          {h.verified && (
            <View style={s.trustBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.good} />
              <Text style={s.trustText}>Verified</Text>
            </View>
          )}
          <View style={s.trustBadge}>
            <MaterialCommunityIcons name="ambulance" size={16} color={Colors.primary} />
            <Text style={s.trustText}>{h.response_time_avg || '15'} min Response</Text>
          </View>
        </View>

        {/* Info Card */}
        <Card style={s.infoCard}>
          <Text style={s.sectionHeader}>About Facility</Text>
          <Text style={s.aboutText}>
            {h.about || `A premium healthcare facility specializing in emergency care and residential medical services. Equipped with state-of-the-art life support systems.`}
          </Text>
          <View style={s.divider} />
          <InfoRow icon="phone" label="Emergency Contact" value={h.phone || 'Registry listing restricted'} />
          <InfoRow icon="hospital-building" label="Facility Type" value={h.type === 'Pvt' ? 'Private General' : 'Government Public'} />

          <PrimaryButton
            title="GET DIRECTIONS"
            onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`)}
            style={{ marginTop: Sp.md, backgroundColor: Colors.primary + '15' }}
            icon={<MaterialCommunityIcons name="google-maps" size={20} color={Colors.primary} />}
          />
        </Card>

        {/* Bed Status */}
        <Text style={s.sectionHeader}>Live Bed Availability</Text>
        <View style={s.bedGrid}>
          <BedTile label="ICU" av={h.bed_av_icu} total={h.bed_total_icu} onBook={() => bookBed('ICU')} />
          <BedTile label="O2" av={h.bed_av_oxygen} total={h.bed_total_oxygen} onBook={() => bookBed('OXYGEN')} />
          <BedTile label="GEN" av={h.bed_av_general} total={h.bed_total_general} onBook={() => bookBed('GENERAL')} />
        </View>

        {/* Services */}
        <Text style={s.sectionHeader}>Services & Specialties</Text>
        <View style={s.tagRow}>
          {(h.specialties || 'Emergency, Surgery, Pediatrics, Diagnostics').split(',').map((tag, i) => (
            <View key={i} style={s.tag}>
              <Text style={s.tagText}>{tag.trim()}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.futureBtn}
          onPress={() => navigation.navigate('FutureAvailability')}
        >
          <MaterialCommunityIcons name="calendar-clock" size={20} color="#fff" />
          <Text style={s.futureBtnText}>Check Historical Trends</Text>
        </TouchableOpacity>
      </MotiView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color={Colors.primary} />
      <View style={{ marginLeft: 12 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function BedTile({ label, av = 0, total = 0, onBook }) {
  const tone = av > 5 ? 'good' : av > 0 ? 'warn' : 'bad';
  return (
    <Card style={s.bedTile}>
      <Text style={s.bedLabel}>{label}</Text>
      <Text style={[s.bedCount, { color: av > 0 ? Colors.good : Colors.bad }]}>{av}</Text>
      <Text style={s.bedTotal}>out of {total}</Text>
      {av > 0 ? (
        <TouchableOpacity style={s.miniBookBtn} onPress={onBook}>
          <Text style={s.miniBookText}>BOOK</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.fullBadge}><Text style={s.fullText}>FULL</Text></View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Sp.md },

  hero: {
    height: 240,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primary,
    overflow: 'hidden',
    ...Shadows.lg
  },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, justifyContent: 'space-between' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  favBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroTitleBox: { marginBottom: 10 },
  heroName: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroAddr: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginLeft: 4, fontWeight: '600' },

  trustRow: { flexDirection: 'row', gap: 12, marginTop: Sp.md, marginBottom: Sp.md },
  trustBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radii.pill, ...Shadows.sm },
  trustText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.text },

  sectionHeader: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: Sp.md, marginBottom: Sp.sm },
  infoCard: { padding: Sp.lg },
  aboutText: { fontSize: 15, color: Colors.sub, lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.line, marginVertical: Sp.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoLabel: { fontSize: 11, fontWeight: '900', color: Colors.sub, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.text },

  bedGrid: { flexDirection: 'row', gap: 12 },
  bedTile: { flex: 1, alignItems: 'center', padding: 12 },
  bedLabel: { fontSize: 12, fontWeight: '900', color: Colors.sub },
  bedCount: { fontSize: 28, fontWeight: '900', marginVertical: 2 },
  bedTotal: { fontSize: 10, color: Colors.sub, marginBottom: 12 },
  miniBookBtn: { backgroundColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.sm },
  miniBookText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  fullBadge: { backgroundColor: Colors.bg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.sm },
  fullText: { color: Colors.sub, fontSize: 10, fontWeight: '900' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.pill, ...Shadows.sm },
  tagText: { color: Colors.text, fontSize: 12, fontWeight: '700' },

  futureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginTop: Sp.lg,
    height: 56,
    borderRadius: Radii.md,
    ...Shadows.md
  },
  futureBtnText: { marginLeft: 10, color: '#fff', fontSize: 15, fontWeight: '800' }
});
