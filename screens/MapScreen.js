import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapComponent from './MapComponent';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { Badge, FilterChips, StatusLegend } from './ui/kit';
import {
  useNearbyHospitals, getAvailabilityStatus, STATUS_LABELS, STATUS_TONES,
  getBedCounts, BED_FILTERS, filterByBedType, displayAddress, isOsmId, hasBedData,
} from './utils/hospitals';

export default function MapScreen() {
  const navigation = useNavigation();
  const { coords, hospitals, loading, fromCache } = useNearbyHospitals(null, 25);
  const [selected, setSelected] = useState(null);
  const [bedFilter, setBedFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = filterByBedType(hospitals, bedFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(h =>
        h.name.toLowerCase().includes(q) || displayAddress(h).toLowerCase().includes(q)
      );
    }
    return list;
  }, [hospitals, bedFilter, search]);

  const openDetail = (h) => {
    if (isOsmId(h.id)) {
      setSelected(h);
      return;
    }
    setSelected(null);
    navigation.navigate('HospitalDetail', { hospitalId: h.id, hospitalData: h });
  };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.kicker}>NEARBY HOSPITALS</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>{loading ? '…' : `${filtered.length} on map`}</Text>
          <StatusLegend />
        </View>
        {fromCache && <Text style={s.cacheNote}>Last known data</Text>}
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
          <TextInput
            style={s.searchInput}
            placeholder="Search on map…"
            placeholderTextColor={Colors.sub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FilterChips options={BED_FILTERS} value={bedFilter} onChange={setBedFilter} />
        <View style={s.legendRow}>
          <LegendDot color="#22C55E" label="Open" />
          <LegendDot color="#F59E0B" label="Limited" />
          <LegendDot color="#EF4444" label="Full" />
          <LegendDot color="#94A3B8" label="No data" />
        </View>
      </View>

      {Platform.OS === 'web' && (
        <View style={s.webNote}>
          <MaterialCommunityIcons name="layers-outline" size={18} color={Colors.sub} />
          <Text style={s.webNoteText}>Colored pins & clustering on iOS/Android. List preview on web.</Text>
        </View>
      )}

      <View style={s.mapBox}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
        ) : Platform.OS === 'web' ? (
          <ScrollView contentContainerStyle={{ padding: Sp.md, paddingBottom: 100 }}>
            {filtered.map(h => (
              <TouchableOpacity key={h.id} style={s.listCard} onPress={() => openDetail(h)} activeOpacity={0.85}>
                <Text style={s.cardName}>{h.name}</Text>
                <Text style={s.cardBeds}>
                  {hasBedData(h)
                    ? `G:${h.bed_av_general || 0} · ICU:${h.bed_av_icu || 0} · O₂:${h.bed_av_oxygen || 0}`
                    : 'No bed data — staff registration needed'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <MapComponent userLocation={coords} hospitals={filtered} onSelectHospital={setSelected} />
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
                <Text style={s.modalAddr}>{displayAddress(selected)}</Text>
                <View style={s.bedRow}>
                  {['general', 'icu', 'oxygen'].map(type => {
                    const c = getBedCounts(selected)[type];
                    const labels = { general: 'GENERAL', icu: 'ICU', oxygen: 'OXYGEN' };
                    return (
                      <View key={type} style={s.bedBox}>
                        <Text style={s.bedNum}>{hasBedData(selected) ? c.av : '—'}</Text>
                        <Text style={s.bedLbl}>{labels[type]}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.modalFooter}>
                  <Badge tone={STATUS_TONES[getAvailabilityStatus(selected)]}>
                    {STATUS_LABELS[getAvailabilityStatus(selected)]}
                  </Badge>
                  {!isOsmId(selected.id) ? (
                    <TouchableOpacity style={s.detailBtn} onPress={() => openDetail(selected)}>
                      <Text style={s.detailBtnText}>VIEW DETAILS →</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={s.osmHint}>Register in Staff Dashboard to add beds</Text>
                  )}
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
  header: { paddingTop: 52, paddingHorizontal: Sp.md, paddingBottom: Sp.xs },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text, flex: 1 },
  cacheNote: { fontSize: 12, color: Colors.warn, fontWeight: '600', marginTop: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: Radii.pill, paddingHorizontal: Sp.md, height: 42, marginTop: Sp.sm, ...Shadows.sm,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.text },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: Sp.sm, marginBottom: Sp.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontWeight: '700', color: Colors.sub },
  webNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Sp.md, marginBottom: Sp.sm,
    backgroundColor: '#fff', padding: Sp.sm, borderRadius: Radii.md,
  },
  webNoteText: { flex: 1, fontSize: 12, color: Colors.sub },
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
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Sp.lg, flexWrap: 'wrap', gap: 8 },
  detailBtn: { backgroundColor: Colors.text, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radii.md },
  detailBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  osmHint: { fontSize: 12, color: Colors.sub, fontStyle: 'italic', flex: 1 },
});
