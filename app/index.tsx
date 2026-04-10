import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Esta pantalla ahora es solo un splash de carga.
// El _layout.tsx se encarga de redirigir al usuario
// al mapa (si tiene sesión) o al login (si no la tiene).
export default function SplashScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/fondo-fog-city.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Niebla</Text>
          <View style={styles.goBadge}>
            <Text style={styles.goText}>GO</Text>
          </View>
        </View>
        <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 40 }} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginRight: 12,
  },
  goBadge: {
    borderWidth: 2,
    borderColor: "#22d3ee",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(34,211,238,0.15)",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  goText: {
    color: "#22d3ee",
    fontWeight: "bold",
    fontSize: 20,
  },
});