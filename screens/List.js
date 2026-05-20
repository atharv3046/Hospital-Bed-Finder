// screens/List.js — Hospital search with filter dropdowns
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Linking, Alert, RefreshControl, Dimensions,
  ActivityIndicator, Modal, ScrollView, Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../supabase.js';
import { discoverHospitals } from './utils/osm.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';

const { width } = Dimensions.get('window');

const REQUIREMENTS = ['Hospital Bed', 'ICU Bed', 'Oxygen Bed', 'Ventilator'];
const BED_TYPES = ['All Types', 'General', 'Oxygen Bed', 'ICU'];
const SPECIALISTS = ['All', 'Pulmonologist', 'Cardiologist', 'Neurologist', 'Orthopedist'];
const DISTANCES = ['5 km²', '10 km²', '25 km²', '50 km²', '100 km²'];
const HOSP_TYPES = ['All', 'Private', 'Government', 'Semi-Govt'];

function DropdownPicker({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dp.wrap}>
      <Text style={dp.label}>{label}</Text>
      <TouchableOpacity style={dp.box} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={dp.value}>{value}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={dp.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={dp.sheet}>
            <Text style={dp.sheetTitle}>{label}</Text>
            {options.map(o => (
              <TouchableOpacity
                key={o}
                style={[dp.option, value === o && dp.optionActive]}
                onPress={() => { onChange(o); setOpen(false); }}
              >
                <Text style={[dp.optionText, value === o && dp.optionTextActive]}>{o}</Text>
                {value === o && <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function HospitalCard({ item, navigation }) {
  const totalBeds = (item.bed_av_general || 0) + (item.bed_av_oxygen || 0) + (item.bed_av_icu || 0);
  const bedColor = totalBeds > 10 ? Colors.good : totalBeds > 0 ? Colors.warn : Colors.bad;
  const typeLabel = item.type === 'Pvt' ? 'Pvt.' : item.type === 'Gov' ? 'Gov.' : 'Sem.';
  const isOsm = typeof item.id === 'string' && item.id.startsWith('osm-');

  const openHospital = () => {
    if (isOsm) {
      // OSM hospitals don't have Supabase data — open Google search
      const query = encodeURIComponent(`${item.name} hospital ${item.address || ''}`);
      Linking.openURL(`https://www.google.com/search?q=${query}`);
    } else {
      navigation.navigate('HospitalDetail', { hospitalId: item.id, hospitalData: item });
    }
  };

  return (
    <TouchableOpacity style={hc.card} onPress={openHospital} activeOpacity={0.7}>
      <View style={hc.row}>
        <View style={{ flex: 1 }}>
          <Text style={hc.name}>{item.name}</Text>
          <Text style={hc.type}>{typeLabel}{isOsm ? ' • via OSM' : ''}</Text>
        </View>
      </View>
      <Text style={hc.addr} numberOfLines={2}>{item.address || 'Address not available'}</Text>
      <View style={hc.footer}>
        <TouchableOpacity
          style={[hc.bedChip, { backgroundColor: bedColor }]}
          onPress={openHospital}
        >
          <Text style={hc.bedText}>{totalBeds} Beds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={hc.callBtn}
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
        >
          <MaterialCommunityIcons name="phone-outline" size={16} color="#fff" />
          <Text style={hc.callText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={hc.expandBtn}
          onPress={openHospital}
        >
          <MaterialCommunityIcons name={isOsm ? "open-in-new" : "chevron-down"} size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function List() {
  const route = useRoute();
  const navigation = useNavigation();
  const [coords, setCoords] = useState(route.params?.coords || null);
  const [placeLabel, setPlaceLabel] = useState('Searching…');
  const [subLabel, setSubLabel] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(route.params?.q || '');

  // Filters
  const [requirement, setRequirement] = useState('Hospital Bed');
  const [bedType, setBedType] = useState('All Types');
  const [specialist, setSpecialist] = useState('All');
  const [distance, setDistance] = useState('10 km²');
  const [hospType, setHospType] = useState('All');

  const radiusKm = parseInt(distance);

  useEffect(() => {
    if (!coords) getLocation();
    else reverseGeocode(coords);
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let fs = status;
      if (fs !== 'granted') {
        const { status: s } = await Location.requestForegroundPermissionsAsync();
        fs = s;
      }
      if (fs !== 'granted') { setPlaceLabel('Location denied'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(c);
      reverseGeocode(c);
    } catch { setPlaceLabel('Location unavailable'); }
  };

  const reverseGeocode = async (c) => {
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
      if (addr) {
        setPlaceLabel(addr.city || addr.district || addr.region || 'My Location');
        setSubLabel([addr.street, addr.subregion].filter(Boolean).join(', '));
      }
    } catch { }
  };

  const fetchNearby = useCallback(async () => {
    if (!coords?.lat) { setLoading(false); return; }
    try {
      setLoading(true);

      // Run OSM and Supabase in PARALLEL instead of sequentially
      const [osmResult, dbResult] = await Promise.allSettled([
        discoverHospitals(coords.lat, coords.lng, radiusKm),
        supabase.rpc('nearby_hospitals', {
          user_lat: coords.lat,
          user_lng: coords.lng,
          radius_km: parseFloat(radiusKm),
        }),
      ]);

      const osmHospitals = osmResult.status === 'fulfilled' ? osmResult.value : [];
      const dbHospitals = dbResult.status === 'fulfilled' ? (dbResult.value?.data || []) : [];

      const combined = [...dbHospitals];
      const dbNames = new Set(combined.map(h => h.name.toLowerCase()));
      osmHospitals.forEach(oh => {
        if (!dbNames.has(oh.name.toLowerCase())) {
          combined.push({ ...oh, id: `osm-${oh.lat}-${oh.lng}`, bed_av_icu: 0, bed_av_oxygen: 0, bed_av_general: 0 });
        }
      });

      let list = combined;

      // Apply type filter
      if (hospType !== 'All') {
        const map = { Private: 'Pvt', Government: 'Gov', 'Semi-Govt': 'Sem' };
        list = list.filter(h => h.type === map[hospType]);
      }

      // Apply search text
      const q = searchText.toLowerCase().trim();
      if (q) list = list.filter(h => h.name.toLowerCase().includes(q) || (h.address || '').toLowerCase().includes(q));

      list.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      setRows(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coords, radiusKm, hospType, searchText]);

  useEffect(() => { if (coords) fetchNearby(); }, [fetchNearby]);

  return (
    <View style={s.container}>
      {/* Location Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.locRow} onPress={getLocation}>
          <MaterialCommunityIcons name="map-marker" size={18} color={Colors.primary} />
          <View style={{ marginLeft: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={s.locTitle}>{placeLabel}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.primary} />
            </View>
            {!!subLabel && <Text style={s.locSub} numberOfLines={1}>{subLabel}</Text>}
          </View>
        </TouchableOpacity>

        {/* Search + filter */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
            <TextInput
              style={s.searchInput}
              placeholder="Search Location"
              placeholderTextColor={Colors.sub}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            style={[s.filterBtn, showFilters && s.filterBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter Dropdowns */}
        {showFilters && (
          <View style={s.filterPanel}>
            <DropdownPicker label="Requirement" value={requirement} options={REQUIREMENTS} onChange={setRequirement} />
            <DropdownPicker label="Type" value={bedType} options={BED_TYPES} onChange={setBedType} />
            <DropdownPicker label="Specialist" value={specialist} options={SPECIALISTS} onChange={setSpecialist} />
            <DropdownPicker label="Distance in km square" value={distance} options={DISTANCES} onChange={setDistance} />
            <DropdownPicker label="Hospital Type" value={hospType} options={HOSP_TYPES} onChange={setHospType} />
            <TouchableOpacity style={s.okBtn} onPress={() => { setShowFilters(false); fetchNearby(); }}>
              <Text style={s.okText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Hospital list */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <HospitalCard item={item} navigation={navigation} />}
          contentContainerStyle={{ padding: Sp.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNearby(); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialCommunityIcons name="hospital-off" size={56} color={Colors.sub + '60'} />
              <Text style={s.emptyText}>No hospitals found nearby.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// Dropdown styles
const dp = StyleSheet.create({
  wrap: { marginBottom: Sp.sm },
  label: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 4, marginLeft: 2 },
  box: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: Radii.md, height: 48,
    paddingHorizontal: Sp.md, ...Shadows.sm,
  },
  value: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Sp.lg },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: Sp.md },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line },
  optionActive: { backgroundColor: Colors.bg, borderRadius: Radii.sm, paddingHorizontal: Sp.sm },
  optionText: { fontSize: 15, color: Colors.text },
  optionTextActive: { fontWeight: '800', color: Colors.primary },
});

// Hospital card styles
const hc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: Radii.md, padding: Sp.md,
    marginBottom: Sp.sm, borderWidth: 1, borderColor: Colors.line, ...Shadows.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '800', color: Colors.text },
  type: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  addr: { fontSize: 13, color: Colors.sub, lineHeight: 18, marginBottom: Sp.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  bedChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radii.pill },
  bedText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: Radii.pill,
  },
  callText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  expandBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  header: { backgroundColor: Colors.bg, paddingHorizontal: Sp.md, paddingTop: 50, paddingBottom: Sp.sm },

  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Sp.md },
  locTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginRight: 2 },
  locSub: { fontSize: 12, color: Colors.sub, maxWidth: width - 80 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: Sp.sm, alignItems: 'center' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radii.pill, paddingHorizontal: Sp.md, height: 46,
    ...Shadows.sm,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.text },
  filterBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: Colors.tealBtn, alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: Colors.primary },

  filterPanel: {
    backgroundColor: Colors.bg, borderRadius: Radii.lg,
    padding: Sp.md, marginBottom: Sp.sm,
    borderWidth: 1, borderColor: Colors.line,
  },
  okBtn: {
    alignSelf: 'flex-end', backgroundColor: Colors.primary,
    paddingVertical: 10, paddingHorizontal: 32,
    borderRadius: Radii.md, marginTop: Sp.sm,
  },
  okText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: Colors.sub, fontSize: 15, textAlign: 'center' },
});
