// api/mapSettingsService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAP_STYLE_KEY = "MAP_STYLE";
const FOG_COLOR_KEY = "FOG_COLOR";

// Obtener ajustes actuales
export async function getMapSettings() {
  try {
    const mapStyle = (await AsyncStorage.getItem(MAP_STYLE_KEY)) || "standard";
    const fogColor = (await AsyncStorage.getItem(FOG_COLOR_KEY)) || "#000000";
    return { mapStyle, fogColor };
  } catch (error) {
    console.log("Error getting map settings:", error);
    return { mapStyle: "standard", fogColor: "#000000" };
  }
}

// Guardar ajustes
export async function saveMapSettings(mapStyle: string, fogColor: string) {
  try {
    await AsyncStorage.setItem(MAP_STYLE_KEY, mapStyle);
    await AsyncStorage.setItem(FOG_COLOR_KEY, fogColor);
  } catch (error) {
    console.log("Error saving map settings:", error);
  }
}