// api/popularZonesService.ts
import { supabase } from './supabase';

export type PopularZone = {
  id: string;
  latitude: number;
  longitude: number;
  explorer_count: number;
  cell_count: number;
  explorer_percentage: number;
};

export async function getPopularZones(): Promise<PopularZone[]> {
  const { data, error } = await supabase
    .from('popular_zones')
    .select('id, latitude, longitude, explorer_count, cell_count, explorer_percentage')
    .order('explorer_count', { ascending: false });

  if (error) {
    console.error('Error cargando zonas populares:', error);
    return [];
  }

  return (data ?? []).map((z) => ({
    id: z.id,
    latitude: z.latitude,
    longitude: z.longitude,
    explorer_count: z.explorer_count,
    cell_count: z.cell_count,
    explorer_percentage: parseFloat(z.explorer_percentage),
  }));
}