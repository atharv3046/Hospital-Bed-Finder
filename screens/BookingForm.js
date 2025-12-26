// screens/BookingForm.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { PrimaryButton, Card } from './ui/kit';

export default function BookingForm({ route, navigation }) {
    const { hospital, bedType } = route.params || {};
    const { user, profile } = useAuth();

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        patientName: profile?.full_name || '',
        age: '',
        condition: '',
        contactPhone: profile?.phone || '',
    });

    const handleSubmit = async () => {
        if (!form.patientName || !form.age || !form.contactPhone) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('bookings').insert({
                user_id: user.id,
                hospital_id: hospital.id,
                patient_name: form.patientName,
                age: parseInt(form.age),
                condition: form.condition,
                contact_phone: form.contactPhone,
                bed_type: bedType,
                status: 'PENDING'
            });

            if (error) throw error;

            Alert.alert('Request Sent', 'Your bedside request is registered. Track updates in My Bookings.', [
                { text: 'GO TO REQUESTS', onPress: () => navigation.navigate('MainTabs', { screen: 'My Bookings' }) }
            ]);
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card style={s.headerCard}>
                        <View style={s.hIcon}>
                            <MaterialCommunityIcons name="clipboard-text-clock" size={32} color={Colors.primary} />
                        </View>
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={s.hTitle} numberOfLines={1}>{hospital?.name}</Text>
                            <Text style={s.hSub}>Requesting {bedType} Bed Admission</Text>
                        </View>
                    </Card>
                </MotiView>

                <MotiView from={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 200 }}>
                    <Text style={s.sectionHeader}>Patient Information</Text>

                    <FormInput
                        label="Patient Name"
                        value={form.patientName}
                        onChange={t => setForm({ ...form, patientName: t })}
                        placeholder="Legal name on ID"
                        icon="account-outline"
                    />

                    <View style={s.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <FormInput
                                label="Age"
                                value={form.age}
                                onChange={t => setForm({ ...form, age: t })}
                                placeholder="Years"
                                keyboardType="numeric"
                                icon="calendar-account"
                            />
                        </View>
                        <View style={{ flex: 2, marginLeft: 8 }}>
                            <FormInput
                                label="Contact Number"
                                value={form.contactPhone}
                                onChange={t => setForm({ ...form, contactPhone: t })}
                                placeholder="+1..."
                                keyboardType="phone-pad"
                                icon="phone-outline"
                            />
                        </View>
                    </View>

                    <FormInput
                        label="Medical Condition"
                        value={form.condition}
                        onChange={t => setForm({ ...form, condition: t })}
                        placeholder="Brief diagnosis or symptoms"
                        icon="heart-pulse"
                        multiline
                    />

                    <PrimaryButton
                        title="Submit Admission Request"
                        onPress={handleSubmit}
                        busy={loading}
                        style={{ marginTop: Sp.lg, backgroundColor: Colors.good }}
                        icon={<MaterialCommunityIcons name="send-check" size={20} color="#fff" />}
                    />

                    <View style={s.noteBox}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={Colors.sub} />
                        <Text style={s.noteText}>
                            Allocating a bed depends on availability and clinical priority at the time of arrival.
                        </Text>
                    </View>
                </MotiView>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FormInput({ label, value, onChange, placeholder, icon, keyboardType = 'default', multiline = false }) {
    return (
        <View style={s.formGroup}>
            <Text style={s.label}>{label}</Text>
            <View style={[s.inputWrap, multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <MaterialCommunityIcons name={icon} size={20} color={Colors.sub} style={{ marginTop: multiline ? 4 : 0 }} />
                <TextInput
                    style={[s.input, multiline && { textAlignVertical: 'top' }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.sub + '80'}
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Sp.md },
    row: { flexDirection: 'row' },

    headerCard: { flexDirection: 'row', alignItems: 'center', padding: Sp.md, marginBottom: Sp.lg },
    hIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
    hTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
    hSub: { fontSize: 13, color: Colors.accent, fontWeight: '700', marginTop: 2 },

    sectionHeader: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text, marginBottom: Sp.md },
    formGroup: { marginBottom: Sp.md },
    label: { fontSize: 13, fontWeight: '800', color: Colors.sub, marginBottom: 8, marginLeft: 2 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: Radii.md,
        paddingHorizontal: 16,
        height: 56,
        ...Shadows.sm
    },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: Colors.text, fontWeight: '500' },

    noteBox: { flexDirection: 'row', marginTop: Sp.lg, padding: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: Radii.sm },
    noteText: { flex: 1, marginLeft: 8, fontSize: 12, color: Colors.sub, lineHeight: 18 }
});
