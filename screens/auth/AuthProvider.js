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
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    } else if (!error && !data) {
      // Profile row doesn't exist yet — auto-create it (handles missing DB trigger)
      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert({ id: userId, role: 'user' })
        .select()
        .maybeSingle();

      if (!createErr && created) {
        setProfile(created);
      } else {
        // Profile exists but RLS blocked insert (e.g. already there from trigger) — retry read
        const { data: retry } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (retry) setProfile(retry);
      }
    }
  };

  useEffect(() => {
    // 1. Immediately stop loading so the UI renders
    setLoading(false);

    const { AppState } = require('react-native');
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    // 2. Listen to auth state changes in the background
    const { data: { subscription: authStateSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      appStateSubscription.remove();
      authStateSubscription.unsubscribe();
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