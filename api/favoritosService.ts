// api/favoritosService.ts
import { supabase } from './supabase';

export type FavoritePlace = {
    id: string;          // favorites.id
    place_id: string;
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    reward_xp: number;
    added_at: string;
};

// ================================
// OBTENER FAVORITOS DEL USUARIO
// ================================
export async function getFavorites(): Promise<FavoritePlace[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
        .from('favorites')
        .select(`
      id,
      place_id,
      added_at,
      places (
        name,
        description,
        latitude,
        longitude,
        reward_xp
      )
    `)
        .eq('user_id', userData.user.id)
        .order('added_at', { ascending: false });

    if (error) { console.error('Error obteniendo favoritos:', error); return []; }

    return (data ?? []).map((row: any) => ({
        id: row.id,
        place_id: row.place_id,
        added_at: row.added_at,
        name: row.places?.name ?? 'Lugar desconocido',
        description: row.places?.description ?? null,
        latitude: row.places?.latitude ?? 0,
        longitude: row.places?.longitude ?? 0,
        reward_xp: row.places?.reward_xp ?? 0,
    }));
}

// ================================
// VERIFICAR SI UN LUGAR ES FAVORITO
// ================================
export async function isFavorite(placeId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('place_id', placeId);

    return (count ?? 0) > 0;
}

// ================================
// AGREGAR A FAVORITOS
// ================================
export async function addFavorite(placeId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userData.user.id, place_id: placeId });

    if (error) {
        if (error.code === '23505') return true; // ya existía
        console.error('Error agregando favorito:', error);
        return false;
    }
    return true;
}

// ================================
// QUITAR DE FAVORITOS
// ================================
export async function removeFavorite(placeId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('place_id', placeId);

    if (error) { console.error('Error eliminando favorito:', error); return false; }
    return true;
}