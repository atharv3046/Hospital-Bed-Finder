import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Linking, RefreshControl, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Sp, Shadows } from './ui/theme';
import { Badge, BedProgressBar, FilterChips, StatusLegend } from './ui/kit';
import {
  useNearbyHospitals, BED_FILTERS, filterByBedType, getAvailabilityStatus,
  STATUS_LABELS, STATUS_TONES, formatDistance, getBedCounts, hasBedData,
  displayAddress, formatLastUpdated, isPersistentlyFull, isOsmId,
} from './utils/hospitals';

function HospitalCard({ item, navigation, bedFilter, fromCache }) {
  const status = getAvailabilityStatus(item, bedFilter);
  const registered = hasBedData(item);
  const beds = getBedCounts(item);
  const persistentFull = isPersistentlyFull(item);
  const updated = formatLastUpdated(item.updated_at);

  const openDetail = () => {
    if (isOsmId(item.id)) {
      Alert.alert(item.name, displayAddress(item));
      return;
    }
    navigation.navigate('HospitalDetail', { hospitalId: item.id, hospitalData: item });
  };

  const call = () => item.phone && Linking.openURL(`tel:${item.phone}`);
  const directions = () => {
    if (item.lat && item.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`);
    }
  };

  const bedTypes = [
    { key: 'general', label: 'GENERAL', ...beds.general },
    { key: 'icu', label: 'ICU', ...beds.icu },
    { key: 'oxygen', label: 'OXYGEN', ...beds.oxygen },
  ];

  const cardStyle = [
    hc.card,
    status === 'full' && registered && hc.cardFull,
    status === 'unknown' && hc.cardUnknown,
  ];

  return (
    <TouchableOpacity style={cardStyle} onPress={openDetail} activeOpacity={0.85}>
      <View style={hc.top}>
        <View style={{ flex: 1 }}>
          <Text style={hc.name}>{item.name}</Text>
          <Text style={hc.addr} numberOfLines={2}>{displayAddress(item)}</Text>
          {updated && <Text style={hc.updated}>{fromCache ? `Last known · ${updated}` : updated}</Text>}
          {persistentFull && (
            <Text style={hc.warn}>⚠ Full for 2+ hours — consider calling ahead</Text>
          )}
        </View>
        <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
      </View>

      <View style={hc.bedGrid}>
        {bedTypes.map(b => (
          <View key={b.key} style={hc.bedCol}>
            <Text style={hc.bedLbl}>{b.label}</Text>
            <Text style={[hc.bedNums, { color: !registered ? Colors.sub : b.av > 0 ? Colors.good : Colors.bad }]}>
              {registered ? b.av : '—'}
              <Text style={hc.bedTotal}> / {registered ? b.total : '—'}</Text>
            </Text>
            <BedProgressBar available={b.av} total={b.total} height={4} style={{ marginTop: 6 }} unknown={!registered} />
          </View>
        ))}
      </View>

      <View style={hc.footer}>
        <Text style={hc.dist}>{formatDistance(item.distance_km)}</Text>
        <View style={hc.actions}>
          {!!item.phone && (
            <TouchableOpacity style={hc.iconBtn} onPress={call}>
              <MaterialCommunityIcons name="phone" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={hc.iconBtn} onPress={directions}>
            <MaterialCommunityIcons name="navigation" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openDetail}>
            <Text style={hc.details}>DETAILS ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function List() {
  const navigation = useNavigation();
  const { hospitals, loading, refreshing, refresh, fromCache } = useNearbyHospitals(null, 25);
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

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.kicker}>NEARBY HOSPITALS</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>Sorted by distance</Text>
          <StatusLegend />
        </View>
        <Text style={s.count}>{loading ? '…' : `${filtered.length} found`}</Text>
        {fromCache && (
          <Text style={s.cacheNote}>Showing last known data — pull to refresh</Text>
        )}
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
          <TextInput
            style={s.searchInput}
            placeholder="Search hospitals…"
            placeholderTextColor={Colors.sub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FilterChips options={BED_FILTERS} value={bedFilter} onChange={setBedFilter} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <HospitalCard item={item} navigation={navigation} bedFilter={bedFilter} fromCache={fromCache} />
          )}
          contentContainerStyle={{ padding: Sp.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialCommunityIcons name="hospital-building" size={56} color={Colors.sub + '60'} />
              <Text style={s.emptyText}>No hospitals match your search.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const hc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Sp.md,
    marginBottom: Sp.sm, borderWidth: 1, borderColor: Colors.line, ...Shadows.sm,
  },
  cardFull: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cardUnknown: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 17, fontWeight: '800', color: Colors.text },
  addr: { fontSize: 13, color: Colors.sub, marginTop: 4, lineHeight: 18 },
  updated: { fontSize: 11, color: Colors.sub, marginTop: 4, fontStyle: 'italic' },
  warn: { fontSize: 11, color: Colors.warn, fontWeight: '700', marginTop: 4 },
  bedGrid: {
    flexDirection: 'row', gap: 8, marginTop: Sp.md,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: Radii.md, padding: Sp.sm,
  },
  bedCol: { flex: 1 },
  bedLbl: { fontSize: 9, fontWeight: '800', color: Colors.sub },
  bedNums: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  bedTotal: { fontSize: 12, fontWeight: '600', color: Colors.sub },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Sp.md },
  dist: { fontSize: 13, color: Colors.sub, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  details: { fontSize: 12, fontWeight: '800', color: Colors.primary },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 52, paddingHorizontal: Sp.md, paddingBottom: Sp.xs },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.sub, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text, flex: 1 },
  count: { fontSize: 13, color: Colors.sub, marginTop: 4 },
  cacheNote: { fontSize: 12, color: Colors.warn, fontWeight: '600', marginTop: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: Radii.pill, paddingHorizontal: Sp.md, height: 44, marginTop: Sp.sm, ...Shadows.sm,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.text },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: Colors.sub, fontSize: 15, textAlign: 'center', paddingHorizontal: Sp.lg },
});
