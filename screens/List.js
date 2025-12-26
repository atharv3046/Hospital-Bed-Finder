// screens/List.js
import { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Linking, Alert, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Location from 'expo-location';
import { supabase } from '../supabase.js';
import { toggleFavorite, getFavoriteIds } from './utils/favorites.js';
import { discoverHospitals } from './utils/osm.js';
import MapComponent from './MapComponent.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

const { width } = Dimensions.get('window');
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const TYPES = ['All', 'Pvt', 'Gov', 'Sem'];

const HospitalCard = memo(({ item, favIds, navigation, onFavPress, onDirection, index }) => {
  const isFav = favIds.includes(item.id);
  const totalBeds = (item.bed_av_general || 0) + (item.bed_av_oxygen || 0) + (item.bed_av_icu || 0);

  const statusTone = totalBeds > 10 ? 'good' : totalBeds > 0 ? 'warn' : 'bad';
  const statusLabel = totalBeds > 10 ? 'Available' : totalBeds > 0 ? 'Limited' : 'Full';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: index * 100 }}
    >
      <Card
        onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.id })}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.sub} />
              <Text style={styles.cardAddr} numberOfLines={1}>{item.address || 'Location data unavailable'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => onFavPress(item.id)} hitSlop={10}>
            <MaterialCommunityIcons
              name={isFav ? "heart" : "heart-outline"}
              size={24}
              color={isFav ? "#EF4444" : Colors.sub}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <Text style={styles.distText}>
            <MaterialCommunityIcons name="navigation-variant" size={12} color={Colors.primary} /> {item.distance_km ?? '?'} km
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox label="GEN" count={item.bed_av_general} />
          <StatBox label="O2" count={item.bed_av_oxygen} />
          <StatBox label="ICU" count={item.bed_av_icu} />
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => onDirection(item.lat, item.lng)}
          >
            <MaterialCommunityIcons name="directions" size={18} color={Colors.primary} />
            <Text style={styles.dirBtnText}>Directions</Text>
          </TouchableOpacity>
          <View style={styles.flex} />
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.sub} />
        </View>
      </Card>
    </MotiView>
  );
});

const StatBox = ({ label, count }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statCount, { color: count > 0 ? Colors.good : Colors.text }]}>{count || 0}</Text>
  </View>
);

