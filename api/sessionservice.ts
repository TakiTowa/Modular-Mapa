// api/sessionService.ts
import { supabase } from './supabase';

// ================================
// SINGLETON — solo una sesión activa a la vez
// ================================
let activeSessionId: string | null = null;
let isStarting = false; // guard contra llamadas concurrentes

// ================================
// INICIAR SESIÓN
// ================================
export async function startSession(): Promise<void> {
    // Evitar sesiones duplicadas
    if (activeSessionId || isStarting) {
        console.log("Sesión ya activa:", activeSessionId);
        return;
    }

    isStarting = true;

    try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Cerrar sesiones huérfanas previas (sin ended_at) de este usuario
        await supabase
            .from('sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('user_id', userData.user.id)
            .is('ended_at', null);

        // Crear la nueva sesión
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
    } finally {
        isStarting = false;
    }
}

// ================================
// ACTUALIZAR DISTANCIA
// ================================
export async function updateSessionDistance(additionalMeters: number): Promise<void> {
    if (!activeSessionId || additionalMeters <= 0) return;

    const { data, error } = await supabase
        .from('sessions')
        .select('distance_meters')
        .eq('id', activeSessionId)
        .single();

    if (error || !data) return;

    const newDistance = (data.distance_meters ?? 0) + additionalMeters;
    const newSteps = Math.round(newDistance / 0.75);

    await supabase
        .from('sessions')
        .update({ distance_meters: newDistance, steps_estimated: newSteps })
        .eq('id', activeSessionId);
}

// ================================
// CERRAR SESIÓN
// ================================
export async function endSession(): Promise<void> {
    if (!activeSessionId) return;

    const sessionId = activeSessionId;
    activeSessionId = null; // limpiar antes del await para no duplicar

    const { error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);

    if (error) {
        console.error('Error cerrando sesión:', error);
    } else {
        console.log('Sesión cerrada:', sessionId);
    }
}

// ================================
// VERIFICAR LOGROS POR SESIÓN
// ================================
export async function checkSessionAchievements(
    totalDistanceMeters: number,
    durationMs: number
): Promise<string[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const userId = userData.user.id;
    const unlockedKeys: string[] = [];

    const { data: allSessions } = await supabase
        .from('sessions')
        .select('distance_meters')
        .eq('user_id', userId);

    const totalMeters = (allSessions ?? []).reduce(
        (sum, s) => sum + (s.distance_meters ?? 0), 0
    );

    const distanceChecks: [string, number][] = [
        ['walker_10km', 10_000],
        ['walker_50km', 50_000],
    ];

    for (const [key, threshold] of distanceChecks) {
        if (totalMeters >= threshold) unlockedKeys.push(key);
    }

    if (durationMs >= 2 * 60 * 60 * 1000) unlockedKeys.push('session_2h');

    return unlockedKeys;
}