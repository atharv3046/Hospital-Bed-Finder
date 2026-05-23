import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapComponent from './MapComponent';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { Badge } from './ui/kit';
import {
  useNearbyHospitals, getAvailabilityStatus, STATUS_LABELS, STATUS_TONES, getBedCounts,
} from './utils/hospitals';

export default function MapScreen() {
  const navigation = useNavigation();
  const { coords, hospitals, loading, refresh } = useNearbyHospitals(null, 25);
  const [selected, setSelected] = useState(null);

  const openDetail = (h) => {
    const isOsm = typeof h.id === 'string' && h.id.startsWith('osm-');
    if (isOsm) return;
    setSelected(null);
    navigation.navigate('HospitalDetail', { hospitalId: h.id, hospitalData: h });
  };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.kicker}>NEARBY HOSPITALS</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>{loading ? '…' : `${hospitals.length} found`}</Text>
          <View style={s.legend}>
            <LegendDot color={Colors.good} label="OPEN" />
            <LegendDot color={Colors.warn} label="LIMITED" />
            <LegendDot color={Colors.bad} label="FULL" />
          </View>
        </View>
      </View>

      {Platform.OS === 'web' && (
        <View style={s.webNote}>
          <MaterialCommunityIcons name="layers-outline" size={18} color={Colors.sub} />
          <Text style={s.webNoteText}>
            Native OSM map loads on iOS / Android. Browser preview shows list below.
          </Text>
        </View>
      )}

      <View style={s.mapBox}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
        ) : Platform.OS === 'web' ? (
          <ScrollView contentContainerStyle={{ padding: Sp.md, paddingBottom: 100 }}>
            {hospitals.map(h => (
              <TouchableOpacity key={h.id} style={s.listCard} onPress={() => openDetail(h)} activeOpacity={0.85}>
                <Text style={s.cardName}>{h.name}</Text>
                <Text style={s.cardBeds}>
                  G:{h.bed_av_general || 0} · ICU:{h.bed_av_icu || 0} · O₂:{h.bed_av_oxygen || 0}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <MapComponent
            userLocation={coords}
            hospitals={hospitals}
            onSelectHospital={(h) => setSelected(h)}
          />
        )}
      </View>

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <TouchableOpacity style={s.modalClose} onPress={() => setSelected(null)}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
            {selected && (
              <>
                <Text style={s.modalName}>{selected.name}</Text>
                <Text style={s.modalAddr}>{selected.address}</Text>
                <View style={s.bedRow}>
                  {['general', 'icu', 'oxygen'].map(type => {
                    const c = getBedCounts(selected)[type];
                    const labels = { general: 'GENERAL', icu: 'ICU', oxygen: 'OXYGEN' };
                    return (
                      <View key={type} style={s.bedBox}>
                        <Text style={s.bedNum}>{c.av}</Text>
                        <Text style={s.bedLbl}>{labels[type]}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.modalFooter}>
                  <Badge tone={STATUS_TONES[getAvailabilityStatus(selected)]}>
                    {STATUS_LABELS[getAvailabilityStatus(selected)]}
                  </Badge>
                  <TouchableOpacity style={s.detailBtn} onPress={() => openDetail(selected)}>
                    <Text style={s.detailBtnText}>VIEW DETAILS →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 52, paddingHorizontal: Sp.md, paddingBottom: Sp.sm },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text },
  legend: { alignItems: 'flex-end', gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, fontWeight: '700', color: Colors.sub },
  webNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Sp.md, marginBottom: Sp.sm,
    backgroundColor: '#fff', padding: Sp.md, borderRadius: Radii.md, ...Shadows.sm,
  },
  webNoteText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 18 },
  mapBox: { flex: 1 },
  listCard: {
    backgroundColor: '#fff', borderRadius: Radii.md, padding: Sp.md,
    marginBottom: Sp.sm, borderWidth: 1, borderColor: Colors.line,
  },
  cardName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  cardBeds: { fontSize: 13, color: Colors.sub, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Sp.lg, borderWidth: 2, borderColor: Colors.text,
  },
  modalClose: { alignSelf: 'flex-end' },
  modalName: { fontSize: 22, fontWeight: '900', color: Colors.text, marginTop: 4 },
  modalAddr: { fontSize: 14, color: Colors.sub, marginTop: 6, marginBottom: Sp.md },
  bedRow: { flexDirection: 'row', gap: 10 },
  bedBox: { flex: 1, backgroundColor: Colors.bg, borderRadius: Radii.md, padding: Sp.md, alignItems: 'center' },
  bedNum: { fontSize: 28, fontWeight: '900', color: Colors.text },
  bedLbl: { fontSize: 10, fontWeight: '800', color: Colors.sub, marginTop: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Sp.lg },
  detailBtn: { backgroundColor: Colors.text, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radii.md },
  detailBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
