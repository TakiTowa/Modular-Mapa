// api/explorationService.ts
// este archivo maneja la lógica de almacenamiento y recuperación de las celdas 
// exploradas por el usuario. Utiliza AsyncStorage para guardar los datos localmente 
// en el dispositivo. Las funciones principales son getExploredCells para obtener 
// la lista de celdas exploradas y exploreCell para marcar una celda como explorada.
// simula el uso de una api, para despues poder migrar a un backend real.

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "EXPLORED_CELLS";


// ================================
// OBTENER CELDAS
// ================================
export async function getExploredCells(): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === "object" && parsed !== null) {
      return Object.keys(parsed);
    }

    return [];
  } catch (error) {
    console.log("Error getting explored cells:", error);
    return [];
  }
}


// ================================
// EXPLORAR CELDA
// ================================
export async function exploreCell(cellKey: string): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    let explored: string[] = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(explored)) {
      explored = [];
    }

    if (explored.includes(cellKey)) {
      return false;
    }

    explored.push(cellKey);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(explored)
    );

    return true;
  } catch (error) {
    console.log("Error exploring cell:", error);
    return false;
  }
}