// screens/ui/kit.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { Colors, Radii, Sp, Typo, Shadows } from './theme';

const { width } = Dimensions.get('window');

export function Card({ children, style, animate = true, onPress }) {
  const content = (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <MotiView
        from={{ scale: 1, rotateX: '0deg', rotateY: '0deg' }}
        animate={{ scale: 1, rotateX: '0deg', rotateY: '0deg' }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            pressed && { transform: [{ scale: 0.98 }, { rotateX: '2deg' }, { rotateY: '1deg' }] }
          ]}
        >
          {content}
        </Pressable>
      </MotiView>
    );
  }

  return animate ? (
    <MotiView
      from={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'timing', duration: 500 }}
    >
      {content}
    </MotiView>
  ) : content;
}

export function PrimaryButton({ title, onPress, disabled, busy, style, icon }) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && { opacity: 0.5, backgroundColor: Colors.sub }, style]}
      onPress={onPress}
      disabled={disabled || busy}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
            <Text style={styles.btnText}>{title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function Badge({ tone = 'neutral', children, style }) {
  const isGood = tone === 'good';
  const isWarn = tone === 'warn';
  const isBad = tone === 'bad';

  const bg = isGood ? Colors.good + '15' : isWarn ? Colors.warn + '15' : isBad ? Colors.bad + '15' : Colors.accent;
  const dotColor = isGood ? Colors.good : isWarn ? Colors.warn : isBad ? Colors.bad : Colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.badgeText, { color: dotColor }]}>{children}</Text>
    </View>
  );
}

export function Skeleton({ width: w = '100%', height: h = 20, style }) {
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{ loop: true, type: 'timing', duration: 1000, repeatReverse: true }}
      style={[styles.skeleton, { width: w, height: h }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Sp.md,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radii.md,
    ...Shadows.sm,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontWeight: '700', fontSize: Typo.small, textTransform: 'uppercase' },
  skeleton: { backgroundColor: '#E2E8F0', borderRadius: Radii.sm },
});
