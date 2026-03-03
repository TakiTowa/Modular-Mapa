import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";


export default function MenuScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/fondo-fog-city.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Capa oscura encima de la imagen */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Título */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Niebla</Text>
          <View style={styles.goBadge}>
            <Text style={styles.goText}>GO</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Explora tu ciudad y descubre zonas ocultas
        </Text>

        {/* Botón principal */}
        <Pressable
          style={({ pressed }) => [
            styles.mainButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push("/map")}
        >
          <Text style={styles.mainButtonText}>
            Comenzar exploración
          </Text>
        </Pressable>

        {/* Login / Register */}
        <View style={styles.authRow}>
          <Pressable
            style={styles.authItem}
            onPress={() => router.push("/login")}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color="#e2e8f0"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.authText}>Iniciar sesión</Text>
          </Pressable>

          <Pressable
            style={styles.authItem}
            onPress={() => router.push("/register")}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color="#e2e8f0"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.authText}>Registrarse</Text>
          </Pressable>
        </View>


      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.45)", // oscurece la imagen
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 44,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginRight: 10,
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
    fontSize: 18,
  },

  subtitle: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    marginBottom: 50,
  },

  mainButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 18,

    // Glow efecto
    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 15,

    marginBottom: 35,
  },

  mainButtonText: {
    color: "#020617",
    fontSize: 18,
    fontWeight: "700",
  },

  authRow: {
    flexDirection: "row",
    gap: 40,
  },

  authText: {
    color: "#e2e8f0",
    fontSize: 16,
  },

  authItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  
});