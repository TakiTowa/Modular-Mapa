// api/explorationService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "EXPLORED_CELLS";

/**
 * Simula obtener las celdas exploradas desde backend
 */
export async function getExploredCells(): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    // Si ya es array (nuevo formato)
    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Si es objeto (formato viejo)
    if (typeof parsed === "object") {
      return Object.keys(parsed);
    }

    return [];
  } catch (error) {
    console.log("Error getting explored cells", error);
    return [];
  }
}


/**
 * Simula enviar nueva exploración al backend
 */
export async function exploreCell(cellKey: string): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    let explored: string[] = saved ? JSON.parse(saved) : [];

    if (explored.includes(cellKey)) {
      return false; // ya estaba explorada
    }

    explored.push(cellKey);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(explored)
    );

    return true; // fue nueva
  } catch (error) {
    console.log("Error exploring cell", error);
    return false;
  }
}
