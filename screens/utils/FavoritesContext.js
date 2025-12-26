// screens/utils/FavoritesContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'FAVORITE_HOSPITAL_IDS';
export const FavoritesContext = createContext({
  favIds: [],
  toggle: async (id) => {},
  isFav: (id) => false,
  setFavs: (arr) => {}
});

export function FavoritesProvider({ children }) {
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(KEY);
        setFavIds(s ? JSON.parse(s) : []);
      } catch (e) {
        console.warn('Fav load failed', e.message);
      }
    })();
  }, []);

  const persist = useCallback(async (ids) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(ids));
    } catch (e) {
      console.warn('Fav save failed', e.message);
    }
  }, []);

  const toggle = useCallback(async (id) => {
    setFavIds((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      const i = copy.indexOf(id);
      if (i === -1) copy.push(id);
      else copy.splice(i, 1);
      persist(copy);
      return copy;
    });
  }, [persist]);

  const isFav = (id) => favIds.includes(id);

  return (
    <FavoritesContext.Provider value={{ favIds, toggle, isFav, setFavs: setFavIds }}>
      {children}
    </FavoritesContext.Provider>
  );
}
