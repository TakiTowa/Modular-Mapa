// ================================
// IMPORTACIONES
// ================================
import GameMenu from "@/components/gameMenu";
import MissionsMenu from "@/components/misionesMenu";
import { useMapSettings } from "@/context/mapConfig";
import MapboxGL from "@rnmapbox/maps";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import type { Feature, MultiPolygon, Polygon } from "geojson";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getExploredCells, queueCellForSync } from "../api/explorationService";
import {
  Place,
  getPlaces,
  getPopularPlaces,
  getVisitedPlaceIds,
  rewardPlaceVisit,
} from "../api/placesService";
import { endSession, startSession, updateSessionDistance } from "../api/sessionservice";

// ================================
// CONFIGURACIÓN
// ================================
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "");
MapboxGL.setTelemetryEnabled(false);

const CELL_SIZE = 0.00045;
const CELL_RADIUS = 30;
const PLACE_DETECT_RADIUS_M = 50;

// ================================
// HELPERS GEOMÉTRICOS
// ================================
function createCircle(center: [number, number], radiusInMeters: number) {
  const points = 64;
  const coords = [];
  const distanceX =
    radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([
      center[0] + distanceX * Math.cos(theta),
      center[1] + distanceY * Math.sin(theta),
    ]);
  }
  coords.push(coords[0]);
  return coords;
}

function getCellCircle(cellKey: string, radius: number) {
  const [x, y] = cellKey.split("_").map(Number);
  const lat = x * CELL_SIZE + CELL_SIZE / 2;
  const lon = y * CELL_SIZE + CELL_SIZE / 2;
  return createCircle([lon, lat], radius);
}

function getCellKey(lat: number, lon: number) {
  const x = Math.floor(lat / CELL_SIZE);
  const y = Math.floor(lon / CELL_SIZE);
  return `${x}_${y}`;
}

function safeUnion(
  features: Feature<Polygon | MultiPolygon>[]
): Feature<Polygon | MultiPolygon> | null {
  if (features.length === 0) return null;
  if (features.length === 1) return features[0];
  return turf.union(turf.featureCollection(features)) as Feature<
    Polygon | MultiPolygon
  > | null;
}

function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  return turf.distance(
    turf.point([lon1, lat1]),
    turf.point([lon2, lat2]),
    { units: "meters" }
  );
}

// ================================
// TOAST DE RECOMPENSA
// ================================
type RewardToast = { placeName: string; xp: number };

function PlaceRewardToast({ toast, onHide, topInset }: { toast: RewardToast; onHide: () => void; topInset: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(onHide);
  }, []);

  return (
    <Animated.View style={[toastStyles.container, { opacity, top: topInset + 12 }]}>
      <Text style={toastStyles.emoji}>📍</Text>
      <View>
        <Text style={toastStyles.title}>¡Lugar descubierto!</Text>
        <Text style={toastStyles.name}>{toast.placeName}</Text>
      </View>
      <View style={toastStyles.xpBadge}>
        <Text style={toastStyles.xpText}>+{toast.xp} XP</Text>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(10,20,40,0.95)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.4)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    zIndex: 100,
    shadowColor: "#22d3ee",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  emoji: { fontSize: 24 },
  title: { color: "#22d3ee", fontSize: 12, fontWeight: "600" },
  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  xpBadge: {
    backgroundColor: "rgba(34,211,238,0.15)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpText: { color: "#22d3ee", fontWeight: "800", fontSize: 14 },
});

