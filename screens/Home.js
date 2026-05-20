// screens/Home.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking, ScrollView, FlatList, Dimensions, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'beds',
    label: 'Beds',
    emoji: '🛏️',
    desc: 'Find available general, ICU & oxygen beds near you in real time.',
  },
  {
    key: 'icu',
    label: 'ICU',
    emoji: '❤️‍🔥',
    desc: 'Critical care units with real-time bed availability tracking.',
  },
  {
    key: 'oxygen',
    label: 'Oxygen Beds',
    emoji: '💨',
    desc: 'Specialized oxygen-supported beds across registered hospitals.',
  },
];

export default function Home({ navigation }) {
  const [placeLabel, setPlaceLabel] = useState('Detecting location…');
  const [subLabel, setSubLabel] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const flatRef = useRef(null);

  useEffect(() => {
    detectLocation();
    const timer = setInterval(() => {
      setSlideIndex(prev => {
        const next = (prev + 1) % SLIDES.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
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
    <ScrollView
      style={s.wrap}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Location Header */}
      <TouchableOpacity style={s.locRow} onPress={detectLocation} activeOpacity={0.7}>
        <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary} />
        <View style={{ marginLeft: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.locTitle}>{placeLabel}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.primary} style={{ marginLeft: 2 }} />
          </View>
          {!!subLabel && <Text style={s.locSub} numberOfLines={1}>{subLabel}</Text>}
        </View>
      </TouchableOpacity>

      {/* Search Bar */}
      <TouchableOpacity
        style={s.searchBar}
        onPress={() => navigation.navigate('List')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
        <Text style={s.searchPlaceholder}>Search Location</Text>
        <TouchableOpacity style={s.filterBtn} onPress={() => navigation.navigate('List')}>
          <MaterialCommunityIcons name="tune-variant" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Illustration Carousel */}
      <View style={s.carouselWrap}>
        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.key}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setSlideIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={[s.slide, { width }]}>
              <View style={s.slideIllustration}>
                <Text style={s.slideEmoji}>{item.emoji}</Text>
              </View>
              <Text style={s.slideTitle}>{item.label}</Text>
              <Text style={s.slideDesc}>{item.desc}</Text>
            </View>
          )}
        />
        {/* Dot indicators */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === slideIndex && s.dotActive]} />
          ))}
        </View>
      </View>

      {/* Emergency Number */}
      <TouchableOpacity
        style={s.emergencyBtn}
        onPress={() => Linking.openURL('tel:112')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="phone" size={22} color="#fff" style={{ marginRight: 10 }} />
        <Text style={s.emergencyText}>Emergency Number</Text>
      </TouchableOpacity>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 50, paddingHorizontal: Sp.md },

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Sp.lg,
  },
  locTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  locSub: { fontSize: 12, color: Colors.sub, marginTop: 1, maxWidth: width - 80 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radii.pill,
    paddingHorizontal: Sp.md,
    height: 50,
    marginBottom: Sp.lg,
    ...Shadows.sm,
  },
  searchPlaceholder: { flex: 1, marginLeft: 10, color: Colors.sub, fontSize: 15 },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.tealBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },

  carouselWrap: {
    backgroundColor: '#fff',
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginBottom: Sp.lg,
    ...Shadows.sm,
    marginHorizontal: -4,
  },
  slide: {
    alignItems: 'center',
    paddingVertical: Sp.xl,
    paddingHorizontal: Sp.lg,
  },
  slideIllustration: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Sp.md,
  },
  slideEmoji: { fontSize: 80 },
  slideTitle: { fontSize: Typo.h1, fontWeight: '900', color: Colors.primary, marginBottom: 8 },
  slideDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 20 },

  dots: { flexDirection: 'row', justifyContent: 'center', paddingBottom: Sp.md, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.line },
  dotActive: { backgroundColor: Colors.primary, width: 20 },

  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    height: 58,
    ...Shadows.md,
  },
  emergencyText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
