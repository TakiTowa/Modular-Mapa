// api/bitacoraService.ts
import { supabase } from './supabase';

const KM2_PER_CELL = (Math.PI * 30 * 30) / 1_000_000;

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatDuration(ms: number): string {
    const totalMin = Math.floor(ms / 60_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

// ================================
// TIPOS
// ================================
export type RecentAchievement = {
    key: string;
    title: string;
    description: string;
    icon: string;
    unlocked_at: string;
};

export type BitacoraStats = {
    cellsToday: number;
    km2Today: number;
    placesToday: number;
    xpToday: number;
    timeToday: string;
    distanceToday: string;
    stepsToday: number;

    daysActive: number;
    totalCells: number;
    totalKm2: number;
    totalPlaces: number;
    totalXp: number;
    level: number;
    totalTime: string;
    totalDistanceKm: string;
    totalSteps: number;
    bestDayKm2: number;

    totalFavorites: number;
    pinsCommon: number;
    pinsRare: number;
    pinsLegendary: number;

    recentAchievements: RecentAchievement[];
    totalAchievements: number;
};

// ================================
// OBTENER TODAS LAS ESTADÍSTICAS
// ================================
export async function getBitacoraStats(): Promise<BitacoraStats | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const userId = userData.user.id;
    const today = todayISO();

    const [
        cellsAll,
        cellsToday,
        visitsAll,
        visitsToday,
        xpToday,
        profile,
        sessionsAll,
        sessionsToday,
        favorites,
        pins,
        achievements,
    ] = await Promise.all([
        supabase
            .from('explored_cells')
            .select('discovered_at', { count: 'exact' })
            .eq('user_id', userId),

        supabase
            .from('explored_cells')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('discovered_at', `${today}T00:00:00Z`),

        supabase
            .from('user_place_visits')
            .select('place_id, visited_at', { count: 'exact' })
            .eq('user_id', userId),

        supabase
            .from('user_place_visits')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('visited_at', `${today}T00:00:00Z`),

        supabase
            .from('xp_logs')
            .select('amount')
            .eq('user_id', userId)
            .gte('awarded_at', `${today}T00:00:00Z`),

        supabase
            .from('profiles')
            .select('total_xp, level')
            .eq('id', userId)
            .single(),

        supabase
            .from('sessions')
            .select('started_at, ended_at, distance_meters, steps_estimated')
            .eq('user_id', userId),

        supabase
            .from('sessions')
            .select('started_at, ended_at, distance_meters, steps_estimated')
            .eq('user_id', userId)
            .gte('started_at', `${today}T00:00:00Z`),

        supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),

        supabase
            .from('user_pins')
            .select('pin_type')
            .eq('user_id', userId),

        supabase
            .from('user_achievements')
            .select('achievement_key, unlocked_at, achievements(title, description, icon)')
            .eq('user_id', userId)
            .order('unlocked_at', { ascending: false })
            .limit(5),
    ]);

    // ── Celdas ──────────────────────────────────────────────
    const allCellRows = cellsAll.data ?? [];
    const totalCells = cellsAll.count ?? 0;
    const cellsTodayCount = cellsToday.count ?? 0;

    const countByDay: Record<string, number> = {};
    for (const row of allCellRows) {
        const d = new Date(row.discovered_at).toISOString().slice(0, 10);
        countByDay[d] = (countByDay[d] ?? 0) + 1;
    }
    const daysActive = Object.keys(countByDay).length;
    const bestDayCells = Math.max(0, ...Object.values(countByDay));

    // ── XP ──────────────────────────────────────────────────
    const xpTodayTotal = (xpToday.data ?? []).reduce((s, r) => s + r.amount, 0);

    // ── Sesiones ─────────────────────────────────────────────
    function sumSessions(rows: any[]) {
        let durationMs = 0, distanceM = 0, steps = 0;
        for (const s of rows) {
            if (s.ended_at)
                durationMs += new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
            distanceM += s.distance_meters ?? 0;
            steps += s.steps_estimated ?? 0;
        }
        return { durationMs, distanceM, steps };
    }

    const allSess = sumSessions(sessionsAll.data ?? []);
    const todaySess = sumSessions(sessionsToday.data ?? []);

    // ── Pines ─────────────────────────────────────────────
    const pinRows = pins.data ?? [];
    const pinsCommon = pinRows.filter((p) => p.pin_type === 'common').length;
    const pinsRare = pinRows.filter((p) => p.pin_type === 'rare').length;
    const pinsLegendary = pinRows.filter((p) => p.pin_type === 'legendary').length;

    // ── Logros ─────────────────────────────────────────────
    const recentAchievements: RecentAchievement[] = (achievements.data ?? []).map((a: any) => ({
        key: a.achievement_key,
        title: a.achievements?.title ?? a.achievement_key,
        description: a.achievements?.description ?? '',
        icon: a.achievements?.icon ?? 'medal-outline',
        unlocked_at: a.unlocked_at,
    }));

    return {
        cellsToday: cellsTodayCount,
        km2Today: parseFloat((cellsTodayCount * KM2_PER_CELL).toFixed(3)),
        placesToday: visitsToday.count ?? 0,
        xpToday: xpTodayTotal,
        timeToday: formatDuration(todaySess.durationMs),
        distanceToday: (todaySess.distanceM / 1000).toFixed(2) + ' km',
        stepsToday: todaySess.steps,

        daysActive,
        totalCells,
        totalKm2: parseFloat((totalCells * KM2_PER_CELL).toFixed(3)),
        totalPlaces: visitsAll.count ?? 0,
        totalXp: profile.data?.total_xp ?? 0,
        level: profile.data?.level ?? 1,
        totalTime: formatDuration(allSess.durationMs),
        totalDistanceKm: (allSess.distanceM / 1000).toFixed(2) + ' km',
        totalSteps: allSess.steps,
        bestDayKm2: parseFloat((bestDayCells * KM2_PER_CELL).toFixed(3)),

        totalFavorites: favorites.count ?? 0,
        pinsCommon,
        pinsRare,
        pinsLegendary,

        recentAchievements,
        totalAchievements: recentAchievements.length,
    };
}