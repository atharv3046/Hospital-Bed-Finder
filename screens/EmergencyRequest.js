// screens/EmergencyRequest.js — "Personalized Request" form
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, TextInput, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabase.js';
import { useAuth } from './auth/AuthProvider';
import { Colors, Radii, Sp, Shadows } from './ui/theme';

const REQUIREMENTS = ['Hospital Bed', 'ICU Bed', 'Oxygen Bed', 'Ventilator', 'Blood', 'Medicine', 'Ambulance'];

function DropdownPicker({ label, value, options, onChange }) {
    const [open, setOpen] = useState(false);
    return (
        <View style={s.fieldWrap}>
            <Text style={s.label}>{label}</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Text style={s.dropdownVal}>{value}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity style={s.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
                    <View style={s.sheet}>
                        <Text style={s.sheetTitle}>{label}</Text>
                        {options.map(o => (
                            <TouchableOpacity
                                key={o}
                                style={[s.option, value === o && s.optionActive]}
                                onPress={() => { onChange(o); setOpen(false); }}
                            >
                                <Text style={[s.optionText, value === o && s.optionTextActive]}>{o}</Text>
                                {value === o && <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

export default function EmergencyRequest() {
    const { user } = useAuth();
    const [requirement, setRequirement] = useState('Hospital Bed');
    const [location, setLocation] = useState('');
    const [name, setName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!location.trim()) { Alert.alert('Missing', 'Please enter a location.'); return; }
        if (!agreed) { Alert.alert('Terms', 'Please agree to the terms and conditions.'); return; }

        setLoading(true);
        try {
            const { error } = await supabase.from('emergency_requests').insert({
                user_id: user?.id,
                nature_of_emergency: requirement,
                location_text: location.trim(),
                patient_name: name.trim() || null,
                severity: 'HIGH',
                status: 'PENDING',
            });
            if (error) throw error;
            Alert.alert('Request Sent ✅', 'Your personalized request has been broadcast to nearby hospitals.');
            setLocation('');
            setName('');
            setAgreed(false);
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={s.headerRow}>
                <View>
                    <Text style={s.title}>Personalized{'\n'}Request</Text>
                </View>
                <Text style={s.planeEmoji}>🏥</Text>
            </View>

            {/* Form */}
            <View style={s.form}>
                <DropdownPicker
                    label="Requirement"
                    value={requirement}
                    options={REQUIREMENTS}
                    onChange={setRequirement}
                />

                <View style={s.fieldWrap}>
                    <Text style={s.label}>Location</Text>
                    <TextInput
                        style={s.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="e.g. Shayam Park"
                        placeholderTextColor={Colors.sub}
                    />
                </View>

                <View style={s.fieldWrap}>
                    <Text style={s.label}>Name</Text>
                    <TextInput
                        style={[s.input, s.textarea]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Patient name or medicine / item name"
                        placeholderTextColor={Colors.sub}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Terms */}
                <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
                    <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                        {agreed && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={s.termsText}>
                        I agree to{' '}
                        <Text style={s.termsLink}>Terms and conditions</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, minHeight: 40 }} />

            {/* Make Request Button */}
            <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.6 }]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.85}
            >
                <MaterialCommunityIcons name="message-text-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={s.submitText}>Make Request</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const s = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Sp.lg, paddingTop: 60, flexGrow: 1 },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sp.xl },
    title: { fontSize: 28, fontWeight: '900', color: Colors.primary, lineHeight: 34 },
    planeEmoji: { fontSize: 56 },

    form: { gap: 0 },

    fieldWrap: { marginBottom: Sp.md },
    label: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6, marginLeft: 2 },
    dropdown: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: Radii.md, height: 50,
        paddingHorizontal: Sp.md, ...Shadows.sm,
    },
    dropdownVal: { fontSize: 15, color: Colors.text, fontWeight: '500' },
    input: {
        backgroundColor: '#fff', borderRadius: Radii.md, height: 50,
        paddingHorizontal: Sp.md, fontSize: 15, color: Colors.text, ...Shadows.sm,
    },
    textarea: { height: 90, paddingTop: 14 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Sp.lg },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: Sp.md },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line },
    optionActive: { backgroundColor: Colors.bg, borderRadius: Radii.sm, paddingHorizontal: Sp.sm },
    optionText: { fontSize: 15, color: Colors.text },
    optionTextActive: { fontWeight: '800', color: Colors.primary },

    termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Sp.sm },
    checkbox: {
        width: 20, height: 20, borderRadius: 4,
        borderWidth: 2, borderColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    termsText: { fontSize: 14, color: Colors.text },
    termsLink: { color: Colors.primary, fontWeight: '700' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: Radii.xl, height: 58,
        ...Shadows.md,
    },
    submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
