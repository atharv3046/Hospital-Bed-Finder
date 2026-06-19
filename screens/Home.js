import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { useHospitals } from './HospitalContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32;

const SLIDES = [
  {
    key: 'beds',
    label: 'Find Beds Fast',
    emoji: '🛏️',
    desc: 'Swipe through bed types, then search the list or map for hospitals near you with live counts.',
  },
  {
    key: 'icu',
    label: 'ICU Tracking',
    emoji: '🏥',
    desc: 'See ICU availability updated by hospital staff — green means open, red means full.',
  },
  {
    key: 'oxygen',
    label: 'Oxygen Beds',
    emoji: '💨',
    desc: 'Filter the hospital list by oxygen beds when you need O₂-supported care.',
  },
];

export default function Home({ navigation }) {
  const [placeLabel, setPlaceLabel] = useState('Detecting location…');
  const [subLabel, setSubLabel] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const flatRef = useRef(null);
  // ✅ areaStats is precomputed in context — zero recalculation on render
  const { hospitals, loading, fromCache, areaStats: stats } = useHospitals();


  useEffect(() => {
    detectLocation();
    const timer = setInterval(() => {
      setSlideIndex(prev => {
        const next = (prev + 1) % SLIDES.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const detectLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let finalStatus = status;
      if (status !== 'granted') {
        const { status: s } = await Location.requestForegroundPermissionsAsync();
        finalStatus = s;
      }
      if (finalStatus !== 'granted') { setPlaceLabel('Location unavailable'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (addr) {
        setPlaceLabel(addr.city || addr.district || addr.region || 'My Location');
        setSubLabel([addr.street, addr.subregion].filter(Boolean).join(', '));
      }
    } catch {
      setPlaceLabel('Tap to retry');
    }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={s.locRow} onPress={detectLocation} activeOpacity={0.7}>
        <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary} />
        <View style={{ marginLeft: 6, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.locTitle}>{placeLabel}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.primary} style={{ marginLeft: 2 }} />
          </View>
          {!!subLabel && <Text style={s.locSub} numberOfLines={1}>{subLabel}</Text>}
        </View>
      </TouchableOpacity>

      {/* Live stats */}
      <View style={s.statsCard}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <Text style={s.statsBig}>
              {stats.totalBedsAvailable > 0
                ? `${stats.totalBedsAvailable} beds available near you`
                : stats.registered > 0
                  ? 'No beds available right now'
                  : 'Bed counts not registered yet'}
            </Text>
            <Text style={s.statsSub}>
              {stats.registered} of {stats.total} hospitals reporting · {stats.noDataCount} awaiting staff data
              {fromCache ? ' · last known' : ''}
            </Text>
          </>
        )}
      </View>

      {stats.registered > 0 && stats.fullCount >= stats.registered * 0.5 && stats.fullCount > 0 && (
        <View style={s.alertBanner}>
          <MaterialCommunityIcons name="alert" size={18} color={Colors.bad} />
          <Text style={s.alertText}>
            {stats.fullCount} of {stats.registered} reporting hospitals are FULL in your area
          </Text>
        </View>
      )}

      <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('List')} activeOpacity={0.8}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
        <Text style={s.searchPlaceholder}>Search hospitals & locations</Text>
        <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.sub} />
      </TouchableOpacity>

      <View style={s.carouselWrap}>
        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.key}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
            setSlideIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={[s.slide, { width: CARD_WIDTH }]}>
              <View style={s.slideIllustration}>
                <Text style={s.slideEmoji}>{item.emoji}</Text>
              </View>
              <Text style={s.slideTitle}>{item.label}</Text>
              <Text style={s.slideDesc}>{item.desc}</Text>
            </View>
          )}
        />
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === slideIndex && s.dotActive]} />
          ))}
        </View>
      </View>

      <View style={s.navRow}>
        <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Map')}>
          <MaterialCommunityIcons name="map-outline" size={24} color={Colors.primary} />
          <Text style={s.navLabel}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('List')}>
          <MaterialCommunityIcons name="format-list-bulleted" size={24} color={Colors.primary} />
          <Text style={s.navLabel}>List</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.emergencyBtn} onPress={() => navigation.navigate('SOS')} activeOpacity={0.85}>
        <MaterialCommunityIcons name="alert-octagon" size={26} color="#fff" />
        <View style={s.emergencyTextWrap}>
          <Text style={s.emergencyText}>Find Nearest Hospital</Text>
          <Text style={s.emergencySub}>Emergency — tap for closest beds</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 50, paddingHorizontal: Sp.md },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Sp.md },
  locTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  locSub: { fontSize: 12, color: Colors.sub, marginTop: 1 },
  statsCard: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Sp.lg,
    marginBottom: Sp.md, ...Shadows.md,
  },
  statsBig: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26 },
  statsSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: Radii.md, padding: Sp.md,
    marginBottom: Sp.md, borderWidth: 1, borderColor: '#FECACA',
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.bad },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: Radii.pill, paddingHorizontal: Sp.md, height: 50, marginBottom: Sp.md, ...Shadows.sm,
  },
  searchPlaceholder: { flex: 1, marginLeft: 10, color: Colors.sub, fontSize: 15 },
  carouselWrap: {
    backgroundColor: '#fff', borderRadius: Radii.xl, overflow: 'hidden',
    marginBottom: Sp.md, ...Shadows.sm,
  },
  slide: { alignItems: 'center', paddingVertical: Sp.lg, paddingHorizontal: Sp.lg },
  slideIllustration: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Sp.md,
  },
  slideEmoji: { fontSize: 56 },
  slideTitle: { fontSize: Typo.h2, fontWeight: '900', color: Colors.primary, marginBottom: 8 },
  slideDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingBottom: Sp.md, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.line },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  navRow: { flexDirection: 'row', gap: Sp.sm, marginBottom: Sp.md },
  navBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: Radii.lg, paddingVertical: Sp.md, ...Shadows.sm,
  },
  navLabel: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  emergencyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: Colors.bad, borderRadius: Radii.xl, padding: Sp.md, ...Shadows.lg,
  },
  emergencyTextWrap: { flex: 1 },
  emergencyText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  emergencySub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
});
