// screens/GeneralHospitals.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

export default function GeneralHospitals({ navigation }) {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => { fetchHospitals(); }, []);

    const fetchHospitals = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('hospitals').select('*').order('name', { ascending: true });
        if (!error) setHospitals(data || []);
        setLoading(false);
    };

    const filtered = hospitals.filter(h =>
        h.name.toLowerCase().includes(query.toLowerCase()) ||
        (h.address || '').toLowerCase().includes(query.toLowerCase())
    );

    const renderItem = ({ item, index }) => (
        <MotiView from={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 50 }}>
            <TouchableOpacity onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.id })} activeOpacity={0.9}>
                <Card style={s.card}>
                    <View style={s.cardLeft}>
                        <View style={s.iconBox}>
                            <MaterialCommunityIcons name="hospital-building" size={24} color={Colors.primary} />
                        </View>
                    </View>
                    <View style={s.cardMain}>
                        <View style={s.row}>
                            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                            <Badge tone={item.type === 'Pvt' ? 'warn' : 'good'}>{item.type || 'Pvt'}</Badge>
                        </View>
                        <Text style={s.addr} numberOfLines={1}>{item.address || 'Address registered privately'}</Text>
                        <View style={s.footer}>
                            <View style={s.fItem}>
                                <MaterialCommunityIcons name="bed-outline" size={14} color={Colors.sub} />
                                <Text style={s.fText}>{(item.bed_total_icu || 0) + (item.bed_total_general || 0)} Total</Text>
                            </View>
                            <View style={s.fItem}>
                                <MaterialCommunityIcons name="phone-outline" size={14} color={Colors.sub} />
                                <Text style={s.fText} numberOfLines={1}>{item.phone || 'Registry'}</Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        </MotiView>
    );

    return (
        <View style={s.container}>
            <View style={s.header}>
                <View style={s.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color={Colors.sub} />
                    <TextInput
                        style={s.input}
                        placeholder="Search global registry..."
                        value={query}
                        onChangeText={setQuery}
                        placeholderTextColor={Colors.sub + '80'}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.sub} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <FlatList
                    data={[1, 2, 3, 4, 5, 6]}
                    renderItem={() => <View style={{ padding: 16 }}><Skeleton width="100%" height={80} style={{ borderRadius: 16 }} /></View>}
                    keyExtractor={i => i.toString()}
                />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <MaterialCommunityIcons name="database-off-outline" size={64} color={Colors.sub + '40'} />
                            <Text style={s.emptyTitle}>No Records Found</Text>
                            <Text style={s.emptySub}>Try searching for a different city or hospital name.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', ...Shadows.sm },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: Radii.md, paddingHorizontal: 12, height: 48 },
    input: { flex: 1, marginLeft: 10, fontSize: 16, color: Colors.text, fontWeight: '500' },

    card: { flexDirection: 'row', marginBottom: 12, padding: 12, alignItems: 'center' },
    cardLeft: { marginRight: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
    cardMain: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '800', color: Colors.text, flex: 1, marginRight: 8 },
    addr: { fontSize: 12, color: Colors.sub, marginTop: 2, marginBottom: 8 },

    footer: { flexDirection: 'row', gap: 16 },
    fItem: { flexDirection: 'row', alignItems: 'center' },
    fText: { fontSize: 11, fontWeight: '700', color: Colors.sub, marginLeft: 4 },

    empty: { alignItems: 'center', marginTop: 100, padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: Colors.sub, textAlign: 'center', marginTop: 8 }
});
