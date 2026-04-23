import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

import { FavoritePlace, getFavorites, removeFavorite } from "@/api/favoritosService";
import { viewOnMap } from "@/utils/Mapevents";

export default function FavoritosMenu() {
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setFavorites(await getFavorites());
    setLoading(false);
  };

  const handleRemove = async (placeId: string) => {
    setRemoving(placeId);
    const ok = await removeFavorite(placeId);
    if (ok) setFavorites((prev) => prev.filter((f) => f.place_id !== placeId));
    setRemoving(null);
  };

  const handleViewOnMap = (place: FavoritePlace) => {
    // Cierra el panel y centra el mapa en este lugar
    viewOnMap({
      place_id: place.place_id,
      name: place.name,
      description: place.description,
      latitude: place.latitude,
      longitude: place.longitude,
      reward_xp: place.reward_xp,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Favoritos</Text>

      {favorites.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="heart-outline" size={36} color="#334155" />
          <Text style={styles.emptyText}>
            Aún no tienes favoritos.{"\n"}
            Toca un lugar en el mapa y agrégalo.
          </Text>
        </View>
      )}

      {favorites.map((place) => (
        <View key={place.id} style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={36} color="#ff5a5f" />
          </View>

          <View style={styles.info}>
            <Text style={styles.placeName}>{place.name}</Text>

            {place.description ? (
              <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              {place.reward_xp > 0 && (
                <View style={styles.xpBadge}>
                  <Ionicons name="flash" size={12} color="#22d3ee" />
                  <Text style={styles.xpText}>+{place.reward_xp} XP</Text>
                </View>
              )}
              <Text style={styles.dateText}>
                {new Date(place.added_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </Text>
            </View>

            <View style={styles.actions}>
              {/* Ver en mapa: cierra el panel y centra el mapa */}
              <TouchableOpacity style={styles.button} onPress={() => handleViewOnMap(place)}>
                <MaterialIcons name="map" size={14} color="#22d3ee" />
                <Text style={styles.buttonText}>Ver en mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleRemove(place.place_id)}
                disabled={removing === place.place_id}
              >
                {removing === place.place_id
                  ? <ActivityIndicator size="small" color="#ff5a5f" />
                  : <>
                    <Ionicons name="heart-dislike" size={14} color="#ff5a5f" />
                    <Text style={styles.deleteText}>Quitar</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "bold", color: "#22d3ee", marginBottom: 20 },
  emptyCard: {
    alignItems: "center", justifyContent: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 40, marginTop: 20,
  },
  emptyText: { color: "#475569", fontSize: 14, textAlign: "center", lineHeight: 22 },
  card: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)",
    padding: 18, borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(34,211,238,0.15)",
  },
  iconContainer: { marginRight: 14, justifyContent: "flex-start", paddingTop: 2 },
  info: { flex: 1 },
  placeName: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  placeDesc: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  xpBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(34,211,238,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  xpText: { color: "#22d3ee", fontSize: 11, fontWeight: "700" },
  dateText: { color: "#475569", fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(34,211,238,0.1)",
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12,
  },
  buttonText: { color: "#22d3ee", fontSize: 12 },
  deleteButton: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,90,95,0.1)",
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12,
    minWidth: 70, justifyContent: "center",
  },
  deleteText: { color: "#ff5a5f", fontSize: 12 },
});