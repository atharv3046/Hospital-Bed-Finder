// screens/EmergencyRequest.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, PrimaryButton } from './ui/kit';

export default function EmergencyRequest({ navigation }) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        patient_name: profile?.full_name || '',
        age: '',
        severity: 'Moderate',
        nature: '',
        location: '',
        phone: profile?.phone || '',
    });

    const fillDemo = () => {
        const scenarios = [
            { n: 'Cardiac Arrest', s: 'Critical', p: 'John Doe', a: '65', l: 'Plot 42, Marine Drive, Mumbai' },
            { n: 'Severe Breathing Difficulty', s: 'Critical', p: 'Jane Smith', a: '42', l: 'B-201, Sunrise Apartments, Sector 12' },
        ];
        const res = scenarios[Math.floor(Math.random() * scenarios.length)];
        setForm({ ...form, patient_name: res.p, age: res.a, severity: res.s, nature: res.n, location: res.l });
    };

    const submitRequest = async () => {
        if (!form.nature || !form.location || !form.phone || !form.patient_name || !form.age) {
            Alert.alert('Incomplete Data', 'All fields marked (*) are mandatory for emergency dispatch.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('emergency_requests').insert({
                user_id: user.id,
                patient_name: form.patient_name,
                patient_age: form.age,
                severity: form.severity,
                nature_of_emergency: form.nature,
                location_text: form.location,
                contact_number: form.phone,
                status: 'OPEN'
            });

            if (error) throw error;

            Alert.alert('BROADCAST SENT', 'Your emergency alert has been broadcasted to all nearby hospitals and paramedic units.', [
                { text: 'MONITOR STATUS', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Dispatch Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={s.hero}
                >
                    <MotiView
                        from={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 1, scale: 1.05 }}
                        transition={{ loop: true, type: 'timing', duration: 1000 }}
                        style={s.sirenRing}
                    />
                    <MaterialCommunityIcons name="alert-decagram" size={48} color={Colors.bad} />
                    <Text style={s.heroTitle}>EMERGENCY PROTOCOL</Text>
                    <Text style={s.heroSub}>Broadcast live distress signals to all available medical facilities within 10km.</Text>
                </MotiView>

                <Card style={s.formCard}>
                    <View style={s.row}>
                        <View style={{ flex: 2 }}>
                            <FormInput label="Patient Name *" value={form.patient_name} onChange={t => setForm({ ...form, patient_name: t })} placeholder="ID Full Name" icon="account-alert-outline" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <FormInput label="Age *" value={form.age} onChange={t => setForm({ ...form, age: t })} placeholder="Yrs" keyboardType="numeric" />
                        </View>
                    </View>

                    <Text style={s.label}>Urgency Level</Text>
                    <View style={s.severityGrid}>
                        {['Low', 'Moderate', 'Critical'].map(v => (
                            <TouchableOpacity
                                key={v}
                                style={[s.sevBtn, form.severity === v && { backgroundColor: v === 'Critical' ? Colors.bad : Colors.accent, borderColor: 'transparent' }]}
                                onPress={() => setForm({ ...form, severity: v })}
                            >
                                <Text style={[s.sevText, form.severity === v && { color: '#fff' }]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <FormInput label="Nature of Emergency *" value={form.nature} onChange={t => setForm({ ...form, nature: t })} placeholder="e.g. Stroke, Trauma, Cardiac" icon="heart-pulse" />
                    <FormInput label="Exact Location / Landmark *" value={form.location} onChange={t => setForm({ ...form, location: t })} placeholder="Where should help arrive?" icon="map-marker-radius" multiline />
                    <FormInput label="Callback Number *" value={form.phone} onChange={t => setForm({ ...form, phone: t })} placeholder="+1..." keyboardType="phone-pad" icon="phone-in-talk" />

                    <View style={s.actions}>
                        <TouchableOpacity style={s.demoBtn} onPress={fillDemo}>
                            <Text style={s.demoText}>LOAD TEST SCENARIO</Text>
                        </TouchableOpacity>

                        <PrimaryButton
                            title="EXECUTE BROADCAST"
                            onPress={submitRequest}
                            busy={loading}
                            style={{ backgroundColor: Colors.bad, height: 60 }}
                            icon={<MaterialCommunityIcons name="bullhorn-variant" size={24} color="#fff" />}
                        />
                    </View>

                    <Text style={s.disclaimer}>
                        <MaterialCommunityIcons name="shield-check" size={12} /> Privacy Protected. Dispatch units will receive your location and vitals immediately.
                    </Text>
                </Card>

                <View style={s.protocolBox}>
                    <Text style={s.protocolTitle}>IMMEDIATE ACTIONS:</Text>
                    <Text style={s.protocolBody}>1. Stay on the line if dispatch calls.{"\n"}2. Clear the path for emergency vehicles.{"\n"}3. Prepare patient's basic ID and medical history.</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FormInput({ label, value, onChange, placeholder, icon, keyboardType = 'default', multiline = false }) {
    return (
        <View style={s.group}>
            <Text style={s.label}>{label}</Text>
            <View style={[s.inputWrap, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                {icon && <MaterialCommunityIcons name={icon} size={18} color={Colors.bad + '80'} style={{ marginTop: multiline ? 2 : 0 }} />}
                <TextInput
                    style={[s.input, icon && { marginLeft: 10 }, multiline && { textAlignVertical: 'top' }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.sub + '50'}
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: '#FFF5F5' },
    content: { padding: Sp.md },
    row: { flexDirection: 'row' },

    hero: { alignItems: 'center', paddingVertical: Sp.lg, paddingHorizontal: 20, position: 'relative' },
    sirenRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: Colors.bad + '20', top: 20 },
    heroTitle: { fontSize: 22, fontWeight: '900', color: Colors.bad, marginTop: 12, letterSpacing: 2 },
    heroSub: { fontSize: 13, color: Colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 18 },

    formCard: { padding: Sp.lg, borderTopWidth: 4, borderTopColor: Colors.bad, ...Shadows.lg },
    group: { marginBottom: Sp.md },
    label: { fontSize: 11, fontWeight: '900', color: Colors.bad, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radii.md, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#FFE5E5' },
    input: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '600' },

    severityGrid: { flexDirection: 'row', gap: 8, marginBottom: Sp.lg },
    sevBtn: { flex: 1, height: 40, borderRadius: Radii.sm, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFE5E5', alignItems: 'center', justifyContent: 'center' },
    sevText: { fontSize: 12, fontWeight: '800', color: Colors.sub },

    actions: { marginTop: Sp.md },
    demoBtn: { alignSelf: 'center', marginBottom: Sp.md, padding: 8 },
    demoText: { fontSize: 11, fontWeight: '900', color: Colors.sub, letterSpacing: 1 },

    disclaimer: { fontSize: 11, color: Colors.sub, textAlign: 'center', marginTop: Sp.md, fontStyle: 'italic' },

    protocolBox: { marginTop: Sp.lg, padding: 16, backgroundColor: Colors.bad + '10', borderRadius: Radii.md },
    protocolTitle: { fontSize: 13, fontWeight: '900', color: Colors.bad, marginBottom: 8 },
    protocolBody: { fontSize: 13, color: Colors.text, lineHeight: 20, fontWeight: '500' }
});
