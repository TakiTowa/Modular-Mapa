import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";

import { useMapSettings } from "@/context/mapConfig";
import { logoutUser } from "@/api/authService";

const KEY_DARK = "SETTING_DARK_MODE";
const KEY_VIB = "SETTING_VIBRATION";
const KEY_SOUND = "SETTING_SOUND";
const KEY_MUSIC = "SETTING_MUSIC";

// Exportamos para que map.tsx pueda leer si vibración/sonido están activos
export async function isVibrationEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_VIB);
  return v === null ? true : v === "true";
}
export async function isSoundEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_SOUND);
  return v === null ? true : v === "true";
}

export default function AjustesMenu() {
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { mapStyle, setMapStyle, fogColor, setFogColor } = useMapSettings();

  useEffect(() => {
    (async () => {
      const [dark, vib, snd, mus] = await Promise.all([
        AsyncStorage.getItem(KEY_DARK),
        AsyncStorage.getItem(KEY_VIB),
        AsyncStorage.getItem(KEY_SOUND),
        AsyncStorage.getItem(KEY_MUSIC),
      ]);
      if (dark !== null) setDarkMode(dark === "true");
      if (vib !== null) setVibration(vib === "true");
      if (snd !== null) setSound(snd === "true");
      if (mus !== null) setMusic(mus === "true");
      setLoaded(true);
    })();
  }, []);

  const toggle = async (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    await AsyncStorage.setItem(key, String(val));
  };

  const handleToggleVibration = async (val: boolean) => {
    await toggle(KEY_VIB, val, setVibration);
    if (val) Vibration.vibrate(80);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que quieres cerrar tu sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión", style: "destructive",
        onPress: async () => {
          const result = await logoutUser();
          if (!result.success) Alert.alert("Error", result.message);
        },
      },
    ]);
  };

  const mapStyles = ["standard", "dark-v11", "satellite-streets-v12", "outdoors-v12", "navigation-day-v1"];
  const fogColors = ["#000000", "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

  if (!loaded) return null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Ajustes</Text>

      <View style={styles.card}>
        <SettingRow label="Modo oscuro" sublabel="Interfaz oscura" icon="moon-outline" value={darkMode} setValue={(v) => toggle(KEY_DARK, v, setDarkMode)} />
        <SettingRow label="Vibración" sublabel="Al descubrir zonas y logros" icon="phone-portrait-outline" value={vibration} setValue={handleToggleVibration} />
        <SettingRow label="Efectos de sonido" sublabel="Al obtener XP y recompensas" icon="musical-note-outline" value={sound} setValue={(v) => toggle(KEY_SOUND, v, setSound)} />
        <SettingRow label="Música de fondo" sublabel="Música ambiental durante exploración" icon="headset-outline" value={music} setValue={(v) => toggle(KEY_MUSIC, v, setMusic)} last />
      </View>

      <Text style={styles.section}>Diseño del mapa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          {mapStyles.map((style) => (
            <TouchableOpacity key={style}
              style={[styles.mapCard, mapStyle === style && styles.selectedCard]}
              onPress={() => setMapStyle(style)}>
              <MaterialCommunityIcons name="map" size={28} color={mapStyle === style ? "#22d3ee" : "#aaa"} />
              <Text style={[styles.mapText, mapStyle === style && { color: "#22d3ee" }]}>{style}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.section}>Color de la niebla</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          {fogColors.map((color) => (
            <TouchableOpacity key={color}
              style={[styles.colorCircle, { backgroundColor: color }, fogColor === color && styles.selectedColor]}
              onPress={() => setFogColor(color)} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.section}>Información</Text>
      <View style={styles.card}>
        <InfoRow label="Acerca del proyecto" icon="information-circle-outline" />
        <InfoRow label="Créditos" icon="people-outline" />
        <InfoRow label="Versión 1.0.0" icon="code-slash-outline" />
        <InfoRow label="Política de privacidad" icon="document-text-outline" last />
      </View>

      <Text style={styles.section}>Sesión</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

type SettingRowProps = {
  label: string; sublabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean; setValue: (v: boolean) => void; last?: boolean;
};

function SettingRow({ label, sublabel, icon, value, setValue, last }: SettingRowProps) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={value ? "#22d3ee" : "#475569"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      <Switch value={value} onValueChange={setValue}
        trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(34,211,238,0.4)" }}
        thumbColor={value ? "#22d3ee" : "#64748b"} />
    </View>
  );
}

type InfoRowProps = { label: string; icon: keyof typeof Ionicons.glyphMap; last?: boolean; };
function InfoRow({ label, icon, last }: InfoRowProps) {
  return (
    <TouchableOpacity style={[styles.infoRow, !last && styles.rowBorder]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name={icon} size={20} color="#475569" />
        <Text style={styles.infoText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#334155" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "bold", color: "#22d3ee", marginBottom: 20 },
  section: { fontSize: 16, color: "#22d3ee", marginTop: 20, marginBottom: 10, fontWeight: "600" },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 22, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(34,211,238,0.12)", overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowIcon: { width: 28, alignItems: "center" },
  label: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
  sublabel: { color: "#475569", fontSize: 11, marginTop: 1 },
  horizontalContainer: { flexDirection: "row", marginBottom: 10, paddingLeft: 2 },
  mapCard: {
    width: 110, backgroundColor: "rgba(255,255,255,0.05)", padding: 14,
    borderRadius: 18, alignItems: "center", marginRight: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  selectedCard: { borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.08)" },
  mapText: { marginTop: 6, fontSize: 11, color: "#475569", textAlign: "center" },
  colorCircle: { width: 46, height: 46, borderRadius: 23, marginRight: 12, borderWidth: 2, borderColor: "transparent" },
  selectedColor: { borderColor: "#fff" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  infoText: { color: "#e2e8f0", marginLeft: 12, fontSize: 14 },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 18, paddingVertical: 16, marginTop: 4, marginBottom: 20,
  },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});