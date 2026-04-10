// api/explorationService.ts
import { supabase } from "./supabase";

// Variables para el sistema de lotes (Batching)
let pendingCells: string[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 10; // Enviar a la BD cada 10 celdas
const SYNC_INTERVAL_MS = 15000; // o cada 15 segundos

// ================================
// OBTENER CELDAS EXPLORADAS
// ================================
export async function getExploredCells(): Promise<string[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('explored_cells')
      .select('cell_key')
      .eq('user_id', userData.user.id);

    if (error) {
      console.log("Error obteniendo celdas de Supabase:", error);
      return [];
    }

    // Convertimos la respuesta de Supabase a un arreglo simple de strings
    return data.map((row) => row.cell_key);
  } catch (error) {
    console.log("Error en getExploredCells:", error);
    return [];
  }
}

// ================================
// EXPLORAR CELDA (Sistema de Lotes)
// ================================
// Esta función reemplaza a tu antigua exploreCell
export function queueCellForSync(cellKey: string) {
  // 1. Agregamos a la cola si no está ya
  if (!pendingCells.includes(cellKey)) {
    pendingCells.push(cellKey);
  }

  // 2. Revisamos si ya llegamos al límite para enviar
  if (pendingCells.length >= BATCH_SIZE) {
    flushCells();
  }
  // 3. Si no, iniciamos el cronómetro (si no estaba corriendo ya)
  else if (!syncTimer) {
    syncTimer = setTimeout(flushCells, SYNC_INTERVAL_MS);
  }
}

// ================================
// ENVIAR LOTE A SUPABASE (Uso Interno)
// ================================
async function flushCells() {
  if (pendingCells.length === 0) return;

  // Limpiamos el cronómetro
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  // Copiamos las celdas y vaciamos la cola original para seguir recibiendo pasos del GPS
  const cellsToSync = [...pendingCells];
  pendingCells = [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  // Preparamos los datos para insertar
  const payload = cellsToSync.map(key => ({
    user_id: userData.user.id,
    cell_key: key
  }));

  // Upsert: Si la celda ya existe, la ignora sin tirar error (gracias al UNIQUE constraint)
  const { error } = await supabase
    .from('explored_cells')
    .upsert(payload, { onConflict: 'user_id,cell_key', ignoreDuplicates: true });

  if (error) {
    console.log("Error sincronizando lote de celdas:", error);
    // Si falla la red, podríamos regresar las celdas a la cola: pendingCells.push(...cellsToSync);
  } else {
    console.log(`Se guardaron ${cellsToSync.length} celdas en Supabase`);
  }
}