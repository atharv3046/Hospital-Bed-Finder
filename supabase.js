import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('[DEBUG] supabase.js - url exists:', !!url, 'anon exists:', !!anon);

if (!url || !anon) {
  console.error('[ERROR] Supabase credentials missing! EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is undefined.');
}

const storageBackend = Platform.OS === 'web'
  ? (typeof window !== 'undefined' ? window.localStorage : undefined)
  : AsyncStorage;

export const supabase = createClient(url || 'https://placeholder-url.supabase.co', anon || 'placeholder-anon-key', {
    auth: {
        storage: storageBackend,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export default supabase;
