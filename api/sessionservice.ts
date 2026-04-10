// api/sessionService.ts
import { supabase } from './supabase';

// ID de la sesión activa (en memoria, dura lo que el mapa esté abierto)
let activeSessionId: string | null = null;

// ================================
// INICIAR SESIÓN
// Llamar cuando el mapa carga
// ================================
export async function startSession(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
        .from('sessions')
        .insert({ user_id: userData.user.id })
        .select('id')
        .single();

    if (error) {
        console.error('Error iniciando sesión:', error);
        return;
    }

    activeSessionId = data.id;
    console.log('Sesión iniciada:', activeSessionId);
}

// ================================
// ACTUALIZAR DISTANCIA
// Llamar en cada tick del GPS con la distancia incremental en metros
// ================================
export async function updateSessionDistance(additionalMeters: number): Promise<void> {
    if (!activeSessionId || additionalMeters <= 0) return;

    // Leemos el valor actual y sumamos
    const { data, error: readError } = await supabase
        .from('sessions')
        .select('distance_meters')
        .eq('id', activeSessionId)
        .single();

    if (readError || !data) return;

    const newDistance = (data.distance_meters ?? 0) + additionalMeters;
    const newSteps = Math.round(newDistance / 0.75); // 1 paso ≈ 0.75m

    await supabase
        .from('sessions')
        .update({
            distance_meters: newDistance,
            steps_estimated: newSteps,
        })
        .eq('id', activeSessionId);
}

// ================================
// CERRAR SESIÓN
// Llamar cuando el componente del mapa se desmonta
// ================================
export async function endSession(): Promise<void> {
    if (!activeSessionId) return;

    const { error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeSessionId);

    if (error) {
        console.error('Error cerrando sesión:', error);
    } else {
        console.log('Sesión cerrada:', activeSessionId);
    }

    activeSessionId = null;
}

// ================================
// VERIFICAR LOGROS BASADOS EN SESIÓN
// Llamar al cerrar sesión
// ================================
export async function checkSessionAchievements(
    totalDistanceMeters: number,
    durationMs: number
): Promise<string[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const userId = userData.user.id;
    const unlockedKeys: string[] = [];

    // Logros por distancia total acumulada
    const { data: allSessions } = await supabase
        .from('sessions')
        .select('distance_meters')
        .eq('user_id', userId);

    const totalMeters = (allSessions ?? []).reduce(
        (sum, s) => sum + (s.distance_meters ?? 0),
        0
    );

    const distanceChecks: [string, number][] = [
        ['walker_10km', 10_000],
        ['walker_50km', 50_000],
    ];

    for (const [key, threshold] of distanceChecks) {
        if (totalMeters >= threshold) {
            unlockedKeys.push(key);
        }
    }

    // Logro por sesión de +2 horas
    if (durationMs >= 2 * 60 * 60 * 1000) {
        unlockedKeys.push('session_2h');
    }

    return unlockedKeys;
}