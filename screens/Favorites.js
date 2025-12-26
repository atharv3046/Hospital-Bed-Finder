// screens/Favorites.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { getFavoriteIds, toggleFavorite } from './utils/favorites.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

export default function Favorites({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const ids = await getFavoriteIds();
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase.from('hospitals').select('*').in('id', ids);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      // console.log('Favorites load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRemove = async (id) => {
    await toggleFavorite(id);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const renderItem = ({ item, index }) => (
    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 50 }}>
      <Card style={s.card}>
        <View style={s.cardTop}>
          <View style={s.iconBox}>
            <MaterialCommunityIcons name="hospital-marker" size={24} color={Colors.primary} />
          </View>
          <View style={s.cardMain}>
            <View style={s.row}>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity onPress={() => onRemove(item.id)}>
                <MaterialCommunityIcons name="heart" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={s.type}>{item.type === 'Pvt' ? 'Private General' : 'Medical Center'}</Text>
          </View>
        </View>

        <Text style={s.addr} numberOfLines={2}>{item.address || 'Address listing unavailable'}</Text>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.detailsBtn} onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.id })}>
            <Text style={s.btnText}>View Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.callBtn} onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}>
            <MaterialCommunityIcons name="phone" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Card>
    </MotiView>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.hTitle}>Saved Facilities</Text>
        <Badge tone="accent">{rows.length} Hospitals</Badge>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="heart-outline" size={64} color={Colors.sub + '40'} />
            <Text style={s.emptyTitle}>No Favorites Yet</Text>
            <Text style={s.emptySub}>Hospitals you heart while searching will appear here for quick access.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadows.sm },
  hTitle: { fontSize: 24, fontWeight: '900', color: Colors.text },

  card: { marginBottom: 16, padding: Sp.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardMain: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: Colors.text, flex: 1 },
  type: { fontSize: 12, color: Colors.accent, fontWeight: '700', marginTop: 2 },

  addr: { fontSize: 13, color: Colors.sub, marginTop: 12, lineHeight: 18 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  detailsBtn: { flex: 1, backgroundColor: Colors.primary, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  callBtn: { width: 44, height: 44, backgroundColor: Colors.good, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 100, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.sub, textAlign: 'center', marginTop: 8 }
});
