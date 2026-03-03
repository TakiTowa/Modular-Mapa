import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FavoritosMenu() {
  const places = [
    {
      name: "Casa",
      address: "Av. Alemania 1871, Guadalajara",
    },
    {
      name: "Estatua Bonita",
      address: "Av. 16 de Septiembre 719, Guadalajara",
    },
    {
      name: "Museo",
      address: "Av. Matamoros 710, Guadalajara",
    },
    {
      name: "Universidad",
      address: "Blvd. Olímpica 141, Guadalajara",
    },
    {
      name: "Expo",
      address: "Av. Mariano Otero 1499, Guadalajara",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Favoritos</Text>

      {places.map((place, index) => (
        <View key={index} style={styles.card}>
          {/* Icono */}
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={38} color="#ff5a5f" />
          </View>

          {/* Información */}
          <View style={styles.info}>
            <Text style={styles.place}>{place.name}</Text>
            <Text style={styles.address}>{place.address}</Text>

            {/* Acciones */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.button}>
                <MaterialIcons name="map" size={16} color="#22d3ee" />
                <Text style={styles.buttonText}>Ver en mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button}>
                <Ionicons name="create-outline" size={16} color="#22d3ee" />
                <Text style={styles.buttonText}>Añadir nota</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton}>
                <Ionicons name="heart-dislike" size={16} color="#ff5a5f" />
                <Text style={styles.deleteText}>Quitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#22d3ee",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  place: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,211,238,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  buttonText: {
    color: "#22d3ee",
    fontSize: 12,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,90,95,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  deleteText: {
    color: "#ff5a5f",
    fontSize: 12,
    marginLeft: 4,
  },
});