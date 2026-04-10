// api/placesService.ts
import { supabase } from './supabase';

// ================================
// TIPOS
// ================================
export type Place = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  reward_xp: number;
  is_active: boolean;
};

// ================================
// OBTENER LUGARES ACTIVOS
// (tabla `places`, con recompensa XP)
// ================================
export async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, description, latitude, longitude, reward_xp, is_active')
    .eq('is_active', true);

  if (error) {
    console.error('Error obteniendo places:', error);
    return [];
  }
  return data ?? [];
}

// ================================
// OBTENER IDs DE LUGARES YA VISITADOS
// Para no premiar dos veces el mismo lugar
// ================================
export async function getVisitedPlaceIds(): Promise<Set<string>> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new Set();

  const { data, error } = await supabase
    .from('user_place_visits')
    .select('place_id')
    .eq('user_id', userData.user.id);

  if (error) {
    console.error('Error obteniendo visitas:', error);
    return new Set();
  }

  return new Set(data.map((row) => row.place_id));
}

// ================================
// REGISTRAR VISITA Y OTORGAR XP
// ================================
export async function rewardPlaceVisit(
  placeId: string,
  rewardXp: number
): Promise<{ success: boolean; newTotalXp?: number; newLevel?: number }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false };

  const userId = userData.user.id;

  // 1. Registrar la visita (ignorar si ya existe por si acaso)
  const { error: visitError } = await supabase
    .from('user_place_visits')
    .insert({ user_id: userId, place_id: placeId });

  if (visitError) {
    console.error('Error registrando visita:', visitError);
    return { success: false };
  }

  // 2. Registrar en xp_logs
  const { error: xpLogError } = await supabase
    .from('xp_logs')
    .insert({
      user_id: userId,
      amount: rewardXp,
      source_type: 'place_visit',
      reference_id: placeId,
    });

  if (xpLogError) {
    console.error('Error registrando xp_log:', xpLogError);
  }

  // 3. Sumar XP al perfil y recalcular nivel
  //    Leemos el total actual primero para calcular el nuevo nivel
  const { data: profile, error: profileReadError } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .single();

  if (profileReadError || !profile) {
    console.error('Error leyendo perfil:', profileReadError);
    return { success: false };
  }

  const newTotalXp = (profile.total_xp ?? 0) + rewardXp;
  const newLevel = Math.floor(newTotalXp / 1000) + 1; // 1000 XP por nivel

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', userId);

  if (profileUpdateError) {
    console.error('Error actualizando perfil:', profileUpdateError);
    return { success: false };
  }

  return { success: true, newTotalXp, newLevel };
}

// ================================
// OBTENER LUGARES POPULARES (vista)
// Mantiene compatibilidad con el código existente
// ================================
export async function getPopularPlaces(): Promise<any[]> {
  const { data, error } = await supabase
    .from('popular_places')
    .select('*');

  if (error) {
    console.error('Error obteniendo lugares populares:', error);
    return [];
  }
  return data ?? [];
}