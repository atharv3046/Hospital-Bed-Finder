// screens/LoadingScreen.js
// Shown while HospitalContext is preloading on first launch.
// Animates in, then fades out once ready=true.
import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Sp } from './ui/theme';

// ─── Pulsing ring ─────────────────────────────────────────────────────────────
function PulseRing({ delay = 0, size = 160 }) {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.4, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        ls.ring,
        {
          width: size, height: size, borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

// ─── Dot row progress indicator ───────────────────────────────────────────────
function LoadingDots() {
  const dots = [0, 1, 2].map(() => useRef(new Animated.Value(0.3)).current);

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 200),
        ])
      )
    );
    Animated.parallel(anims).start();
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={ls.dotRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[ls.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

// ─── Main LoadingScreen ───────────────────────────────────────────────────────
export default function LoadingScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[ls.wrap, { opacity: fadeIn }]}>
      {/* Background gradient rings */}
      <View style={ls.ringWrap}>
        <PulseRing size={260} delay={0} />
        <PulseRing size={200} delay={350} />
        <PulseRing size={140} delay={700} />
      </View>

      {/* Icon */}
      <View style={ls.iconCircle}>
        <MaterialCommunityIcons name="hospital-building" size={52} color="#fff" />
      </View>

      {/* Text */}
      <Text style={ls.title}>Hospital Bed Finder</Text>
      <Text style={ls.subtitle}>Locating hospitals near you…</Text>

      {/* Animated dots */}
      <LoadingDots />

      {/* Steps */}
      <View style={ls.steps}>
        {[
          { icon: 'map-marker',       label: 'Getting your location' },
          { icon: 'hospital-box',     label: 'Loading nearby hospitals' },
          { icon: 'ambulance',        label: 'Preparing emergency data' },
        ].map(({ icon, label }) => (
          <View key={label} style={ls.stepRow}>
            <MaterialCommunityIcons name={icon} size={16} color={Colors.primaryLight} />
            <Text style={ls.stepText}>{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const ls = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg, paddingHorizontal: Sp.xl,
  },
  ringWrap: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2, borderColor: Colors.primary,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: Sp.lg,
  },
  title: {
    fontSize: 26, fontWeight: '900', color: Colors.text,
    letterSpacing: 0.5, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.sub, marginTop: 8,
    textAlign: 'center', lineHeight: 20,
  },
  dotRow: {
    flexDirection: 'row', gap: 8, marginTop: Sp.lg, marginBottom: Sp.xl,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
  steps: { gap: 10, alignSelf: 'stretch' },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stepText: { fontSize: 13, color: Colors.sub, fontWeight: '600' },
});
