// screens/auth/AuthProvider.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabase.js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    if (!userId) {
      console.log('[DEBUG] fetchProfile: No userId provided');
      setProfile(null);
      return;
    }

    console.log('[DEBUG] fetchProfile: starting for userId =', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[DEBUG] fetchProfile: error querying profiles:', error);
      }

      if (!error && data) {
        console.log('[DEBUG] fetchProfile: found existing profile:', data);
        setProfile(data);
      } else if (!error && !data) {
        console.log('[DEBUG] fetchProfile: profile not found, attempting to auto-create');
        // Profile row doesn't exist yet — auto-create it (handles missing DB trigger)
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert({ id: userId, role: 'user' })
          .select()
          .maybeSingle();

        if (!createErr && created) {
          console.log('[DEBUG] fetchProfile: auto-created profile:', created);
          setProfile(created);
        } else {
          if (createErr) {
            console.warn('[DEBUG] fetchProfile: auto-create insert error:', createErr);
          }
          // Profile exists but RLS blocked insert (e.g. already there from trigger) — retry read
          console.log('[DEBUG] fetchProfile: retrying read after insert block');
          const { data: retry } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (retry) {
            console.log('[DEBUG] fetchProfile: retry success:', retry);
            setProfile(retry);
          } else {
            console.warn('[DEBUG] fetchProfile: retry failed');
          }
        }
      }
    } catch (e) {
      console.error('[DEBUG] fetchProfile: uncaught exception during fetchProfile:', e);
    }
  };

  useEffect(() => {
    console.log('[DEBUG] AuthProvider mounted. Setting loading to false');
    // 1. Immediately stop loading so the UI renders
    setLoading(false);

    let appStateSubscription;
    try {
      const { AppState } = require('react-native');
      appStateSubscription = AppState.addEventListener('change', (nextState) => {
        console.log('[DEBUG] AppState changed to:', nextState);
        if (nextState === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      });
    } catch (err) {
      console.error('[DEBUG] Error setting up AppState listener:', err);
    }

    // 2. Listen to auth state changes in the background
    let authStateSubscription;
    try {
      console.log('[DEBUG] Registering onAuthStateChange listener');
      const res = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[DEBUG] onAuthStateChange event =', _event, 'session exists =', !!session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      });
      authStateSubscription = res?.data?.subscription;
    } catch (err) {
      console.error('[DEBUG] Error registering onAuthStateChange:', err);
    }

    return () => {
      console.log('[DEBUG] AuthProvider unmounting, cleaning up subscriptions');
      if (appStateSubscription && typeof appStateSubscription.remove === 'function') {
        appStateSubscription.remove();
      }
      if (authStateSubscription && typeof authStateSubscription.unsubscribe === 'function') {
        authStateSubscription.unsubscribe();
      }
    };
  }, []);

  const refreshProfile = () => fetchProfile(user?.id);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};