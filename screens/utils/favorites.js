import { supabase } from '../../supabase';

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

// Check if one hospital is favorite
export async function isFavorite(id) {
  const ids = await getFavoriteIds();
  return ids.includes(id);
}

// Add or remove (toggle) a hospital from favorites
export async function toggleFavorite(hospitalId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const ids = await getFavoriteIds();
  const exists = ids.includes(hospitalId);

  if (exists) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('hospital_id', hospitalId);
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, hospital_id: hospitalId });
  }

  // Return updated list
  return getFavoriteIds();
}
