// api/missionsService.ts
import { supabase } from './supabase';

// ================================
// TIPOS
// ================================
export type MissionWithProgress = {
    key: string;
    title: string;
    type: 'daily' | 'weekly';
    metric: string;
    target: number;
    reward_xp: number;
    reward_label: string;
    reward_type: 'xp' | 'pin' | 'skin';
    current: number;       // valor actual del usuario
    progress: number;      // 0.0 → 1.0
    completed: boolean;
};

// ================================
// HELPERS DE PERÍODO
// ================================
function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

// Lunes de la semana actual (inicio del período semanal)
function weekStartISO(): string {
    const d = new Date();
    const day = d.getDay(); // 0=dom, 1=lun...
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}

// ================================
// OBTENER MÉTRICAS ACTUALES DEL USUARIO
// Para diarias: desde hoy 00:00
// Para semanales: desde el lunes de esta semana
// ================================
async function fetchUserMetrics(
    userId: string,
    since: string
): Promise<Record<string, number>> {
    const sinceISO = `${since}T00:00:00Z`;

    const [cells, places, sessions] = await Promise.all([
        supabase
            .from('explored_cells')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('discovered_at', sinceISO),

        supabase
            .from('user_place_visits')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('visited_at', sinceISO),

        supabase
            .from('sessions')
            .select('distance_meters')
            .eq('user_id', userId)
            .gte('started_at', sinceISO),
    ]);

    const KM2_PER_CELL = (Math.PI * 30 * 30) / 1_000_000;
    const cellCount = cells.count ?? 0;
    const distanceM = (sessions.data ?? []).reduce(
        (sum, s) => sum + (s.distance_meters ?? 0), 0
    );

    return {
        cells: cellCount,
        km2: parseFloat((cellCount * KM2_PER_CELL).toFixed(4)),
        places: places.count ?? 0,
        distance_km: parseFloat((distanceM / 1000).toFixed(3)),
    };
}

// ================================
// MARCAR MISIÓN COMO COMPLETADA Y DAR XP
// ================================
async function completeMission(
    userId: string,
    missionKey: string,
    periodStart: string,
    rewardXp: number
): Promise<void> {
    // 1. Marcar como completada (upsert)
    await supabase
        .from('user_mission_progress')
        .upsert(
            {
                user_id: userId,
                mission_key: missionKey,
                period_start: periodStart,
                completed: true,
                completed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,mission_key,period_start' }
        );

    if (rewardXp <= 0) return;

    // 2. Registrar en xp_logs
    await supabase.from('xp_logs').insert({
        user_id: userId,
        amount: rewardXp,
        source_type: 'mission',
        reference_id: missionKey,
    });

    // 3. Actualizar total_xp y nivel en profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', userId)
        .single();

    if (profile) {
        const newXp = (profile.total_xp ?? 0) + rewardXp;
        const newLevel = Math.floor(newXp / 1000) + 1;
        await supabase
            .from('profiles')
            .update({ total_xp: newXp, level: newLevel })
            .eq('id', userId);
    }
}

// ================================
// OBTENER MISIONES CON PROGRESO REAL
// ================================
export async function getMissionsWithProgress(): Promise<{
    daily: MissionWithProgress[];
    weekly: MissionWithProgress[];
}> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { daily: [], weekly: [] };

    const userId = userData.user.id;
    const today = todayISO();
    const weekStart = weekStartISO();

    // 1. Cargar catálogo de misiones activas
    const { data: allMissions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (error || !allMissions) return { daily: [], weekly: [] };

    // 2. Cargar progreso completado del usuario en el período actual
    const { data: progressRows } = await supabase
        .from('user_mission_progress')
        .select('mission_key, completed, period_start')
        .eq('user_id', userId)
        .in('period_start', [today, weekStart]);

    const completedSet = new Set(
        (progressRows ?? [])
            .filter((r) => r.completed)
            .map((r) => r.mission_key)
    );

    // 3. Métricas diarias y semanales en paralelo
    const [dailyMetrics, weeklyMetrics] = await Promise.all([
        fetchUserMetrics(userId, today),
        fetchUserMetrics(userId, weekStart),
    ]);

    // 4. Construir resultado con progreso calculado
    const build = async (
        missions: typeof allMissions,
        type: 'daily' | 'weekly',
        metrics: Record<string, number>,
        periodStart: string
    ): Promise<MissionWithProgress[]> => {
        const result: MissionWithProgress[] = [];

        for (const m of missions.filter((x) => x.type === type)) {
            const current = metrics[m.metric] ?? 0;
            const progress = Math.min(current / m.target, 1);
            const completed = completedSet.has(m.key);

            // Si recién se completó (progress >= 1 y no estaba marcado), dar XP
            if (progress >= 1 && !completed) {
                await completeMission(userId, m.key, periodStart, m.reward_xp);
                completedSet.add(m.key);
            }

            result.push({
                key: m.key,
                title: m.title,
                type: m.type,
                metric: m.metric,
                target: m.target,
                reward_xp: m.reward_xp,
                reward_label: m.reward_label,
                reward_type: m.reward_type,
                current,
                progress,
                completed: progress >= 1 || completed,
            });
        }

        return result;
    };

    const [daily, weekly] = await Promise.all([
        build(allMissions, 'daily', dailyMetrics, today),
        build(allMissions, 'weekly', weeklyMetrics, weekStart),
    ]);

    return { daily, weekly };
}