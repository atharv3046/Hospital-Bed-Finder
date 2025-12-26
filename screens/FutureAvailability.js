// screens/FutureAvailability.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../supabase.js';
import { Colors, Radii, Sp, Shadows, Typo } from './ui/theme';
import { Card, PrimaryButton } from './ui/kit';

export default function FutureAvailability({ navigation }) {
  const [form, setForm] = useState({
    requirement: 'ICU Bed',
    location: '',
    providerName: '',
    date: '',
    agreeTerms: true
  });
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    if (!form.location || !form.date) {
      Alert.alert('Required Fields', 'Please provide location and preferred date.');
      return;
    }
    if (!form.agreeTerms) {
      Alert.alert('Policy Agreement', 'You must agree to the data handling terms to proceed.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('future_requests').insert({
        requirement: form.requirement,
        location_text: form.location,
        hospital_id: null,
        desired_date: form.date,
        agree_terms: form.agreeTerms
      });

      if (error) throw error;

      Alert.alert('Request Logged', 'We will notify you if a slot opens up on the requested date.', [
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
          <View style={s.header}>
            <View style={s.iconCircle}>
              <MaterialCommunityIcons name="calendar-search" size={32} color={Colors.primary} />
            </View>
            <Text style={s.title}>Future Planning</Text>
            <Text style={s.subtitle}>Reserve or track bed availability for planned medical procedures.</Text>
          </View>
        </MotiView>

        <Card style={s.card}>
          <Text style={s.secTitle}>Inquiry Details</Text>

          <View style={s.group}>
            <Text style={s.label}>Medical Requirement</Text>
            <View style={s.typeGrid}>
              {['ICU Bed', 'Oxygen Bed', 'General'].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.typeBtn, form.requirement === v && s.typeActive]}
                  onPress={() => setForm({ ...form, requirement: v })}
                >
                  <Text style={[s.typeText, form.requirement === v && s.typeTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FormInput label="Preferred Location" value={form.location} onChange={t => setForm({ ...form, location: t })} placeholder="City or Specific Hospital Area" icon="map-marker-outline" />
          <FormInput label="Planned Date" value={form.date} onChange={t => setForm({ ...form, date: t })} placeholder="YYYY-MM-DD" icon="calendar-clock" />
          <FormInput label="Preferred Facility (Optional)" value={form.providerName} onChange={t => setForm({ ...form, providerName: t })} placeholder="Search Hospital..." icon="hospital-building" />

          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setForm({ ...form, agreeTerms: !form.agreeTerms })}
          >
            <View style={[s.check, form.agreeTerms && s.checked]}>
              {form.agreeTerms && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
            </View>
            <Text style={s.termsText}>Agree to predictive data processing terms</Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Submit Planning Request"
            onPress={submitRequest}
            busy={loading}
            style={{ marginTop: Sp.md }}
          />
        </Card>

        <View style={s.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color={Colors.accent} />
          <Text style={s.infoText}>This is a predictive system. Confirmation is subject to discharge rates on the requested date.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormInput({ label, value, onChange, placeholder, icon, keyboardType = 'default' }) {
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={Colors.sub} />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.sub + '60'}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md },
  header: { alignItems: 'center', paddingVertical: Sp.lg },
  iconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.sub, textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },

  card: { padding: Sp.lg },
  secTitle: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text, marginBottom: Sp.md },
  group: { marginBottom: Sp.md },
  label: { fontSize: 11, fontWeight: '900', color: Colors.sub, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: Radii.md, paddingHorizontal: 12, height: 50 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: Colors.text },

  typeGrid: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, height: 40, borderRadius: Radii.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.line },
  typeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { fontSize: 11, fontWeight: '800', color: Colors.sub },
  typeTextActive: { color: '#fff' },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Sp.md },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checked: { backgroundColor: Colors.primary },
  termsText: { fontSize: 13, color: Colors.text, fontWeight: '600' },

  infoBox: { flexDirection: 'row', padding: 16, backgroundColor: Colors.accent + '10', borderRadius: Radii.md, marginTop: Sp.lg, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 12, fontSize: 12, color: Colors.accent, fontWeight: '600', lineHeight: 18 }
});