// screens/StaffDashboard.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, Badge, Skeleton } from './ui/kit';

export default function StaffDashboard({ navigation }) {
    const { user, profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [emergencyRequests, setEmergencyRequests] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isStaff, setIsStaff] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            const hasAccess = profile.role === 'staff' || profile.role === 'admin';
            setIsStaff(hasAccess);
            if (hasAccess) {
                fetchRequests();
                fetchEmergencies();
            }
            setLoading(false);
        } else if (!user) {
            setLoading(false);
        }
    }, [user, profile]);

    const fetchRequests = async (showRefresh = true) => {
        if (showRefresh) setRefreshing(true);
        const { data, error } = await supabase
            .from('bookings')
            .select('*, profiles(full_name)')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });

        if (!error) setRequests(data || []);
        setRefreshing(false);
        setLoading(false);
    };

    const fetchEmergencies = async () => {
        const { data, error } = await supabase
            .from('emergency_requests')
            .select('*')
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false });

        if (!error) setEmergencyRequests(data || []);
    };

    useEffect(() => {
        if (!user || !isStaff) return;
        const bookingsSub = supabase.channel('staff-portal-bookings').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => fetchRequests(false)).subscribe();
        const emergencySub = supabase.channel('staff-portal-emergencies').on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, () => fetchEmergencies()).subscribe();

        return () => {
            supabase.removeChannel(bookingsSub);
            supabase.removeChannel(emergencySub);
        };
    }, [user, isStaff]);

    const updateStatus = async (booking, newStatus) => {
        try {
            if (newStatus === 'CONFIRMED') {
                const { error } = await supabase.rpc('confirm_booking', {
                    booking_id: booking.id,
                    h_id: booking.hospital_id,
                    b_type: booking.bed_type
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
                if (error) throw error;
            }
            fetchRequests(false);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const resolveEmergency = async (id) => {
        const { error } = await supabase.from('emergency_requests').update({ status: 'RESOLVED' }).eq('id', id);
        if (error) Alert.alert('Error', error.message);
        else fetchEmergencies();
    };

    const renderEmergency = ({ item }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[s.card, { borderColor: Colors.bad, borderLeftWidth: 6 }]}
        >
            <View style={s.cardTop}>
                <View style={s.patientInfo}>
                    <Text style={[s.pName, { color: Colors.bad }]}>🚨 EMERGENCY: {item.patient_name}</Text>
                    <Text style={s.pAge}>{item.patient_age} Years • {item.severity} severity</Text>
                </View>
                <Badge tone="bad">CRITICAL</Badge>
            </View>

            <View style={s.conditionBox}>
                <Text style={[s.conditionLabel, { color: Colors.bad }]}>NATURE OF EMERGENCY</Text>
                <Text style={s.conditionText}>{item.nature_of_emergency}</Text>
                <Text style={[s.conditionLabel, { marginTop: 8, color: Colors.bad }]}>LOCATION</Text>
                <Text style={s.conditionText}>{item.location_text}</Text>
            </View>

            <View style={s.contactStrip}>
                <MaterialCommunityIcons name="phone-incoming" size={16} color={Colors.bad} />
                <Text style={[s.phoneText, { color: Colors.bad }]}>{item.contact_number}</Text>
            </View>

            <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.bad }]} onPress={() => resolveEmergency(item.id)}>
                <Text style={s.acceptText}>Mark as Resolved</Text>
            </TouchableOpacity>
        </MotiView>
    );

    const renderItem = ({ item, index }) => (
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 50 }}>
            <Card style={s.card}>
                <View style={s.cardTop}>
                    <View style={s.patientInfo}>
                        <Text style={s.pName}>{item.patient_name}</Text>
                        <Text style={s.pAge}>{item.age} Years • {item.bed_type} Bed</Text>
                    </View>
                    <View style={s.timeBox}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.sub} />
                        <Text style={s.timeText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>

                <View style={s.conditionBox}>
                    <Text style={s.conditionLabel}>CONDITION</Text>
                    <Text style={s.conditionText} numberOfLines={2}>{item.condition || 'Priority admission requested'}</Text>
                </View>

                <View style={s.contactStrip}>
                    <MaterialCommunityIcons name="phone" size={16} color={Colors.primary} />
                    <Text style={s.phoneText}>{item.contact_phone}</Text>
                </View>

                <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtn, s.rejectBtn]} onPress={() => updateStatus(item, 'REJECTED')}>
                        <Text style={s.rejectText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.acceptBtn]} onPress={() => updateStatus(item, 'CONFIRMED')}>
                        <Text style={s.acceptText}>Confirm Bed</Text>
                    </TouchableOpacity>
                </View>
            </Card>
        </MotiView>
    );

    if (loading) return <View style={s.center}><ActivityIndicator color={Colors.primary} /></View>;

    if (!isStaff) {
        return (
            <View style={s.center}>
                <MaterialCommunityIcons name="lock-alert" size={64} color={Colors.bad} />
                <Text style={s.unauthTitle}>Restricted Access</Text>
                <Text style={s.unauthSub}>This area is reserved for authorized medical hospital staff only.</Text>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.hTitle}>Staff Portal</Text>
                    <Badge tone="warn">{requests.length} Bed Requests</Badge>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddHospital')}>
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={s.addBtnText}>Facility</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={requests}
                keyExtractor={i => i.id}
                ListHeaderComponent={
                    <View>
                        {emergencyRequests.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[s.sectionHeader, { color: Colors.bad }]}>URGENT DISPATCHES</Text>
                                {emergencyRequests.map(er => (
                                    <View key={er.id} style={{ marginBottom: 16 }}>
                                        {renderEmergency({ item: er })}
                                    </View>
                                ))}
                                <View style={s.divider} />
                                <Text style={s.sectionHeader}>BED ADMISSION REQUESTS</Text>
                            </View>
                        )}
                    </View>
                }
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { fetchRequests(); fetchEmergencies(); }} tintColor={Colors.primary} />}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    !emergencyRequests.length && (
                        <View style={s.empty}>
                            <MaterialCommunityIcons name="check-all" size={64} color={Colors.good + '40'} />
                            <Text style={s.emptyTitle}>All Clear</Text>
                            <Text style={s.emptySub}>No pending admission requests at the moment.</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    unauthTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 16 },
    unauthSub: { fontSize: 14, color: Colors.sub, textAlign: 'center', marginTop: 8 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        ...Shadows.sm
    },
    hTitle: { fontSize: 24, fontWeight: '900', color: Colors.text, marginBottom: 4 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.pill },
    addBtnText: { color: '#fff', fontWeight: '800', marginLeft: 4 },
    sectionHeader: { fontSize: 13, fontWeight: '900', color: Colors.sub, letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    divider: { height: 1, backgroundColor: Colors.line, marginVertical: 20 },

    card: { marginBottom: 16, padding: Sp.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    pName: { fontSize: 18, fontWeight: '800', color: Colors.text },
    pAge: { fontSize: 13, color: Colors.accent, fontWeight: '700', marginTop: 2 },
    timeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, padding: 6, borderRadius: 8 },
    timeText: { fontSize: 11, fontWeight: '700', color: Colors.sub, marginLeft: 4 },

    conditionBox: { backgroundColor: Colors.bg, padding: 12, borderRadius: 12, marginBottom: 12 },
    conditionLabel: { fontSize: 10, fontWeight: '900', color: Colors.sub, letterSpacing: 1, marginBottom: 4 },
    conditionText: { fontSize: 14, color: Colors.text, lineHeight: 18 },

    contactStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    phoneText: { marginLeft: 8, fontSize: 14, fontWeight: '700', color: Colors.primary },

    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 48, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { backgroundColor: Colors.bg },
    acceptBtn: { backgroundColor: Colors.good },
    rejectText: { color: Colors.sub, fontWeight: '800' },
    acceptText: { color: '#fff', fontWeight: '800' },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: Colors.sub, marginTop: 8 }
});
