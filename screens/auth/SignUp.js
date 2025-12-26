import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../../supabase';
import { Colors, Radii, Sp, Shadows, Typo } from '../ui/theme';

export default function SignUp({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const onSignUp = async () => {
    if (!name.trim() || !email.trim() || !pass) {
      Alert.alert('Missing Fields', 'Please fill in all information.');
      return;
    }
    if (pass.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters.');
      return;
    }
    try {
      setBusy(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: { full_name: name.trim() }
        }
      });
      if (error) throw error;
      Alert.alert('Verification Sent', 'Please check your email to verify your account before signing in.', [
        { text: 'OK', onPress: () => navigation.replace('SignIn') }
      ]);
    } catch (e) {
      Alert.alert('Sign Up Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} style={{ backgroundColor: Colors.bg }}>
        <MotiView
          from={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={s.header}
        >
          <View style={s.iconCircle}>
            <MaterialCommunityIcons name="account-plus-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={s.title}>Join Network</Text>
          <Text style={s.sub}>Create an account to track beds & bookings</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={s.card}
        >
          <Text style={s.cardTitle}>Register Account</Text>

          <View style={s.inputWrapper}>
            <Text style={s.label}>Full Name</Text>
            <View style={s.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={20} color={Colors.sub} style={s.fieldIcon} />
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={Colors.sub + '80'}
              />
            </View>
          </View>

          <View style={s.inputWrapper}>
            <Text style={s.label}>Email Address</Text>
            <View style={s.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color={Colors.sub} style={s.fieldIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@hospital.com"
                placeholderTextColor={Colors.sub + '80'}
              />
            </View>
          </View>

          <View style={s.inputWrapper}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.sub} style={s.fieldIcon} />
              <TextInput
                style={s.input}
                value={pass}
                onChangeText={setPass}
                secureTextEntry={!showPass}
                placeholder="8+ characters"
                placeholderTextColor={Colors.sub + '80'}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={10}>
                <MaterialCommunityIcons name={showPass ? "eye-off" : "eye"} size={20} color={Colors.sub} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, (busy || !email || !pass || !name) && s.btnDisabled]}
            onPress={onSignUp}
            disabled={busy || !email || !pass || !name}
            activeOpacity={0.8}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
              <Text style={s.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        <Text style={s.disclaimer}>
          By signing up, you agree to our Terms of Service & Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, padding: Sp.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Sp.xl },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Sp.md,
    ...Shadows.md
  },
  title: { fontSize: Typo.h1, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
  sub: { fontSize: Typo.small, color: Colors.sub, marginTop: 4, textAlign: 'center', maxWidth: '80%' },

  card: {
    backgroundColor: '#fff',
    borderRadius: Radii.xl,
    padding: Sp.lg,
    ...Shadows.lg
  },
  cardTitle: { fontSize: Typo.h2, fontWeight: '800', color: Colors.text, marginBottom: Sp.lg, textAlign: 'center' },

  inputWrapper: { marginBottom: Sp.md },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginLeft: 2 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    height: 56
  },
  fieldIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: Colors.text },

  btn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Sp.sm,
    ...Shadows.md
  },
  btnDisabled: { opacity: 0.5, backgroundColor: Colors.sub },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Sp.lg },
  footerText: { color: Colors.sub, fontSize: 14 },
  link: { color: Colors.primaryLight, fontSize: 14, fontWeight: '800' },

  disclaimer: { textAlign: 'center', marginTop: Sp.xl, fontSize: 12, color: Colors.sub, opacity: 0.6 }
});
