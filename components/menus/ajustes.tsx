import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useMapSettings } from "@/context/mapConfig";

export default function AjustesMenu() {
  // Switch independientes
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);

  // const [selectedMap, setSelectedMap] = useState("Estandar");
  // const [selectedFog, setSelectedFog] = useState("#000000");
  const { mapStyle, setMapStyle, fogColor, setFogColor } = useMapSettings();

  const mapStyles = [
    "standard",
    "dark-v11",
    "satellite-streets-v12",
    "outdoors-v12",
    "navigation-day-v1",
  ];

  const fogColors = [
    "#000000", // negro default
    "#3b82f6", // azul
    "#22c55e", // verde
    "#ef4444", // rojo
    "#f59e0b", // naranja
    "#a855f7", // morado
    "#ec4899", // rosa
    "#14b8a6", // turquesa
  ];


  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ajustes</Text>

      {/* CONFIGURACION GENERAL */}
      <View style={styles.card}>
        <SettingRow label="Modo oscuro" value={darkMode} setValue={setDarkMode} />
        <SettingRow label="Vibración" value={vibration} setValue={setVibration} />
        <SettingRow label="Sonido" value={sound} setValue={setSound} />
        <SettingRow label="Música" value={music} setValue={setMusic} />
      </View>

      {/* MAPA */}
      <Text style={styles.section}>Diseño del mapa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          {mapStyles.map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.mapCard,
                mapStyle === style && styles.selectedCard,
              ]}
              onPress={() => setMapStyle(style)}
            >
              <MaterialCommunityIcons
                name="map"
                size={28}
                color={mapStyle === style ? "#22d3ee" : "#aaa"}
              />
              <Text
                style={[
                  styles.mapText,
                  mapStyle === style && { color: "#22d3ee" },
                ]}
              >
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* COLOR NIEBLA */}
      <Text style={styles.section}>Color de la niebla</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          {fogColors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                fogColor === color && styles.selectedColor,
              ]}
              onPress={() => setFogColor(color)}
            />
          ))}
        </View>
      </ScrollView>

      {/* INFORMACION */}
      <Text style={styles.section}>Información</Text>
      <View style={styles.card}>
        <InfoRow label="Acerca del proyecto" icon="information-circle-outline" />
        <InfoRow label="Créditos" icon="people-outline" />
        <InfoRow label="Versión 1.0.0" icon="code-slash-outline" />
        <InfoRow label="Política de privacidad" icon="document-text-outline" />
      </View>
    </ScrollView>
  );
}



/* COMPONENTES AUXILIARES */

type SettingRowProps = {
  label: string;
  value: boolean;
  setValue: (value: boolean) => void;
};

function SettingRow({ label, value, setValue }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ true: "#22d3ee" }}
      />
    </View>
  );
}

type InfoRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function InfoRow({ label, icon }: InfoRowProps) {
  return (
    <TouchableOpacity style={styles.infoRow}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name={icon} size={20} color="#aaa" />
        <Text style={styles.infoText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#555" />
    </TouchableOpacity>
  );
}

/* ESTILOS */

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#22d3ee",
    marginBottom: 20,
  },

  section: {
    fontSize: 18,
    color: "#22d3ee",
    marginTop: 20,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 22,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  label: {
    color: "#fff",
    fontSize: 15,
  },

  horizontalContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },

  mapCard: {
    width: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  selectedCard: {
    borderColor: "#22d3ee",
    backgroundColor: "rgba(34,211,238,0.08)",
  },

  mapText: {
    marginTop: 8,
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
  },

  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },

  selectedColor: {
    borderColor: "#fff",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  infoText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
  },
});