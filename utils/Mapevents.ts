// utils/mapEvents.ts
// Puente simple entre el panel de Favoritos y el mapa.
// No requiere Context ni prop drilling.

export type MapEventPlace = {
    place_id: string;
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    reward_xp: number;
};

let _viewOnMapFn: ((place: MapEventPlace) => void) | null = null;
let _closeMenuFn: (() => void) | null = null;

// map.tsx lo llama al montar
export function registerViewOnMap(fn: (place: MapEventPlace) => void) {
    _viewOnMapFn = fn;
}

// gameMenu.tsx lo llama al montar
export function registerCloseMenu(fn: () => void) {
    _closeMenuFn = fn;
}

// favoritos.tsx lo llama al pulsar "Ver en mapa"
export function viewOnMap(place: MapEventPlace) {
    _closeMenuFn?.();                          // cerrar el panel primero
    setTimeout(() => _viewOnMapFn?.(place), 350); // esperar la animación de cierre
}