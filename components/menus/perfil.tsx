import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function PerfilMenu() {
  const xp = 70; // porcentaje visual de ejemplo

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Perfil</Text>

      {/* Card Principal */}
      <View style={styles.profileCard}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.avatar}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Usuario</Text>
          <Text style={styles.titleText}>Titulo</Text>
          <Text style={styles.level}>Nivel 67</Text>

          {/* Barra de XP */}
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: `${xp}%` }]} />
          </View>
          <Text style={styles.xpText}>{xp}% al siguiente nivel</Text>
        </View>
      </View>

      {/* TITULOS */}
      <Text style={styles.section}>Títulos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          <View style={styles.itemCard}>
            <MaterialCommunityIcons name="medal" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Explorador Urbano</Text>
          </View>

          <View style={styles.itemCard}>
            <MaterialCommunityIcons name="medal-outline" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Descubridor</Text>
          </View>

          <View style={styles.itemCard}>
            <MaterialCommunityIcons name="medal" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Cazador Historia</Text>
          </View>
        </View>
      </ScrollView>

      {/* SKINS */}
      <Text style={styles.section}>Skins</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          <View style={styles.itemCard}>
            <Ionicons name="paw" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Gato Skate</Text>
          </View>

          <View style={styles.itemCard}>
            <Ionicons name="compass" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Explorador</Text>
          </View>

          <View style={styles.itemCardLocked}>
            <Ionicons name="lock-closed" size={30} color="#555" />
            <Text style={styles.itemLockedText}>Bloqueado</Text>
          </View>
        </View>
      </ScrollView>

      {/* PINES */}
      <Text style={styles.section}>Pines</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          <View style={styles.itemCard}>
            <Ionicons name="location" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Común</Text>
          </View>

          <View style={styles.itemCard}>
            <Ionicons name="location" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Raro</Text>
          </View>

          <View style={styles.itemCard}>
            <Ionicons name="location" size={30} color="#22d3ee" />
            <Text style={styles.itemText}>Legendario</Text>
          </View>
        </View>
      </ScrollView>
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

  profileCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 22,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 20,
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },

  titleText: {
    color: "#aaa",
    marginBottom: 4,
  },

  level: {
    color: "#22d3ee",
    marginBottom: 6,
  },

  xpBarBackground: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 4,
  },

  xpBarFill: {
    height: 8,
    backgroundColor: "#22d3ee",
    borderRadius: 6,
  },

  xpText: {
    fontSize: 12,
    color: "#aaa",
  },

  section: {
    fontSize: 18,
    color: "#22d3ee",
    marginBottom: 10,
  },

  horizontalContainer: {
    flexDirection: "row",
    marginBottom: 25,
  },

  itemCard: {
    width: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },

  itemCardLocked: {
    width: 120,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  itemText: {
    color: "#fff",
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },

  itemLockedText: {
    color: "#555",
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
});