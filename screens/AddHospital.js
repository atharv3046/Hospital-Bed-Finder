// screens/AddHospital.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, PrimaryButton } from './ui/kit';

export default function AddHospital({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        address: '',
        lat: '',
        lng: '',
        type: 'Pvt',
        phone: '',
        about: '',
        specialties: '',
        bed_total_icu: '0',
        bed_av_icu: '0',
        bed_total_oxygen: '0',
        bed_av_oxygen: '0',
        bed_total_general: '0',
        bed_av_general: '0',
    });

    const onSubmit = async () => {
        if (!form.name || !form.address || !form.lat || !form.lng) {
            Alert.alert('Missing Fields', 'Name, Address, and Coordinates are required.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.from('hospitals').insert({
                name: form.name,
                address: form.address,
                lat: parseFloat(form.lat),
                lng: parseFloat(form.lng),
                type: form.type,
                phone: form.phone,
                about: form.about,
                specialties: form.specialties,
                bed_total_icu: parseInt(form.bed_total_icu),
                bed_av_icu: parseInt(form.bed_av_icu),
                bed_total_oxygen: parseInt(form.bed_total_oxygen),
                bed_av_oxygen: parseInt(form.bed_av_oxygen),
                bed_total_general: parseInt(form.bed_total_general),
                bed_av_general: parseInt(form.bed_av_general),
                verified: true,
            }).select().single();

            if (error) throw error;

            Alert.alert('Success', 'Facility registered successfully!', [
                { text: 'VIEW DETAILS', onPress: () => navigation.navigate('HospitalDetail', { hospitalId: data.id }) },
                { text: 'DONE', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                <MotiView from={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Text style={s.title}>Register Facility</Text>
                    <Text style={s.subtitle}>Enter hospital details to join the bed finder network.</Text>
                </MotiView>

                <Card style={s.formCard}>
                    <Text style={s.secTitle}>Basic Information</Text>
                    <FormInput
                        label="Hospital Name"
                        value={form.name}
                        onChange={t => setForm({ ...form, name: t })}
                        placeholder="e.g. St. Mary's General"
                        icon="hospital-building"
                    />
                    <FormInput
                        label="Physical Address"
                        value={form.address}
                        onChange={t => setForm({ ...form, address: t })}
                        placeholder="Full street address, city"
                        icon="map-marker-outline"
                        multiline
                    />

                    <View style={s.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <FormInput
                                label="Latitude"
                                value={form.lat}
                                onChange={t => setForm({ ...form, lat: t })}
                                placeholder="00.000"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <FormInput
                                label="Longitude"
                                value={form.lng}
                                onChange={t => setForm({ ...form, lng: t })}
                                placeholder="00.000"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={s.label}>Hospital Type</Text>
                    <View style={s.typeGrid}>
                        {['Pvt', 'Gov', 'Sem'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[s.typeBtn, form.type === t && s.typeActive]}
                                onPress={() => setForm({ ...form, type: t })}
                            >
                                <Text style={[s.typeText, form.type === t && s.typeTextActive]}>
                                    {t === 'Pvt' ? 'Private' : t === 'Gov' ? 'Public' : 'Semi'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <FormInput
                        label="Contact Phone"
                        value={form.phone}
                        onChange={t => setForm({ ...form, phone: t })}
                        placeholder="+1 000-000-0000"
                        keyboardType="phone-pad"
                        icon="phone-outline"
                    />

                    <View style={s.divider} />
                    <Text style={s.secTitle}>Bed Capacity</Text>

                    <BedInput label="ICU Beds" total={form.bed_total_icu} setTotal={v => setForm({ ...form, bed_total_icu: v })} av={form.bed_av_icu} setAv={v => setForm({ ...form, bed_av_icu: v })} />
                    <BedInput label="Oxygen Beds" total={form.bed_total_oxygen} setTotal={v => setForm({ ...form, bed_total_oxygen: v })} av={form.bed_av_oxygen} setAv={v => setForm({ ...form, bed_av_oxygen: v })} />
                    <BedInput label="General Beds" total={form.bed_total_general} setTotal={v => setForm({ ...form, bed_total_general: v })} av={form.bed_av_general} setAv={v => setForm({ ...form, bed_av_general: v })} />

                    <PrimaryButton
                        title="Complete Registration"
                        onPress={onSubmit}
                        busy={loading}
                        style={{ marginTop: Sp.lg }}
                        icon={<MaterialCommunityIcons name="check-all" size={20} color="#fff" />}
                    />
                </Card>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FormInput({ label, value, onChange, placeholder, icon, keyboardType = 'default', multiline = false }) {
    return (
        <View style={s.group}>
            <Text style={s.label}>{label}</Text>
            <View style={[s.inputWrap, multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                {icon && <MaterialCommunityIcons name={icon} size={18} color={Colors.sub} style={{ marginTop: multiline ? 2 : 0 }} />}
                <TextInput
                    style={[s.input, icon && { marginLeft: 10 }, multiline && { textAlignVertical: 'top' }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.sub + '60'}
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
            </View>
        </View>
    );
}

function BedInput({ label, total, setTotal, av, setAv }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={s.bedLabel}>{label}</Text>
            <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <TextInput style={s.miniInput} value={total} onChangeText={setTotal} keyboardType="numeric" placeholder="Total" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <TextInput style={[s.miniInput, { color: Colors.good }]} value={av} onChangeText={setAv} keyboardType="numeric" placeholder="Available" />
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Sp.md },
    row: { flexDirection: 'row' },
    title: { fontSize: 24, fontWeight: '900', color: Colors.text },
    subtitle: { fontSize: 13, color: Colors.sub, marginTop: 4, marginBottom: Sp.lg },

    formCard: { padding: Sp.lg },
    secTitle: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text, marginBottom: Sp.md },
    group: { marginBottom: Sp.md },
    label: { fontSize: 12, fontWeight: '900', color: Colors.sub, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: Radii.md, paddingHorizontal: 16, height: 50 },
    input: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '600' },

    typeGrid: { flexDirection: 'row', gap: 10, marginBottom: Sp.lg },
    typeBtn: { flex: 1, height: 44, borderRadius: Radii.md, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    typeActive: { backgroundColor: Colors.primary },
    typeText: { fontSize: 13, fontWeight: '800', color: Colors.sub },
    typeTextActive: { color: '#fff' },

    divider: { height: 1, backgroundColor: Colors.line, marginVertical: Sp.lg },
    bedLabel: { fontSize: 13, fontWeight: '800', color: Colors.text, marginBottom: 8 },
    miniInput: { backgroundColor: Colors.bg, borderRadius: Radii.sm, height: 44, paddingHorizontal: 12, fontSize: 14, fontWeight: '700', textAlign: 'center' }
});