const SearchHeader = ({
  query, setQuery,
  showFilters, setShowFilters,
  radiusKm, setRadiusKm,
  hType, setHType,
  showMap, setShowMap
}) => (
  <View style={styles.header}>
    <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
        <TextInput
          style={styles.input}
          placeholder="Search hospitals..."
          placeholderTextColor={Colors.sub + '80'}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <TouchableOpacity
        style={[styles.iconBtn, showFilters && styles.iconBtnActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <MaterialCommunityIcons name="tune" size={20} color={showFilters ? '#fff' : Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setShowMap(!showMap)}
      >
        <MaterialCommunityIcons name={showMap ? "format-list-bulleted" : "map-outline"} size={20} color={Colors.text} />
      </TouchableOpacity>
    </View>

    <AnimatePresence>
      {showFilters && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 160 }}
          exit={{ opacity: 0, height: 0 }}
          style={styles.filterBox}
        >
          <Text style={styles.filterTitle}>SEARCH RADIUS</Text>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, radiusKm === r && styles.chipActive]}
                onPress={() => setRadiusKm(r)}
              >
                <Text style={[styles.chipText, radiusKm === r && styles.chipTextActive]}>{r}km</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterTitle}>FACILITY TYPE</Text>
          <View style={styles.chipRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, hType === t && styles.chipActive]}
                onPress={() => setHType(t)}
              >
                <Text style={[styles.chipText, hType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  </View>
);

export default function List() {
  const route = useRoute();
  const navigation = useNavigation();
  const [coords, setCoords] = useState(route.params?.coords || null);
  const [query, setQuery] = useState(route.params?.q || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [hType, setHType] = useState('All');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => { (async () => setFavIds(await getFavoriteIds()))(); }, []);

  useEffect(() => {
    if (!coords) {
      (async () => {
        setLocLoading(true);
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            if (newStatus !== 'granted') {
              Alert.alert('Permission Denied', 'Please enable location permissions.');
              setLocLoading(false);
              return;
            }
          }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (e) {
          console.error(e);
        } finally {
          setLocLoading(false);
        }
      })();
    }
  }, [coords]);

  const fetchNearby = useCallback(async () => {
    try {
      setLoading(true);
      if (!coords?.lat || !coords?.lng) {
        setLoading(false);
        return;
      }
      const osmHospitals = await discoverHospitals(coords.lat, coords.lng, radiusKm);
      const { data: dbHospitals, error } = await supabase.rpc('nearby_hospitals', {
        user_lat: coords.lat,
        user_lng: coords.lng,
        radius_km: parseFloat(radiusKm)
      });

      const combined = [...(dbHospitals || [])];
      const dbNames = new Set(combined.map(h => h.name.toLowerCase()));

      osmHospitals.forEach(oh => {
        if (!dbNames.has(oh.name.toLowerCase())) {
          combined.push({
            ...oh,
            id: `osm-${oh.lat}-${oh.lng}`,
            bed_av_icu: 0,
            bed_av_oxygen: 0,
            bed_av_general: 0,
            in_db: false
          });
        }
      });

      let list = combined;
      const qstr = debouncedQuery.toLowerCase().trim();

      // Filter by Type
      if (hType !== 'All') {
        list = list.filter(r => r.type === hType);
      }

      // Filter by Query
      if (qstr) {
        list = list.filter(r =>
          r.name.toLowerCase().includes(qstr) ||
          (r.address || '').toLowerCase().includes(qstr)
        );
      }

      list.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      setRows(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm, debouncedQuery]);

  useEffect(() => {
    fetchNearby();
    const sub = supabase.channel('hospitals-all').on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => fetchNearby()).subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchNearby]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNearby();
    setRefreshing(false);
  };

  const onDirection = useCallback((lat, lng) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`), []);
  const onFavPress = useCallback(async (id) => setFavIds(await toggleFavorite(id)), []);

  const headerElement = (
    <SearchHeader
      query={query} setQuery={setQuery}
      showFilters={showFilters} setShowFilters={setShowFilters}
      radiusKm={radiusKm} setRadiusKm={setRadiusKm}
      hType={hType} setHType={setHType}
      showMap={showMap} setShowMap={setShowMap}
    />
  );

  if (locLoading && !coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Detecting location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showMap ? (
        <View style={{ flex: 1 }}>
          {headerElement}
          <MapComponent userLocation={coords} hospitals={rows} />
        </View>
      ) : (
        <FlatList
          data={loading ? [1, 2, 3, 4] : rows}
          keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
          renderItem={({ item, index }) => loading ? (
            <SkeletonCard />
          ) : (
            <HospitalCard
              item={item}
              favIds={favIds}
              index={index}
              navigation={navigation}
              onFavPress={onFavPress}
              onDirection={onDirection}
            />
          )}
          ListHeaderComponent={headerElement}
          ListEmptyComponent={!loading && <View style={styles.empty}><Text style={styles.emptyText}>No facilities found in this area.</Text></View>}
          contentContainerStyle={{ padding: Sp.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skelCard}>
      <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={14} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width="30%" height={40} />
        <Skeleton width="30%" height={40} />
        <Skeleton width="30%" height={40} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: Colors.sub, fontWeight: '600' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },

  header: { marginBottom: Sp.md },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    height: 52,
    ...Shadows.sm
  },
  input: { flex: 1, marginLeft: 8, fontSize: 16, color: Colors.text, height: '100%' },
  iconBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm
  },
  iconBtnActive: { backgroundColor: Colors.primary },

  filterBox: { overflow: 'hidden', paddingHorizontal: 4 },
  filterTitle: { fontSize: 11, fontWeight: '900', color: Colors.sub, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: '#fff', ...Shadows.sm },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  chipTextActive: { color: '#fff' },

  card: { marginBottom: Sp.md, padding: Sp.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sp.sm },
  cardName: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text },
  cardAddr: { fontSize: 13, color: Colors.sub, marginLeft: 4 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp.md },
  distText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: Sp.md },
  statBox: { flex: 1, padding: 12, borderRadius: Radii.md, backgroundColor: Colors.bg, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '900', color: Colors.sub, marginBottom: 4 },
  statCount: { fontSize: 18, fontWeight: '900' },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: Sp.sm
  },
  dirBtn: { flexDirection: 'row', alignItems: 'center' },
  dirBtnText: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: Colors.primary },

  skelCard: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: 16, marginBottom: 12, ...Shadows.sm },
  empty: { padding: 80, alignItems: 'center' },
  emptyText: { color: Colors.sub, fontSize: 16, textAlign: 'center' }
});