// ================================
// COMPONENTE PRINCIPAL
// ================================
export default function MapScreen() {
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [explored, setExplored] = useState<Record<string, boolean>>({});
  const [popularPlaces, setPopularPlaces] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);

  const visitedPlaceIds = useRef<Set<string>>(new Set());
  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
  const pendingDistanceM = useRef(0);
  const distanceFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  const [mergedGeometry, setMergedGeometry] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const animatedRadius = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(1)).current;
  const [showLoading, setShowLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const { mapStyle, fogColor } = useMapSettings();

  // ================================
  // SESIÓN
  // ================================
  useEffect(() => {
    startSession();
    return () => {
      if (distanceFlushTimer.current) clearTimeout(distanceFlushTimer.current);
      flushDistance();
      endSession();
    };
  }, []);

  const flushDistance = () => {
    if (pendingDistanceM.current > 0) {
      updateSessionDistance(pendingDistanceM.current);
      pendingDistanceM.current = 0;
    }
    if (distanceFlushTimer.current) {
      clearTimeout(distanceFlushTimer.current);
      distanceFlushTimer.current = null;
    }
  };

  const accumulateDistance = (meters: number) => {
    pendingDistanceM.current += meters;
    if (pendingDistanceM.current >= 100) { flushDistance(); return; }
    if (!distanceFlushTimer.current) {
      distanceFlushTimer.current = setTimeout(flushDistance, 30_000);
    }
  };

  // ================================
  // NIEBLA
  // ================================
  const fogShape: Feature<Polygon | MultiPolygon> | null = React.useMemo(() => {
    if (!mergedGeometry) return null;
    const world = turf.polygon([
      [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
    ]);
    return turf.difference(
      turf.featureCollection([world, mergedGeometry])
    ) as Feature<Polygon | MultiPolygon> | null;
  }, [mergedGeometry]);

  // ================================
  // DATOS INICIALES
  // ================================
  useEffect(() => {
    getPopularPlaces().then((data) => { if (data) setPopularPlaces(data); });
    Promise.all([getPlaces(), getVisitedPlaceIds()]).then(([fetchedPlaces, visited]) => {
      setPlaces(fetchedPlaces);
      visitedPlaceIds.current = visited;
    });
  }, []);

  // ================================
  // LUGARES CERCANOS
  // ================================
  const checkNearbyPlaces = async (lat: number, lon: number, currentPlaces: Place[]) => {
    for (const place of currentPlaces) {
      if (visitedPlaceIds.current.has(place.id)) continue;
      const distance = getDistanceMeters(lat, lon, place.latitude, place.longitude);
      if (distance <= PLACE_DETECT_RADIUS_M) {
        visitedPlaceIds.current.add(place.id);
        const result = await rewardPlaceVisit(place.id, place.reward_xp);
        if (result.success) setRewardToast({ placeName: place.name, xp: place.reward_xp });
      }
    }
  };

  // ================================
  // GPS
  // ================================
  useEffect(() => {
    (async () => {
      const cells = await getExploredCells();
      if (cells && cells.length > 0) {
        const mapped: Record<string, boolean> = {};
        const circleFeatures = cells.map((cell: string) => {
          mapped[cell] = true;
          return turf.polygon([getCellCircle(cell, CELL_RADIUS)]) as Feature<Polygon>;
        });
        const merged = safeUnion(circleFeatures);
        if (merged) setMergedGeometry(merged);
        setExplored(mapped);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          setLocation(loc);

          if (lastPosition.current) {
            const delta = getDistanceMeters(
              lastPosition.current.lat, lastPosition.current.lon,
              latitude, longitude
            );
            if (delta < 50) accumulateDistance(delta);
          }
          lastPosition.current = { lat: latitude, lon: longitude };

          const key = getCellKey(latitude, longitude);
          setExplored((prev) => {
            if (prev[key]) return prev;
            const newCircle = turf.polygon([getCellCircle(key, CELL_RADIUS)]) as Feature<Polygon>;
            setMergedGeometry((prevGeom) => {
              if (!prevGeom) return newCircle;
              return safeUnion([prevGeom as Feature<Polygon | MultiPolygon>, newCircle]) ?? prevGeom;
            });
            queueCellForSync(key);
            animatedRadius.setValue(0);
            Animated.timing(animatedRadius, { toValue: CELL_RADIUS, duration: 600, useNativeDriver: false }).start();
            return { ...prev, [key]: true };
          });

          setPlaces((currentPlaces) => {
            checkNearbyPlaces(latitude, longitude, currentPlaces);
            return currentPlaces;
          });
        }
      );
    })();
  }, []);

  // ================================
  // APARICIÓN
  // ================================
  useEffect(() => {
    if (mapReady && location) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      Animated.timing(loadingFade, { toValue: 0, duration: 600, useNativeDriver: true }).start(
        () => setShowLoading(false)
      );
    }
  }, [mapReady, location]);

  // Altura del botón de ubicación: por encima del BottomNav (70px) + safe area bottom
  const locationButtonBottom = 70 + insets.bottom + 16;

  // ================================
  // RENDER
  // ================================
  return (
    <View style={{ flex: 1 }}>
      {location && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <MapboxGL.MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            styleURL={`mapbox://styles/mapbox/${mapStyle.toLowerCase()}`}
            onDidFinishLoadingMap={() => setMapReady(true)}
            // Desplazar el ornamento de escala para que no quede bajo el status bar
            scaleBarPosition={{ top: insets.top + 8, left: 8 }}
            compassViewPosition={1}
            compassViewMargins={{ x: 16, y: insets.top + 8 }}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={18}
              centerCoordinate={[location.coords.longitude, location.coords.latitude]}
            />
            <MapboxGL.UserLocation visible />

            {popularPlaces.map((place) => (
              <MapboxGL.PointAnnotation
                key={place.id}
                id={place.id}
                coordinate={[place.longitude, place.latitude]}
              >
                <View style={styles.hotspotMarker}>
                  <Text style={styles.hotspotText}>🔥</Text>
                </View>
              </MapboxGL.PointAnnotation>
            ))}

            {places.map((place) => {
              const visited = visitedPlaceIds.current.has(place.id);
              return (
                <MapboxGL.PointAnnotation
                  key={place.id}
                  id={`place-${place.id}`}
                  coordinate={[place.longitude, place.latitude]}
                >
                  <View style={[styles.placeMarker, visited && styles.placeMarkerVisited]}>
                    <Text style={styles.placeText}>{visited ? "✅" : "📍"}</Text>
                  </View>
                </MapboxGL.PointAnnotation>
              );
            })}

            {fogShape && (
              <MapboxGL.ShapeSource id="fog-source" shape={fogShape}>
                <MapboxGL.FillLayer
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
        <Animated.View style={[styles.loadingOverlay, { opacity: loadingFade }]}>
          <Image
            source={require("../assets/images/splash-icon.png")}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </Animated.View>
      )}

      {rewardToast && (
        <PlaceRewardToast
          toast={rewardToast}
          onHide={() => setRewardToast(null)}
          topInset={insets.top}
        />
      )}

      {location && (
        <TouchableOpacity
          style={[styles.myLocationButton, { bottom: locationButtonBottom }]}
          onPress={() =>
            cameraRef.current?.setCamera({
              centerCoordinate: [location.coords.longitude, location.coords.latitude],
              zoomLevel: 18,
              heading: 0,
              pitch: 0,
              animationDuration: 800,
            })
          }
        >
          <Text style={styles.buttonText}>🧭</Text>
        </TouchableOpacity>
      )}

      {/* MissionsMenu y GameMenu reciben el inset para posicionarse correctamente */}
      <MissionsMenu topInset={insets.top} bottomInset={insets.bottom} />
      <GameMenu bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  myLocationButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "#1e90ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  buttonText: { color: "white", fontSize: 22 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: { marginTop: 15, color: "#e2e8f0", fontSize: 16, fontWeight: "500" },
  hotspotMarker: {
    backgroundColor: "rgba(255, 69, 0, 0.8)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ffeb3b",
    shadowColor: "#ff4500",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  hotspotText: { fontSize: 16 },
  placeMarker: {
    backgroundColor: "rgba(34,211,238,0.15)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#22d3ee",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  placeMarkerVisited: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.1)",
    shadowColor: "#4ade80",
  },
  placeText: { fontSize: 16 },
});