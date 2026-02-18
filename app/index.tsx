import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function MenuScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Niebla GO</Text>

      <Text style={styles.subtitle}>
        Explora tu ciudad y descubre zonas ocultas
      </Text>

      <Pressable
        style={styles.mainButton}
        onPress={() => router.push("/map")}
      >
        <Text style={styles.buttonText}>Comenzar exploración</Text>
      </Pressable>

      <Pressable onPress={() => alert("Explora caminando y descubre el mapa de niebla alrededor tuyo.")}>
        <Text style={styles.secondaryText}>¿Qué es esto?</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 40,
  },
  mainButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: "#020617",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 10,
  },
});
