import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BitacoraStats, RecentAchievement, getBitacoraStats } from "@/api/bitacoraService";

// ================================
// FILA DE ESTADÍSTICA
// ================================
function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// ================================
// FILA DE LOGRO
// ================================
function AchievementRow({ item }: { item: RecentAchievement }) {
  return (
    <View style={styles.achievementRow}>
      <View style={styles.achievementIcon}>
        <Ionicons
          name={item.icon as any}
          size={20}
          color="#facc15"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.achievementTitle}>{item.title}</Text>
        <Text style={styles.achievementDesc}>{item.description}</Text>
      </View>
    </View>
  );
}

// ================================
// COMPONENTE PRINCIPAL
// ================================
export default function BitacoraMenu() {
  const [stats, setStats] = useState<BitacoraStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBitacoraStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#aaa" }}>No se pudo cargar la bitácora.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.title}>Bitácora</Text>

      {/* ── REGISTRO DIARIO ── */}
      <Text style={styles.section}>Registro diario</Text>
      <View style={styles.card}>
        <StatRow
          icon={<Ionicons name="time-outline" size={20} color="#22d3ee" />}
          label="Tiempo hoy"
          value={stats.timeToday}
        />
        <StatRow
          icon={<MaterialCommunityIcons name="map-marker-distance" size={20} color="#22d3ee" />}
          label="Distancia caminada"
          value={stats.distanceToday}
        />
        <StatRow
          icon={<Ionicons name="compass-outline" size={20} color="#22d3ee" />}
          label="Área descubierta"
          value={`${stats.km2Today} km²`}
        />
        <StatRow
          icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />}
          label="Lugares descubiertos"
          value={String(stats.placesToday)}
        />
        <StatRow
          icon={<Ionicons name="walk-outline" size={20} color="#22d3ee" />}
          label="Pasos estimados"
          value={stats.stepsToday.toLocaleString()}
        />
        <StatRow
          icon={<Ionicons name="flash-outline" size={20} color="#22d3ee" />}
          label="XP ganada"
          value={`${stats.xpToday} XP`}
        />
      </View>

      {/* ── HISTORIAL GENERAL ── */}
      <Text style={styles.section}>Historial general</Text>
      <View style={styles.card}>
        <StatRow
          icon={<Ionicons name="calendar-outline" size={20} color="#22d3ee" />}
          label="Días activos"
          value={String(stats.daysActive)}
        />
        <StatRow
          icon={<MaterialCommunityIcons name="map-marker-distance" size={20} color="#22d3ee" />}
          label="Distancia total"
          value={stats.totalDistanceKm}
        />
        <StatRow
          icon={<Ionicons name="compass-outline" size={20} color="#22d3ee" />}
          label="Área descubierta"
          value={`${stats.totalKm2} km²`}
        />
        <StatRow
          icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />}
          label="Total lugares"
          value={String(stats.totalPlaces)}
        />
        <StatRow
          icon={<Ionicons name="walk-outline" size={20} color="#22d3ee" />}
          label="Total pasos"
          value={stats.totalSteps.toLocaleString()}
        />
        <StatRow
          icon={<Ionicons name="time-outline" size={20} color="#22d3ee" />}
          label="Total tiempo"
          value={stats.totalTime}
        />
        <StatRow
          icon={<Ionicons name="flash-outline" size={20} color="#22d3ee" />}
          label="XP total"
          value={`${stats.totalXp} XP`}
        />
        <StatRow
          icon={<Ionicons name="trophy-outline" size={20} color="#22d3ee" />}
          label="Nivel actual"
          value={`Nivel ${stats.level}`}
        />
        <StatRow
          icon={<MaterialCommunityIcons name="speedometer" size={20} color="#22d3ee" />}
          label="Récord en un día"
          value={`${stats.bestDayKm2} km²`}
        />
      </View>

      {/* ── COLECCIONABLES ── */}
      <Text style={styles.section}>Coleccionables</Text>
      <View style={styles.card}>
        <StatRow
          icon={<Ionicons name="star-outline" size={20} color="#22d3ee" />}
          label="Puntos favoritos"
          value={String(stats.totalFavorites)}
        />
        <StatRow
          icon={<Ionicons name="location" size={20} color="#9ca3af" />}
          label="Pines comunes"
          value={String(stats.pinsCommon)}
        />
        <StatRow
          icon={<Ionicons name="location" size={20} color="#22d3ee" />}
          label="Pines raros"
          value={String(stats.pinsRare)}
        />
        <StatRow
          icon={<Ionicons name="location" size={20} color="#facc15" />}
          label="Pines legendarios"
          value={String(stats.pinsLegendary)}
        />
      </View>

      {/* ── LOGROS RECIENTES ── */}
      {stats.recentAchievements.length > 0 && (
        <>
          <Text style={styles.section}>Logros recientes</Text>
          <View style={styles.card}>
            {stats.recentAchievements.map((a) => (
              <AchievementRow key={a.key} item={a} />
            ))}
          </View>
        </>
      )}

      {stats.recentAchievements.length === 0 && (
        <>
          <Text style={styles.section}>Logros</Text>
          <View style={[styles.card, styles.emptyCard]}>
            <Ionicons name="trophy-outline" size={32} color="#334155" />
            <Text style={styles.emptyText}>
              Aún no has desbloqueado logros.{"\n"}¡Sal a explorar!
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#22d3ee",
    marginBottom: 25,
  },
  section: {
    fontSize: 18,
    color: "#22d3ee",
    marginBottom: 10,
    marginTop: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.2)",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    color: "#475569",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  rowIcon: {
    width: 30,
    alignItems: "center",
  },
  label: {
    flex: 1,
    color: "#9ca3af",
    fontSize: 14,
  },
  value: {
    color: "#22d3ee",
    fontWeight: "bold",
    fontSize: 14,
  },
  achievementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  achievementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(250,204,21,0.1)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  achievementTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  achievementDesc: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
});