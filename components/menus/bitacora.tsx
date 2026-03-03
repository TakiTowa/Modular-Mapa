import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const StatRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <View style={styles.row}>
    <View style={styles.icon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export default function BitacoraMenu() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.title}>Bitácora</Text>

      <Text style={styles.section}>Registro diario</Text>
      <View style={styles.card}>
        <StatRow
          icon={<Ionicons name="time-outline" size={20} color="#22d3ee" />}
          label="Tiempo hoy"
          value="1h 30m"
        />
        <StatRow
          icon={<MaterialCommunityIcons name="map-marker-distance" size={20} color="#22d3ee" />}
          label="Distancia hoy"
          value="1.7 km²"
        />
        <StatRow
          icon={<Ionicons name="compass-outline" size={20} color="#22d3ee" />}
          label="Distancia descubierta"
          value="0.5 km²"
        />
        <StatRow
          icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />}
          label="Lugares descubiertos"
          value="4"
        />
        <StatRow
          icon={<Ionicons name="walk-outline" size={20} color="#22d3ee" />}
          label="Pasos estimados"
          value="1,200"
        />
      </View>

      <Text style={styles.section}>Historial general</Text>
      <View style={styles.card}>
        <StatRow icon={<Ionicons name="calendar-outline" size={20} color="#22d3ee" />} label="Días activos" value="15" />
        <StatRow icon={<MaterialCommunityIcons name="map" size={20} color="#22d3ee" />} label="Distancia total" value="155 km²" />
        <StatRow icon={<Ionicons name="compass-outline" size={20} color="#22d3ee" />} label="Distancia descubierta" value="80 km²" />
        <StatRow icon={<Ionicons name="trophy-outline" size={20} color="#22d3ee" />} label="Logros" value="3" />
        <StatRow icon={<Ionicons name="star-outline" size={20} color="#22d3ee" />} label="Puntos favoritos" value="12" />
        <StatRow icon={<Ionicons name="pin-outline" size={20} color="#22d3ee" />} label="Pines encontrados" value="4" />
        <StatRow icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />} label="Total lugares descubiertos" value="12" />
        <StatRow icon={<Ionicons name="walk-outline" size={20} color="#22d3ee" />} label="Total pasos" value="12,000" />
        <StatRow icon={<Ionicons name="time-outline" size={20} color="#22d3ee" />} label="Total tiempo" value="12h 30m" />
        <StatRow icon={<MaterialCommunityIcons name="speedometer" size={20} color="#22d3ee" />} label="Récord en un día" value="2.5 km²" />
      </View>

      <Text style={styles.section}>Logros recientes</Text>
      <View style={styles.card}>
        <StatRow icon={<Ionicons name="medal-outline" size={20} color="#22d3ee" />} label="Explorador Novato" value="Primer lugar descubierto" />
        <StatRow icon={<Ionicons name="medal-outline" size={20} color="#22d3ee" />} label="Caminante" value="10 km caminados" />
        <StatRow icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />} label="Nuevo lugar" value="Museo Municipal" />
        <StatRow icon={<Ionicons name="location-outline" size={20} color="#22d3ee" />} label="Nuevo lugar" value="Parque Central" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  icon: {
    width: 30,
    alignItems: "center",
  },
  label: {
    color: "#9ca3af",
    fontSize: 14,
  },
  value: {
    color: "#22d3ee",
    fontWeight: "bold",
    fontSize: 14,
  },
});