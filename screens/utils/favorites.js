import { supabase } from '../../supabase';
import { Alert } from 'react-native';

// Read all favorite IDs for the current user
export async function getFavoriteIds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('hospital_id')
    .eq('user_id', user.id);

  if (error) return [];
  return data.map(f => f.hospital_id);
}

// Check if one hospital is favorite — queries only the specific row, not all favorites
export async function isFavorite(hospitalId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('favorites')
    .select('hospital_id')
    .eq('user_id', user.id)
    .eq('hospital_id', hospitalId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

// Add or remove (toggle) a hospital from favorites
// Returns { isFav: bool } — avoids a second full-list fetch
export async function toggleFavorite(hospitalId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    Alert.alert('Login Required', 'Please log in to save favorites.');
    return { isFav: false };
  }

  // Check only the specific row rather than fetching all favorites
  const exists = await isFavorite(hospitalId);

  if (exists) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('hospital_id', hospitalId);
    return { isFav: false };
  } else {
    await supabase
      .from('favorites')
      .insert({ user_id: user.id, hospital_id: hospitalId });
    return { isFav: true };
  }
}
