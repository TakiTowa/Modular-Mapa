// ================================
// IMPORTACIONES
// ================================
import GameMenu from "@/components/gameMenu";
import MissionsMenu from "@/components/misionesMenu";
import { useMapSettings } from "@/context/mapConfig";
import MapboxGL from "@rnmapbox/maps";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import type {
  Feature,
  MultiPolygon,
  Polygon
} from "geojson";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { exploreCell, getExploredCells } from "../api/explorationService";

// ================================
// CONFIGURACIÓN MAPBOX
// ================================
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "");
MapboxGL.setTelemetryEnabled(false);

// ================================
// CONFIGURACIÓN DE CUADRÍCULA
// ================================
const CELL_SIZE = 0.00045; //0.00045 Tamaño de cada celda en grados (~50m aprox)
const CELL_RADIUS = 30; // 30 Radio de revelado en metros (25-30m)

// ================================
// CÍRCULO SIMULADO 
// ================================
/**
 * Crea un círculo aproximado en coordenadas lng/lat
 * Usamos trigonometría manual para evitar cálculos pesados de Turf
 */

function createCircle(center: [number, number], radiusInMeters: number) {
  const points = 64; // suaviza el círculo con más puntos 
  const coords = [];

  const distanceX =
    radiusInMeters /
    (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);

    coords.push([center[0] + x, center[1] + y]);
  }

  coords.push(coords[0]); // cerrar el polígono
  return coords;
}


// Convierte una cellKey en su círculo geográfico correspondiente
function getCellCircle(cellKey: string, radius: number) {
  const [x, y] = cellKey.split("_").map(Number);
  const lat = x * CELL_SIZE + CELL_SIZE / 2;
  const lon = y * CELL_SIZE + CELL_SIZE / 2;
  return createCircle([lon, lat], radius);
}

