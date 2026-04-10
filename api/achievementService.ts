// api/achievementService.ts
import { supabase } from './supabase';

// ================================
// DESBLOQUEAR UN LOGRO
// Ignora si ya estaba desbloqueado (UNIQUE constraint)
// ================================
export async function unlockAchievement(key: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: userData.user.id, achievement_key: key })
        .select();

    if (error) {
        // Código 23505 = duplicate key (ya tenía ese logro)
        if (error.code === '23505') return false;
        console.error('Error desbloqueando logro:', error);
        return false;
    }

    return true; // true = logro nuevo, mostrar notificación
}

// ================================
// VERIFICAR LOGROS POR EXPLORACIÓN
// Llamar cada vez que se descubre una celda nueva
// ================================
export async function checkExplorationAchievements(
    totalCells: number,
    totalKm2: number,
    totalPlaces: number,
    daysActive: number,
    level: number
): Promise<string[]> {
    const newlyUnlocked: string[] = [];

    const checks: [string, boolean][] = [
        ['explorer_1km2', totalKm2 >= 1],
        ['explorer_10km2', totalKm2 >= 10],
        ['places_10', totalPlaces >= 10],
        ['places_50', totalPlaces >= 50],
        ['days_7', daysActive >= 7],
        ['days_30', daysActive >= 30],
        ['level_10', level >= 10],
        ['level_50', level >= 50],
    ];

    for (const [key, condition] of checks) {
        if (condition) {
            const isNew = await unlockAchievement(key);
            if (isNew) newlyUnlocked.push(key);
        }
    }

    return newlyUnlocked;
}

// ================================
// VERIFICAR LOGRO DE PRIMER LUGAR
// Llamar al registrar la primera visita a un lugar
// ================================
export async function checkFirstPlaceAchievement(totalPlaces: number): Promise<boolean> {
    if (totalPlaces === 1) {
        return await unlockAchievement('first_place');
    }
    return false;
}