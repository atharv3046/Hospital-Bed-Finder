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
  const isNeutral = tone === 'neutral';

  const bg = isGood ? Colors.good + '15' : isWarn ? Colors.warn + '15' : isBad ? Colors.bad + '15' : isNeutral ? '#94A3B820' : Colors.accent;
  const dotColor = isGood ? Colors.good : isWarn ? Colors.warn : isBad ? Colors.bad : isNeutral ? '#64748B' : Colors.primary;

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

export function BedProgressBar({ available = 0, total = 0, height = 6, style, unknown = false }) {
  if (unknown || total <= 0) {
    return (
      <View style={[styles.progressTrack, { height }, style]}>
        <View style={[styles.progressFill, { width: '100%', backgroundColor: '#CBD5E1', height }]} />
      </View>
    );
  }
  const pct = Math.min(100, (available / total) * 100);
  const color = available <= 0 ? Colors.bad : pct <= 25 ? Colors.warn : Colors.good;
  return (
    <View style={[styles.progressTrack, { height }, style]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StatusLegend({ compact }) {
  return (
    <View style={styles.legend}>
      <LegendItem color={Colors.good} label="OPEN" />
      <LegendItem color={Colors.warn} label="LIMITED" />
      <LegendItem color={Colors.bad} label="FULL" />
      {!compact && <LegendItem color="#94A3B8" label="NO DATA" />}
    </View>
  );
}

export function NumberStepper({ value, onChange, min = 0, max = 999 }) {
  const n = parseInt(value, 10) || 0;
  const dec = () => onChange(String(Math.max(min, n - 1)));
  const inc = () => onChange(String(Math.min(max, n + 1)));
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={dec}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepVal}>{n}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={inc}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
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
  progressTrack: { backgroundColor: '#E2E8F0', borderRadius: Radii.pill, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: Radii.pill },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: Sp.sm },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.pill,
    backgroundColor: '#E8EEF2',
  },
  chipActive: { backgroundColor: Colors.text },
  chipText: { fontSize: 12, fontWeight: '800', color: Colors.sub },
  chipTextActive: { color: '#fff' },
  legend: { alignItems: 'flex-end', gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 9, fontWeight: '700', color: Colors.sub },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 40, height: 40, borderRadius: Radii.sm, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.line,
  },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  stepVal: { fontSize: 22, fontWeight: '900', color: Colors.text, minWidth: 36, textAlign: 'center' },
});