// ================================
// COMPONENTE PRINCIPAL
// ================================
export default function MapScreen() {

  // ESTADO BASE
  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [explored, setExplored] =
    useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);

  // REFERENCIAS MAPA Y CÁMARA
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

   /**
   * Geometría unificada de todas las áreas exploradas
   * Puede ser Polygon o MultiPolygon dependiendo de la forma
   */
  const [mergedGeometry, setMergedGeometry] =
    useState<Feature<Polygon | MultiPolygon> | null>(null);

  const [animatedCell, setAnimatedCell] =
    useState<string | null>(null);

  const [animatedRadiusValue, setAnimatedRadiusValue] =
    useState(0);

  // ANIMACIONES
  const animatedRadius = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(1)).current;

  const [showLoading, setShowLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);


  // CONFIGURACIÓN DE MAPA Y NIEBLA DESDE CONTEXTO
  const { mapStyle, fogColor } = useMapSettings();

  // ================================
  // FUNCIÓN PARA ANIMAR CELDA
  // ================================
  const triggerCellAnimation = (cellKey: string) => {
    setAnimatedCell(cellKey);
    animatedRadius.setValue(0);

    const listenerId = animatedRadius.addListener(
      ({ value }) => {
        setAnimatedRadiusValue(value);
      }
    );

    Animated.timing(animatedRadius, {
      toValue: CELL_RADIUS,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      animatedRadius.removeListener(listenerId);
    });
  };

  // ================================
  // NIEBLA GLOBAL (WORLD - EXPLORED)
  // ================================
  /**
   * Calcula:
   *  MUNDO - ÁREA EXPLORADA = NIEBLA
   *
   * Se recalcula SOLO cuando mergedGeometry cambia
   */
  const fogShape: Feature<Polygon | MultiPolygon> | null =
    React.useMemo(() => {
      if (!mergedGeometry) return null;

      const world = turf.polygon([
        [
          [-180, -85],
          [180, -85],
          [180, 85],
          [-180, 85],
          [-180, -85],
        ],
      ]);

      const diff = turf.difference(
        turf.featureCollection([world, mergedGeometry])
      );

      return diff as Feature<Polygon | MultiPolygon> | null;
    }, [mergedGeometry]);

  // ================================
  // CUADRÍCULA
  // ================================
  //Obtiene la clave única de la celda basada en lat/lon
  function getCellKey(lat: number, lon: number) {
    const x = Math.floor(lat / CELL_SIZE);
    const y = Math.floor(lon / CELL_SIZE);
    return `${x}_${y}`;
  }

  // ================================
  // CARGAR PROGRESO + GPS
  // ================================
  useEffect(() => {
    (async () => {
      // Cargar progreso previo
      const cells = await getExploredCells();

      // Mapear celdas exploradas a geometrías y unificar en una sola
      if (cells && Array.isArray(cells) && cells.length > 0) {
        const mapped: Record<string, boolean> = {};
        
        const circleFeatures = cells.map((cell: string) => {
          mapped[cell] = true;
          return turf.polygon([
            getCellCircle(cell, CELL_RADIUS),
          ]);
        });

        // UNA SOLA UNION GLOBAL
        const merged = turf.union(
          turf.featureCollection(circleFeatures)
        );

        if (merged) {
          setMergedGeometry(
            merged as Feature<Polygon | MultiPolygon>
          );
        }

        setExplored(mapped);
      }
      
      // Solicitar permisos de ubicación
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // Iniciar seguimiento de ubicación
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        async (loc) => {
          setLocation(loc);

          const key = getCellKey(
            loc.coords.latitude,
            loc.coords.longitude
          );

          setExplored((prev) => {
            if (prev[key]) return prev;

            const newCircle = turf.polygon([
              getCellCircle(key, CELL_RADIUS),
            ]);

            setMergedGeometry((prevGeom) => {
              if (!prevGeom) return newCircle;

              const collection =
                turf.featureCollection([
                  prevGeom,
                  newCircle,
                ]);

              const merged = turf.union(collection);

              return (
                (merged as
                  | Feature<Polygon | MultiPolygon>
                  | null) ?? prevGeom
              );
            });

            exploreCell(key);
            triggerCellAnimation(key);

            return { ...prev, [key]: true };
          });

          setLoading(false);
        }
      );
    })();
  }, []);

  // ================================
  // ANIMACIONES DE APARICIÓN
  // ================================ 
  useEffect(() => {
    if (mapReady && location) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      Animated.timing(loadingFade, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setShowLoading(false);
      });
    }
  }, [mapReady, location]);

  // ================================
  // RENDER
  // ================================
  return (
    <View style={{ flex: 1 }}>
      {location && (
        <Animated.View
          style={[styles.container, { opacity: fadeAnim }]}
        >
          <MapboxGL.MapView // Mapa base
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            styleURL={`mapbox://styles/mapbox/${mapStyle.toLowerCase()}`} // ajusta nombres según Mapbox
            onDidFinishLoadingMap={() => setMapReady(true)}
          >
            <MapboxGL.Camera // Cámara centrada en el usuario
              ref={cameraRef}
              zoomLevel={18}
              centerCoordinate={[
                location.coords.longitude,
                location.coords.latitude,
              ]}
            />
            <MapboxGL.UserLocation visible />
            
            {fogShape && ( // Capa de niebla global
              <MapboxGL.ShapeSource
                id="fog-source"
                shape={fogShape}
              >
                <MapboxGL.FillLayer // Capa de relleno para la niebla
                  id="fog-layer"
                  style={{
                    fillColor: fogColor,
                    fillOpacity: 0.75,
                    fillOutlineColor: "transparent",
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        </Animated.View>
      )}

      {showLoading && (
        <Animated.View // Overlay de carga
          style={[
            styles.loadingOverlayAbsolute,
            { opacity: loadingFade },
          ]}
        >
          <Image // Imagen de fondo para la pantalla de carga
            source={require(
              "../assets/images/splash-icon.png"
            )}
            style={styles.loadingImage}
            resizeMode="cover"
          />
          <ActivityIndicator 
            size="large"
            color="#22d3ee"
          />
          <Text style={styles.loadingText}>
            Cargando mapa...
          </Text>
        </Animated.View>
      )}

      {location && (
        <TouchableOpacity // Botón para centrar en la ubicación actual
          style={styles.myLocationButton}
          onPress={() => {
            cameraRef.current?.setCamera({
              centerCoordinate: [
                location.coords.longitude,
                location.coords.latitude,
              ],
              zoomLevel: 18,
              heading: 0,
              pitch: 0,
              animationDuration: 800,
            });
          }}
        >
          <Text style={styles.buttonText}>🧭</Text>
        </TouchableOpacity>
      )}

      {/* Menu de misiones */}
      <MissionsMenu /> 
      {/* Barra de navegación inferior */}
      <GameMenu />
    </View>
  );
}

// ================================
// ESTILOS
// ================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  myLocationButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    backgroundColor: "#1e90ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 22,
  },
  loadingOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  loadingText: {
    marginTop: 15,
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "500",
  },
});