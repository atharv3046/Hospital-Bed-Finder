// screens/MyBookings.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

export default function MyBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = async (showLoading = false) => {
        if (!user) return;
        if (showLoading) setLoading(true);

        const [bRes, eRes] = await Promise.all([
            supabase.from('bookings').select('*, hospitals(name, phone, address)').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('emergency_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        if (!bRes.error) setBookings(bRes.data || []);
        else console.error('Bookings Fetch Error:', bRes.error);

        if (!eRes.error) setEmergencies(eRes.data || []);
        else console.error('Emergencies Fetch Error:', eRes.error);

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchAll(true);
        const bSub = supabase.channel(`my-bookings-${user?.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user?.id}` }, () => fetchAll()).subscribe();
        const eSub = supabase.channel(`my-emergencies-${user?.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests', filter: `user_id=eq.${user?.id}` }, () => fetchAll()).subscribe();

        return () => {
            supabase.removeChannel(bSub);
            supabase.removeChannel(eSub);
        };
    }, [user]);

    const renderItem = ({ item, index }) => {
        const tone = item.status === 'CONFIRMED' ? 'good' : item.status === 'PENDING' ? 'warn' : 'bad';
        const icon = item.status === 'CONFIRMED' ? 'check-circle' : item.status === 'PENDING' ? 'clock-outline' : 'close-circle';

        return (
            <MotiView
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 400, delay: index * 100 }}
            >
                <Card style={s.card}>
                    <View style={s.cardHeader}>
                        <View style={s.iconCircle}>
                            <MaterialCommunityIcons name="hospital-building" size={24} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.hName}>{item.hospitals?.name}</Text>
                            <Text style={s.hAddr} numberOfLines={1}>{item.hospitals?.address}</Text>
                        </View>
                        <Badge tone={tone}>{item.status}</Badge>
                    </View>

                    <View style={s.divider} />

                    <View style={s.details}>
                        <DetailItem icon="account" label="Patient" value={item.patient_name} />
                        <DetailItem icon="bed-outline" label="Bed Type" value={item.bed_type} />
                        <DetailItem icon="calendar" label="Requested" value={new Date(item.created_at).toLocaleDateString()} />
                    </View>

                    {item.note && (
                        <View style={s.noteBox}>
                            <MaterialCommunityIcons name="message-text-outline" size={16} color={Colors.accent} />
                            <Text style={s.noteText}>{item.note}</Text>
                        </View>
                    )}
                </Card>
            </MotiView>
        );
    };

    if (loading) {
        return (
            <View style={s.container}>
                <FlatList
                    data={[1, 2, 3]}
                    renderItem={() => (
                        <View style={{ padding: 16 }}>
                            <Skeleton width="100%" height={120} style={{ borderRadius: 16 }} />
                        </View>
                    )}
                    keyExtractor={i => i.toString()}
                />
            </View>
        );
    }

    const renderEmergency = ({ item, index }) => {
        const tone = item.status === 'RESOLVED' ? 'good' : 'bad';
        return (
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 50 }}>
                <Card style={[s.card, { borderColor: Colors.bad, borderLeftWidth: 4 }]}>
                    <View style={s.cardHeader}>
                        <View style={[s.iconCircle, { backgroundColor: Colors.bad + '10' }]}>
                            <MaterialCommunityIcons name="alert-decagram" size={24} color={Colors.bad} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[s.hName, { color: Colors.bad }]}>Emergency Alert: {item.nature_of_emergency}</Text>
                            <Text style={s.hAddr} numberOfLines={1}>{item.location_text}</Text>
                        </View>
                        <Badge tone={tone}>{item.status}</Badge>
                    </View>
                    <View style={s.divider} />
                    <View style={s.details}>
                        <DetailItem icon="account" label="Patient" value={item.patient_name} />
                        <DetailItem icon="alert-outline" label="Severity" value={item.severity} />
                        <DetailItem icon="calendar" label="Broadcasted" value={new Date(item.created_at).toLocaleTimeString()} />
                    </View>
                </Card>
            </MotiView>
        );
    };

    return (
        <View style={s.container}>
            <FlatList
                data={[...emergencies.map(e => ({ ...e, isEmergency: true })), ...bookings]}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => item.isEmergency ? renderEmergency({ item, index }) : renderItem({ item, index })}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(false)} tintColor={Colors.primary} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color={Colors.sub + '40'} />
                        <Text style={s.emptyTitle}>No Active Requests</Text>
                        <Text style={s.emptySub}>Your bed booking history and active emergency alerts will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <View style={s.detailItem}>
            <View style={s.row}>
                <MaterialCommunityIcons name={icon} size={14} color={Colors.sub} />
                <Text style={s.detailLabel}>{label}</Text>
            </View>
            <Text style={s.detailValue}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    card: { marginBottom: 16, padding: Sp.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Sp.md },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
    hName: { fontSize: 16, fontWeight: '800', color: Colors.text },
    hAddr: { fontSize: 12, color: Colors.sub, marginTop: 2 },

    divider: { height: 1, backgroundColor: Colors.line, marginBottom: Sp.md },

    details: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { fontSize: 10, fontWeight: '900', color: Colors.sub, marginLeft: 4, textTransform: 'uppercase' },
    detailValue: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 4 },

    noteBox: {
        marginTop: Sp.md,
        backgroundColor: Colors.accent + '08',
        padding: 12,
        borderRadius: Radii.md,
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    noteText: { flex: 1, marginLeft: 8, fontSize: 13, color: Colors.text, fontStyle: 'italic' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: Colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
