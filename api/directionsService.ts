// api/directionsService.ts

// ================================
// TIPOS
// ================================
export type RouteResult = {
    coordinates: [number, number][];
    distanceMeters: number;
    durationSeconds: number;
    estimatedXp: number;
};

export type GeocodedLocation = {
    address: string;       // Dirección completa formateada
    shortName: string;     // Solo calle + número
};

// XP por cada 100 metros caminados
const XP_PER_100M = 10;

// ================================
// REVERSE GEOCODING
// Convierte [lon, lat] en dirección legible
// ================================
export async function reverseGeocode(
    lon: number,
    lat: number
): Promise<GeocodedLocation> {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return { address: "Ubicación seleccionada", shortName: "Destino" };

    try {
        const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
            `${lon},${lat}.json` +
            `?access_token=${token}&language=es&types=address,neighborhood,locality&limit=1`;

        const res = await fetch(url);
        const json = await res.json();

        if (!json.features || json.features.length === 0) {
            return { address: "Ubicación seleccionada", shortName: "Destino" };
        }

        const feature = json.features[0];
        const placeName = feature.place_name as string; // "Calle X 123, Colonia Y, Ciudad, País"

        // Separar en partes: la primera es la calle+número, el resto es contexto
        const parts = placeName.split(", ");
        const shortName = parts[0] ?? "Destino";
        // Mostrar hasta 3 niveles (calle, colonia, ciudad)
        const address = parts.slice(0, 3).join(", ");

        return { address, shortName };
    } catch (err) {
        console.error("Error en reverse geocoding:", err);
        return { address: "Ubicación seleccionada", shortName: "Destino" };
    }
}

// ================================
// RUTA PEATONAL
// ================================
export async function getWalkingRoute(
    fromLon: number,
    fromLat: number,
    toLon: number,
    toLat: number
): Promise<RouteResult | null> {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return null;

    const url =
        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
        `${fromLon},${fromLat};${toLon},${toLat}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.routes || json.routes.length === 0) return null;

        const route = json.routes[0];
        const distanceMeters = route.distance as number;
        const estimatedXp = Math.round((distanceMeters / 100) * XP_PER_100M);

        return {
            coordinates: route.geometry.coordinates as [number, number][],
            distanceMeters,
            durationSeconds: route.duration as number,
            estimatedXp,
        };
    } catch (err) {
        console.error("Error obteniendo ruta:", err);
        return null;
    }
}

// ================================
// FORMATEO
// ================================
export function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
    const min = Math.round(seconds / 60);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}