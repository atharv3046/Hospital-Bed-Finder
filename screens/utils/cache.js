// screens/utils/cache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL_MS = 1000 * 60 * 10; // 10 minutes

export async function cacheSet(key, value) {
  try {
    const payload = { value, ts: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export async function cacheGet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return null;
    return value;
  } catch {
    return null;
  }
}
