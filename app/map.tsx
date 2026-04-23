// ================================
// IMPORTACIONES
// ================================
import GameMenu from "@/components/gameMenu";
import MissionsMenu from "@/components/misionesMenu";
import { useMapSettings } from "@/context/mapConfig";
import MapboxGL from "@rnmapbox/maps";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Image, Modal, StyleSheet, Text,
  TextInput, TouchableOpacity, Vibration, View, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getExploredCells, queueCellForSync } from "../api/explorationService";
import { Place, getPlaces, getPopularPlaces, getVisitedPlaceIds, rewardPlaceVisit } from "../api/placesService";
import { endSession, startSession, updateSessionDistance } from "../api/sessionService";
import { GeocodedLocation, RouteResult, formatDistance, formatDuration, getWalkingRoute, reverseGeocode } from "../api/directionsService";
import { checkExplorationAchievements } from "../api/achievementService";
import { FavoritePlace, addFavorite, getFavorites, isFavorite, removeFavorite } from "../api/favoritosService";
import { isVibrationEnabled } from "../components/menus/ajustes";
import { supabase } from "../api/supabase";
import { MapEventPlace, registerViewOnMap } from "../utils/Mapevents";

// ================================
// NOTIFICACIONES
// ================================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ================================
// TASK MANAGER — carga segura
// ================================
const BACKGROUND_LOCATION_TASK = "background-location-task";
let TaskManager: typeof import("expo-task-manager") | null = null;
try {
  TaskManager = require("expo-task-manager");
  TaskManager!.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return;
    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations?.length > 0) {
        const loc = locations[locations.length - 1];
        try {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem("BG_LAST_LOCATION", JSON.stringify({
            lat: loc.coords.latitude, lon: loc.coords.longitude, ts: loc.timestamp,
          }));
        } catch (_) { }
      }
    }
  });
} catch (e) {
  console.log("expo-task-manager no disponible");
}

// ================================
// CONFIGURACION
// ================================
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "");
MapboxGL.setTelemetryEnabled(false);

const CELL_SIZE = 0.00045;
const CELL_RADIUS = 30;
const PLACE_DETECT_RADIUS_M = 50;
const ROUTE_COMPLETE_RADIUS_M = 30;
const KM2_PER_CELL = (Math.PI * 30 * 30) / 1_000_000;
const NAV_BAR_HEIGHT = 80;
const WALKING_SPEED_MS = 1.4;
const HOTSPOT_NOTIFY_RADIUS_M = 500;

// ================================
// HELPERS GEOMETRICOS
// ================================
function createCircle(center: [number, number], radiusInMeters: number) {
  const points = 64;
  const coords = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([center[0] + distanceX * Math.cos(theta), center[1] + distanceY * Math.sin(theta)]);
  }
  coords.push(coords[0]);
  return coords;
}

function getCellCircle(cellKey: string, radius: number) {
  const [x, y] = cellKey.split("_").map(Number);
  return createCircle([y * CELL_SIZE + CELL_SIZE / 2, x * CELL_SIZE + CELL_SIZE / 2], radius);
}

function getCellKey(lat: number, lon: number) {
  return `${Math.floor(lat / CELL_SIZE)}_${Math.floor(lon / CELL_SIZE)}`;
}

function safeUnion(features: Feature<Polygon | MultiPolygon>[]): Feature<Polygon | MultiPolygon> | null {
  if (features.length === 0) return null;
  if (features.length === 1) return features[0];
  return turf.union(turf.featureCollection(features)) as Feature<Polygon | MultiPolygon> | null;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return turf.distance(turf.point([lon1, lat1]), turf.point([lon2, lat2]), { units: "meters" });
}

function getRemainingDistance(userLat: number, userLon: number, routeCoords: [number, number][]): { meters: number; seconds: number } {
  if (routeCoords.length < 2) return { meters: 0, seconds: 0 };
  const userPt = turf.point([userLon, userLat]);
  const line = turf.lineString(routeCoords);
  const snapped = turf.nearestPointOnLine(line, userPt, { units: "meters" });
  const totalLength = turf.length(line, { units: "meters" });
  const distFromStart = snapped.properties.location ?? 0;
  const remainingMeters = Math.max(0, totalLength - distFromStart);
  return { meters: Math.round(remainingMeters), seconds: Math.round(remainingMeters / WALKING_SPEED_MS) };
}

function buildHeatmapGeoJSON(places: any[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: places.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: { intensity: Math.min((p.visit_percentage ?? 50) / 100, 1) },
    })),
  };
}

function buildRouteGeoJSON(coords: [number, number][]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }],
  };
}

async function grantRouteXp(xp: number): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const userId = userData.user.id;
  await supabase.from("xp_logs").insert({ user_id: userId, amount: xp, source_type: "route_complete", reference_id: null });
  const { data: profile } = await supabase.from("profiles").select("total_xp").eq("id", userId).single();
  if (profile) {
    const newXp = (profile.total_xp ?? 0) + xp;
    await supabase.from("profiles").update({ total_xp: newXp, level: Math.floor(newXp / 1000) + 1 }).eq("id", userId);
  }
}

async function saveCustomPlaceAsFavorite(name: string, lat: number, lon: number, description?: string): Promise<{ success: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false };
  const { data: place, error: placeError } = await supabase
    .from("places").insert({ name, description: description || null, latitude: lat, longitude: lon, reward_xp: 0, is_active: false })
    .select("id").single();
  if (placeError || !place) return { success: false };
  const { error: favError } = await supabase.from("favorites").insert({ user_id: userData.user.id, place_id: place.id });
  if (favError && favError.code !== "23505") return { success: false };
  return { success: true };
}

// ================================
// HINT
// ================================
function MapHint({ visible, topInset }: { visible: boolean; topInset: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Animated.View pointerEvents="none" style={[hintStyles.container, { top: topInset + 14, opacity }]}>
      <Text style={hintStyles.icon}>👆</Text>
      <Text style={hintStyles.text}>Manten presionado para elegir destino</Text>
    </Animated.View>
  );
}

const hintStyles = StyleSheet.create({
  container: {
    position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center",
    gap: 8, backgroundColor: "rgba(10,20,40,0.82)", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", zIndex: 50,
  },
  icon: { fontSize: 15, color: "rgba(255,255,255,0.75)" },
  text: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
});

// ================================
// MODAL: GUARDAR FAVORITO CUSTOM
// ================================
type SaveFavModalProps = {
  visible: boolean; defaultName: string; defaultDescription: string;
  onSave: (name: string, description: string) => void; onCancel: () => void;
};

function SaveFavoriteModal({ visible, defaultName, defaultDescription, onSave, onCancel }: SaveFavModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setName(defaultName); setDescription(defaultDescription); setSaving(false); }
  }, [visible, defaultName, defaultDescription]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={saveFavStyles.backdrop}>
        <View style={saveFavStyles.card}>
          <Text style={saveFavStyles.title}>Guardar en favoritos</Text>
          <Text style={saveFavStyles.subtitle}>Ponle un nombre a este lugar</Text>
          <Text style={saveFavStyles.label}>Nombre *</Text>
          <TextInput style={saveFavStyles.input} value={name} onChangeText={setName}
            placeholder="Ej: Casa de mi amigo" placeholderTextColor="#475569" maxLength={60} autoFocus />
          <Text style={saveFavStyles.label}>Descripcion (opcional)</Text>
          <TextInput style={[saveFavStyles.input, { height: 72 }]} value={description} onChangeText={setDescription}
            placeholder="Ej: Esquina con semaforo" placeholderTextColor="#475569" maxLength={120} multiline textAlignVertical="top" />
          <View style={saveFavStyles.actions}>
            <TouchableOpacity style={saveFavStyles.cancelBtn} onPress={onCancel}>
              <Text style={saveFavStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[saveFavStyles.saveBtn, (!name.trim() || saving) && { opacity: 0.5 }]}
              onPress={() => { if (!name.trim() || saving) return; setSaving(true); onSave(name.trim(), description.trim()); }}
              disabled={!name.trim() || saving}
            >
              {saving ? <ActivityIndicator size="small" color="#020617" /> : <Text style={saveFavStyles.saveText}>❤️ Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const saveFavStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.75)", padding: 24 },
  card: { width: "100%", backgroundColor: "rgba(10,20,40,0.98)", borderRadius: 24, borderWidth: 1, borderColor: "rgba(34,211,238,0.25)", padding: 24 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#475569", fontSize: 13, marginBottom: 20 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, color: "#fff", fontSize: 14, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cancelText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
  saveBtn: { flex: 1.5, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#22d3ee" },
  saveText: { color: "#020617", fontWeight: "800", fontSize: 14 },
});

// ================================
// TOAST XP
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
    <Animated.View style={[toastStyles.container, { opacity, top: topInset + 64 }]}>
      <Text style={toastStyles.emoji}>📍</Text>
      <View><Text style={toastStyles.title}>¡Lugar descubierto!</Text><Text style={toastStyles.name}>{toast.placeName}</Text></View>
      <View style={toastStyles.xpBadge}><Text style={toastStyles.xpText}>+{toast.xp} XP</Text></View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(10,20,40,0.95)", borderWidth: 1, borderColor: "rgba(34,211,238,0.4)", borderRadius: 20, paddingVertical: 12, paddingHorizontal: 18, zIndex: 100, elevation: 20 },
  emoji: { fontSize: 24 },
  title: { color: "#22d3ee", fontSize: 12, fontWeight: "600" },
  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  xpBadge: { backgroundColor: "rgba(34,211,238,0.15)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  xpText: { color: "#22d3ee", fontWeight: "800", fontSize: 14 },
});

// ================================
// TOAST LOGRO
// ================================
type AchievementToast = { title: string; description: string };

function AchievementToastView({ toast, onHide, topInset }: { toast: AchievementToast; onHide: () => void; topInset: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    const t = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(onHide), 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[achievStyles.container, { opacity, transform: [{ translateY }], top: topInset + 64 }]}>
      <View style={achievStyles.iconWrap}><Text style={{ fontSize: 22 }}>🏆</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={achievStyles.label}>¡Logro desbloqueado!</Text>
        <Text style={achievStyles.title}>{toast.title}</Text>
        <Text style={achievStyles.desc} numberOfLines={1}>{toast.description}</Text>
      </View>
    </Animated.View>
  );
}

const achievStyles = StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(10,20,40,0.97)", borderWidth: 1, borderColor: "rgba(250,204,21,0.5)", borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, zIndex: 101, elevation: 21, shadowColor: "#facc15", shadowOpacity: 0.3, shadowRadius: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(250,204,21,0.12)", borderWidth: 1, borderColor: "rgba(250,204,21,0.3)", justifyContent: "center", alignItems: "center" },
  label: { color: "#facc15", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 1 },
  desc: { color: "#64748b", fontSize: 12, marginTop: 2 },
});

// ================================
// MODAL RUTA COMPLETADA
// ================================
type RouteCompleteSummary = { destName: string; distanceMeters: number; durationSeconds: number; xpEarned: number };

function RouteCompleteModal({ summary, onClose }: { summary: RouteCompleteSummary; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <Animated.View style={[modalStyles.card, { opacity, transform: [{ scale }] }]}>
          <View style={modalStyles.iconCircle}><Text style={{ fontSize: 36 }}>🏁</Text></View>
          <Text style={modalStyles.heading}>¡Ruta completada!</Text>
          <Text style={modalStyles.destName} numberOfLines={1}>{summary.destName}</Text>
          <View style={modalStyles.statsRow}>
            <View style={modalStyles.statBox}>
              <Text style={modalStyles.statValue}>{formatDistance(summary.distanceMeters)}</Text>
              <Text style={modalStyles.statLabel}>Distancia</Text>
            </View>
            <View style={[modalStyles.statBox, modalStyles.statBoxCenter]}>
              <Text style={modalStyles.statValue}>{formatDuration(summary.durationSeconds)}</Text>
              <Text style={modalStyles.statLabel}>Tiempo</Text>
            </View>
            <View style={modalStyles.statBox}>
              <Text style={[modalStyles.statValue, { color: "#22d3ee" }]}>+{summary.xpEarned}</Text>
              <Text style={modalStyles.statLabel}>XP ganada</Text>
            </View>
          </View>
          <TouchableOpacity style={modalStyles.btn} onPress={onClose}>
            <Text style={modalStyles.btnText}>¡Genial!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  card: { width: "82%", backgroundColor: "rgba(10,20,40,0.98)", borderRadius: 28, borderWidth: 1, borderColor: "rgba(34,211,238,0.3)", padding: 28, alignItems: "center", shadowColor: "#22d3ee", shadowOpacity: 0.25, shadowRadius: 20, elevation: 30 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(34,211,238,0.1)", borderWidth: 1, borderColor: "rgba(34,211,238,0.3)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  heading: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  destName: { color: "#64748b", fontSize: 13, marginBottom: 24, textAlign: "center" },
  statsRow: { flexDirection: "row", width: "100%", marginBottom: 24 },
  statBox: { flex: 1, alignItems: "center" },
  statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 8 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel: { color: "#475569", fontSize: 11, fontWeight: "500" },
  btn: { backgroundColor: "#22d3ee", paddingVertical: 14, paddingHorizontal: 50, borderRadius: 18, width: "100%", alignItems: "center" },
  btnText: { color: "#020617", fontSize: 16, fontWeight: "800" },
});

type CustomDestination = { lon: number; lat: number; geocoded: GeocodedLocation | null; loadingGeocode: boolean };

// ================================
// COMPONENTE PRINCIPAL
// ================================
export default function MapScreen() {
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [explored, setExplored] = useState<Record<string, boolean>>({});
  const [popularPlaces, setPopularPlaces] = useState<any[]>([]);
  const [heatmapGeoJSON, setHeatmapGeoJSON] = useState<FeatureCollection<Point> | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoritePlace[]>([]);
  const favoritedIdsRef = useRef<Set<string>>(new Set());
  const [hotspotIds, setHotspotIds] = useState<Set<string>>(new Set());
  const hotspotDataRef = useRef<Map<string, { visitors: number; visit_percentage: number }>>(new Map());

  // Ref de places para usar en callbacks sin dependencias
  const placesRef = useRef<Place[]>([]);
  useEffect(() => { placesRef.current = places; }, [places]);

  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const visitedPlaceIds = useRef<Set<string>>(new Set());

  const notifiedHotspotsRef = useRef<Set<string>>(new Set());
  const pendingDestRef = useRef<{ place: Place } | null>(null);

  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const [achievToast, setAchievToast] = useState<AchievementToast | null>(null);
  const achievQueue = useRef<AchievementToast[]>([]);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [customDest, setCustomDest] = useState<CustomDestination | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<FeatureCollection | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const routeCompleted = useRef(false);

  const [remainingMeters, setRemainingMeters] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const routeCoordsRef = useRef<[number, number][]>([]);

  const [routeSummary, setRouteSummary] = useState<RouteCompleteSummary | null>(null);
  const [calloutFav, setCalloutFav] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [saveFavModal, setSaveFavModal] = useState(false);
  const [customFavSaved, setCustomFavSaved] = useState(false);

  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = useCallback((ms = 3000) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintVisible(true);
    hintTimer.current = setTimeout(() => { setHintVisible(false); hintTimer.current = null; }, ms);
  }, []);

  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
  const pendingDistanceM = useRef(0);
  const distanceFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalCellsRef = useRef(0);
  const routeRef = useRef<RouteResult | null>(null);
  const selectedPlaceRef = useRef<Place | null>(null);
  const customDestRef = useRef<CustomDestination | null>(null);
  const locationRef = useRef<Location.LocationObject | null>(null);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  const [mergedGeometry, setMergedGeometry] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const animatedRadius = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(1)).current;
  const [showLoading, setShowLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const { mapStyle, fogColor } = useMapSettings();

  useEffect(() => { routeRef.current = route; }, [route]);
  useEffect(() => { selectedPlaceRef.current = selectedPlace; }, [selectedPlace]);
  useEffect(() => { customDestRef.current = customDest; }, [customDest]);
  useEffect(() => { locationRef.current = location; }, [location]);

  // ── Notificaciones ───────────────────────────────────────
  useEffect(() => {
    requestNotificationPermissions();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === "hotspot" && data?.place && locationRef.current) {
        const place: Place = data.place;
        handlePlaceSelectDirect(place);
        cameraRef.current?.setCamera({
          centerCoordinate: [place.longitude, place.latitude],
          zoomLevel: 16, animationDuration: 800,
        });
        setTimeout(() => { pendingDestRef.current = { place }; }, 900);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (pendingDestRef.current && location && mapReady) {
      const { place } = pendingDestRef.current;
      pendingDestRef.current = null;
      handleNavigateToPlace(place);
    }
  }, [location, mapReady]);

  // ── viewOnMap desde favoritos ────────────────────────────
  useEffect(() => {
    registerViewOnMap((eventPlace: MapEventPlace) => {
      handlePlaceSelectDirect({
        id: eventPlace.place_id, name: eventPlace.name, description: eventPlace.description,
        latitude: eventPlace.latitude, longitude: eventPlace.longitude,
        reward_xp: eventPlace.reward_xp, is_active: true,
      });
      cameraRef.current?.setCamera({
        centerCoordinate: [eventPlace.longitude, eventPlace.latitude],
        zoomLevel: 18, animationDuration: 600,
      });
    });
  }, []);

  useEffect(() => { if (mapReady && location) showHint(3000); }, [mapReady, location]);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  // ── Sesion ───────────────────────────────────────────────
  useEffect(() => {
    startSession();
    return () => {
      if (distanceFlushTimer.current) clearTimeout(distanceFlushTimer.current);
      flushDistance(); endSession();
    };
  }, []);

  const flushDistance = () => {
    if (pendingDistanceM.current > 0) { updateSessionDistance(pendingDistanceM.current); pendingDistanceM.current = 0; }
    if (distanceFlushTimer.current) { clearTimeout(distanceFlushTimer.current); distanceFlushTimer.current = null; }
  };

  const accumulateDistance = (m: number) => {
    pendingDistanceM.current += m;
    if (pendingDistanceM.current >= 100) { flushDistance(); return; }
    if (!distanceFlushTimer.current) distanceFlushTimer.current = setTimeout(flushDistance, 30_000);
  };

  // ── GPS en segundo plano ─────────────────────────────────
  useEffect(() => {
    if (!TaskManager) return;
    (async () => {
      try {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== "granted") return;
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "NieblаGO activo",
              notificationBody: "Registrando tu exploracion...",
              notificationColor: "#22d3ee",
            },
            pausesUpdatesAutomatically: false,
          });
        }
      } catch (e) {
        console.log("Background location no disponible en este entorno:", e);
      }
    })();
    return () => {
      if (!TaskManager) return;
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        .then((active) => { if (active) Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK); })
        .catch(() => { });
    };
  }, []);

  // ── Realtime — canal estable sin dependencias ────────────
  const refreshHotspots = useCallback(async () => {
    const data = await getPopularPlaces();
    if (!data?.length) return;

    const newMap = new Map<string, { visitors: number; visit_percentage: number }>();
    data.forEach((p: any) => newMap.set(p.id, { visitors: p.visitors, visit_percentage: p.visit_percentage }));

    const prevIds = new Set(hotspotDataRef.current.keys());
    const newHotspots = data.filter((p: any) => !prevIds.has(p.id));

    hotspotDataRef.current = newMap;
    setHotspotIds(new Set(newMap.keys()));
    setPopularPlaces(data);
    setHeatmapGeoJSON(buildHeatmapGeoJSON(data));

    if (newHotspots.length > 0 && locationRef.current) {
      const { latitude, longitude } = locationRef.current.coords;
      for (const hotspot of newHotspots) {
        if (notifiedHotspotsRef.current.has(hotspot.id)) continue;
        const dist = getDistanceMeters(latitude, longitude, hotspot.latitude, hotspot.longitude);
        if (dist <= HOTSPOT_NOTIFY_RADIUS_M) {
          notifiedHotspotsRef.current.add(hotspot.id);
          const placeInfo = placesRef.current.find((p) => p.id === hotspot.id);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Hotspot cercano",
              body: `${hotspot.name ?? "Lugar popular"} a ${formatDistance(dist)}. Toca para ir.`,
              data: {
                type: "hotspot",
                place: placeInfo ?? {
                  id: hotspot.id, name: hotspot.name, description: null,
                  latitude: hotspot.latitude, longitude: hotspot.longitude, reward_xp: 0, is_active: true,
                },
              },
            },
            trigger: null,
          });
        }
      }
    }
  }, []); // sin dependencias, usa refs

  // Canal realtime con dependencias vacias — vive toda la sesion
  useEffect(() => {
    const channel = supabase
      .channel("hotspot-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_place_visits" },
        (payload) => {
          console.log("Realtime evento recibido:", payload);
          refreshHotspots();
        }
      )
      .subscribe((status) => {
        console.log("Canal estado:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, []); // sin dependencias

  // ── Logros ───────────────────────────────────────────────
  const showNextAchievement = () => { if (achievQueue.current.length > 0) setAchievToast(achievQueue.current.shift()!); };

  const queueAchievements = async (keys: string[]) => {
    if (keys.length === 0) return;
    const v = await isVibrationEnabled(); if (v) Vibration.vibrate([0, 100, 80, 100]);
    const { data } = await supabase.from("achievements").select("key, title, description").in("key", keys);
    (data ?? []).forEach((a: any) => achievQueue.current.push({ title: a.title, description: a.description }));
    if (!achievToast) showNextAchievement();
  };

  // ── Callout ──────────────────────────────────────────────
  const animateCalloutIn = () =>
    Animated.timing(calloutOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();

  const clearAll = () => {
    Animated.timing(calloutOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setSelectedPlace(null); setCustomDest(null); setRoute(null); setRouteGeoJSON(null);
      setCustomFavSaved(false); routeCompleted.current = false;
      setRemainingMeters(null); setRemainingSeconds(null); routeCoordsRef.current = [];
    });
  };

  const handlePlaceSelectDirect = (place: Place) => {
    setCustomDest(null); setRoute(null); setRouteGeoJSON(null); setCustomFavSaved(false);
    setRemainingMeters(null); setRemainingSeconds(null); routeCoordsRef.current = [];
    setSelectedPlace(place); animateCalloutIn();
    isFavorite(place.id).then(setCalloutFav);
  };

  const handleToggleFavorite = async () => {
    if (!selectedPlace || togglingFav) return;
    setTogglingFav(true);
    if (calloutFav) {
      await removeFavorite(selectedPlace.id); setCalloutFav(false);
      setUserFavorites((prev) => prev.filter((f) => f.place_id !== selectedPlace.id));
      favoritedIdsRef.current.delete(selectedPlace.id);
    } else {
      await addFavorite(selectedPlace.id); setCalloutFav(true);
      const v = await isVibrationEnabled(); if (v) Vibration.vibrate(60);
      loadUserFavorites();
    }
    setTogglingFav(false);
  };

  const loadUserFavorites = async () => {
    const favs = await getFavorites();
    setUserFavorites(favs);
    favoritedIdsRef.current = new Set(favs.map((f) => f.place_id));
  };

  const handleSaveCustomFav = async (name: string, description: string) => {
    const dest = customDestRef.current;
    if (!dest) return;
    const result = await saveCustomPlaceAsFavorite(name, dest.lat, dest.lon, description);
    setSaveFavModal(false);
    if (result.success) {
      setCustomFavSaved(true);
      const v = await isVibrationEnabled(); if (v) Vibration.vibrate(60);
      loadUserFavorites();
    }
  };

  const handleLongPress = async (e: any) => {
    if (routeRef.current) return;
    const [lon, lat] = e.geometry.coordinates as [number, number];
    setSelectedPlace(null); setRoute(null); setRouteGeoJSON(null); setCustomFavSaved(false);
    setCustomDest({ lon, lat, geocoded: null, loadingGeocode: true });
    animateCalloutIn(); showHint(2500);
    const geocoded = await reverseGeocode(lon, lat);
    setCustomDest((prev) => prev ? { ...prev, geocoded, loadingGeocode: false } : null);
  };

  const handleNavigateToPlace = async (place: Place) => {
    const loc = locationRef.current;
    if (!loc) return;
    setLoadingRoute(true);
    const result = await getWalkingRoute(loc.coords.longitude, loc.coords.latitude, place.longitude, place.latitude);
    setLoadingRoute(false);
    if (!result) return;
    routeCompleted.current = false;
    routeCoordsRef.current = result.coordinates;
    setRoute(result); setRouteGeoJSON(buildRouteGeoJSON(result.coordinates));
    setRemainingMeters(Math.round(result.distanceMeters));
    setRemainingSeconds(Math.round(result.durationSeconds));
    const bounds = result.coordinates.reduce(
      (acc, [lon, lat]) => ({ minLon: Math.min(acc.minLon, lon), maxLon: Math.max(acc.maxLon, lon), minLat: Math.min(acc.minLat, lat), maxLat: Math.max(acc.maxLat, lat) }),
      { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
    );
    cameraRef.current?.fitBounds([bounds.maxLon, bounds.maxLat], [bounds.minLon, bounds.minLat], [insets.top + 80, 60, 200, 60], 800);
  };

  const handleNavigate = async () => {
    if (selectedPlaceRef.current) return handleNavigateToPlace(selectedPlaceRef.current);
    const toLon = customDestRef.current?.lon;
    const toLat = customDestRef.current?.lat;
    if (!location || toLon === undefined || toLat === undefined) return;
    setLoadingRoute(true);
    const result = await getWalkingRoute(location.coords.longitude, location.coords.latitude, toLon, toLat);
    setLoadingRoute(false);
    if (!result) return;
    routeCompleted.current = false;
    routeCoordsRef.current = result.coordinates;
    setRoute(result); setRouteGeoJSON(buildRouteGeoJSON(result.coordinates));
    setRemainingMeters(Math.round(result.distanceMeters));
    setRemainingSeconds(Math.round(result.durationSeconds));
    const bounds = result.coordinates.reduce(
      (acc, [lon, lat]) => ({ minLon: Math.min(acc.minLon, lon), maxLon: Math.max(acc.maxLon, lon), minLat: Math.min(acc.minLat, lat), maxLat: Math.max(acc.maxLat, lat) }),
      { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
    );
    cameraRef.current?.fitBounds([bounds.maxLon, bounds.maxLat], [bounds.minLon, bounds.minLat], [insets.top + 80, 60, 200, 60], 800);
  };

  const checkRouteComplete = async (userLat: number, userLon: number) => {
    const activeRoute = routeRef.current;
    if (!activeRoute || routeCompleted.current) return;
    const destLon = selectedPlaceRef.current?.longitude ?? customDestRef.current?.lon;
    const destLat = selectedPlaceRef.current?.latitude ?? customDestRef.current?.lat;
    if (destLon === undefined || destLat === undefined) return;
    if (getDistanceMeters(userLat, userLon, destLat, destLon) > ROUTE_COMPLETE_RADIUS_M) return;
    routeCompleted.current = true;
    const xp = activeRoute.estimatedXp;
    const name = selectedPlaceRef.current?.name ?? customDestRef.current?.geocoded?.shortName ?? "Destino";
    await grantRouteXp(xp);
    const v = await isVibrationEnabled(); if (v) Vibration.vibrate([0, 150, 100, 150, 100, 200]);
    setRouteSummary({ destName: name, distanceMeters: activeRoute.distanceMeters, durationSeconds: activeRoute.durationSeconds, xpEarned: xp });
    setRoute(null); setRouteGeoJSON(null); setSelectedPlace(null); setCustomDest(null);
    setRemainingMeters(null); setRemainingSeconds(null); routeCoordsRef.current = [];
    calloutOpacity.setValue(0);
  };

  const fogShape: Feature<Polygon | MultiPolygon> | null = React.useMemo(() => {
    if (!mergedGeometry) return null;
    const world = turf.polygon([[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]]);
    return turf.difference(turf.featureCollection([world, mergedGeometry])) as Feature<Polygon | MultiPolygon> | null;
  }, [mergedGeometry]);

  // ── Datos iniciales ──────────────────────────────────────
  useEffect(() => {
    getPopularPlaces().then((data) => {
      if (data?.length > 0) {
        const map = new Map<string, { visitors: number; visit_percentage: number }>();
        data.forEach((p: any) => map.set(p.id, { visitors: p.visitors, visit_percentage: p.visit_percentage }));
        hotspotDataRef.current = map;
        setHotspotIds(new Set(map.keys()));
        setPopularPlaces(data);
        setHeatmapGeoJSON(buildHeatmapGeoJSON(data));
      }
    });
    Promise.all([getPlaces(), getVisitedPlaceIds()]).then(([fp, visited]) => {
      setPlaces(fp);
      visitedPlaceIds.current = visited;
      setVisitedSet(new Set(visited));
    });
    loadUserFavorites();
  }, []);

  const checkNearbyPlaces = async (lat: number, lon: number, currentPlaces: Place[]) => {
    for (const place of currentPlaces) {
      if (visitedPlaceIds.current.has(place.id)) continue;
      if (getDistanceMeters(lat, lon, place.latitude, place.longitude) <= PLACE_DETECT_RADIUS_M) {
        visitedPlaceIds.current.add(place.id);
        setVisitedSet((prev) => new Set([...prev, place.id]));
        const result = await rewardPlaceVisit(place.id, place.reward_xp);
        if (result.success) {
          setRewardToast({ placeName: place.name, xp: place.reward_xp });
          const v = await isVibrationEnabled(); if (v) Vibration.vibrate(120);
          const newKeys = await checkExplorationAchievements(totalCellsRef.current, totalCellsRef.current * KM2_PER_CELL, visitedPlaceIds.current.size, 0, result.newLevel ?? 1);
          if (newKeys.length > 0) queueAchievements(newKeys);
        }
      }
    }
  };

  // ── GPS foreground ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cells = await getExploredCells();
      if (cells?.length > 0) {
        totalCellsRef.current = cells.length;
        const mapped: Record<string, boolean> = {};
        const feats = cells.map((c: string) => { mapped[c] = true; return turf.polygon([getCellCircle(c, CELL_RADIUS)]) as Feature<Polygon>; });
        const merged = safeUnion(feats);
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
            const delta = getDistanceMeters(lastPosition.current.lat, lastPosition.current.lon, latitude, longitude);
            if (delta < 50) accumulateDistance(delta);
          }
          lastPosition.current = { lat: latitude, lon: longitude };
          await checkRouteComplete(latitude, longitude);

          if (routeCoordsRef.current.length >= 2) {
            const remaining = getRemainingDistance(latitude, longitude, routeCoordsRef.current);
            setRemainingMeters(remaining.meters);
            setRemainingSeconds(remaining.seconds);
          }

          const key = getCellKey(latitude, longitude);
          setExplored((prev) => {
            if (prev[key]) return prev;
            totalCellsRef.current += 1;
            const nc = turf.polygon([getCellCircle(key, CELL_RADIUS)]) as Feature<Polygon>;
            setMergedGeometry((pg) => { if (!pg) return nc; return safeUnion([pg as Feature<Polygon | MultiPolygon>, nc]) ?? pg; });
            queueCellForSync(key);
            animatedRadius.setValue(0);
            Animated.timing(animatedRadius, { toValue: CELL_RADIUS, duration: 600, useNativeDriver: false }).start();
            checkExplorationAchievements(totalCellsRef.current, totalCellsRef.current * KM2_PER_CELL, visitedPlaceIds.current.size, 0, 1)
              .then((keys) => { if (keys.length > 0) queueAchievements(keys); });
            return { ...prev, [key]: true };
          });
          setPlaces((cp) => { checkNearbyPlaces(latitude, longitude, cp); return cp; });
        }
      );
    })();
  }, []);

  useEffect(() => {
    if (mapReady && location) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      Animated.timing(loadingFade, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setShowLoading(false));
    }
  }, [mapReady, location]);

  // ── Dimensiones ──────────────────────────────────────────
  const navHeight = 70 + insets.bottom;
  const hasCallout = (selectedPlace || customDest) && !route;
  const navDestName = selectedPlace?.name ?? customDest?.geocoded?.shortName ?? "Destino";
  const calloutBottom = navHeight + 16;
  const defaultFavName = customDest?.geocoded?.shortName ?? "Mi lugar";
  const defaultFavDesc = customDest?.geocoded?.address ?? "";
  const activePlaceIds = new Set(places.map((p) => p.id));
  const compassBottom = route ? calloutBottom + NAV_BAR_HEIGHT + 8 : navHeight + 16;
  const selectedHotspot = selectedPlace ? hotspotDataRef.current.get(selectedPlace.id) : null;

  // ================================
  // RENDER
  // ================================
  return (
    <View style={{ flex: 1 }}>
      {location && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <MapboxGL.MapView
            ref={mapRef} style={StyleSheet.absoluteFill}
            styleURL={`mapbox://styles/mapbox/${mapStyle.toLowerCase()}`}
            onDidFinishLoadingMap={() => setMapReady(true)}
            scaleBarPosition={{ bottom: navHeight + 8, left: 12 }}
            compassViewPosition={1} compassViewMargins={{ x: 16, y: insets.top + 8 }}
            onPress={() => { if (hasCallout) clearAll(); }}
            onLongPress={handleLongPress}
          >
            <MapboxGL.Camera ref={cameraRef} zoomLevel={18}
              centerCoordinate={[location.coords.longitude, location.coords.latitude]} />
            <MapboxGL.UserLocation visible />

            {routeGeoJSON && (
              <MapboxGL.ShapeSource id="route-source" shape={routeGeoJSON}>
                <MapboxGL.LineLayer id="route-shadow" style={{ lineColor: "#000", lineWidth: 8, lineOpacity: 0.25, lineCap: "round", lineJoin: "round" }} />
                <MapboxGL.LineLayer id="route-line" style={{ lineColor: "#22d3ee", lineWidth: 5, lineOpacity: 0.9, lineCap: "round", lineJoin: "round" }} />
              </MapboxGL.ShapeSource>
            )}

            {heatmapGeoJSON && heatmapGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource id="heatmap-source" shape={heatmapGeoJSON}>
                <MapboxGL.HeatmapLayer id="heatmap-layer" style={{
                  heatmapRadius: ["interpolate", ["linear"], ["zoom"], 10, 20, 15, 40, 18, 60],
                  heatmapWeight: ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 1],
                  heatmapIntensity: ["interpolate", ["linear"], ["zoom"], 10, 0.6, 18, 1.5],
                  heatmapColor: ["interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(0,0,0,0)", 0.15, "rgba(30,58,138,0.6)", 0.35, "rgba(6,182,212,0.7)",
                    0.55, "rgba(34,197,94,0.8)", 0.75, "rgba(250,204,21,0.85)", 1, "rgba(239,68,68,0.9)"],
                  heatmapOpacity: ["interpolate", ["linear"], ["zoom"], 13, 0.85, 17, 0.5, 19, 0.2],
                }} />
              </MapboxGL.ShapeSource>
            )}

            {popularPlaces.filter((p) => !activePlaceIds.has(p.id)).map((p) => (
              <MapboxGL.PointAnnotation key={`hot-${p.id}`} id={`hot-${p.id}`} coordinate={[p.longitude, p.latitude]}>
                <View style={styles.hotspotMarker}><Text style={styles.hotspotText}>🔥</Text></View>
              </MapboxGL.PointAnnotation>
            ))}

            {places.map((place) => {
              const visited = visitedSet.has(place.id);
              const isSel = selectedPlace?.id === place.id;
              const isFav = favoritedIdsRef.current.has(place.id);
              const isHotspot = hotspotIds.has(place.id);
              const icon = visited ? "✅" : isHotspot ? "🔥" : isFav ? "❤️" : "📍";
              return (
                <MapboxGL.PointAnnotation key={place.id} id={`place-${place.id}`}
                  coordinate={[place.longitude, place.latitude]}
                  onSelected={() => handlePlaceSelectDirect(place)}>
                  <View style={[
                    styles.placeMarker,
                    visited && styles.placeMarkerVisited,
                    isSel && styles.placeMarkerSelected,
                    isHotspot && !visited && !isSel && styles.placeMarkerHotspot,
                    isFav && !visited && !isSel && !isHotspot && styles.placeMarkerFav,
                  ]}>
                    <Text style={styles.placeText}>{icon}</Text>
                  </View>
                </MapboxGL.PointAnnotation>
              );
            })}

            {userFavorites.filter((fav) => !activePlaceIds.has(fav.place_id)).map((fav) => {
              const isSel = selectedPlace?.id === fav.place_id;
              return (
                <MapboxGL.PointAnnotation key={`fav-${fav.place_id}`} id={`fav-${fav.place_id}`}
                  coordinate={[fav.longitude, fav.latitude]}
                  onSelected={() => handlePlaceSelectDirect({
                    id: fav.place_id, name: fav.name, description: fav.description,
                    latitude: fav.latitude, longitude: fav.longitude, reward_xp: fav.reward_xp, is_active: false,
                  })}>
                  <View style={[styles.favMarker, isSel && styles.placeMarkerSelected]}>
                    <Text style={styles.placeText}>❤️</Text>
                  </View>
                </MapboxGL.PointAnnotation>
              );
            })}

            {customDest && (
              <MapboxGL.PointAnnotation key="custom-dest" id="custom-dest" coordinate={[customDest.lon, customDest.lat]}>
                <Text style={{ fontSize: 26 }}>📌</Text>
              </MapboxGL.PointAnnotation>
            )}

            {route && (selectedPlace || customDest) && (
              <MapboxGL.PointAnnotation key="destination" id="destination"
                coordinate={[selectedPlace?.longitude ?? customDest!.lon, selectedPlace?.latitude ?? customDest!.lat]}>
                <View style={styles.destinationMarker}><Text style={{ fontSize: 22 }}>🏁</Text></View>
              </MapboxGL.PointAnnotation>
            )}

            {fogShape && (
              <MapboxGL.ShapeSource id="fog-source" shape={fogShape}>
                <MapboxGL.FillLayer id="fog-layer" style={{ fillColor: fogColor, fillOpacity: 0.75, fillOutlineColor: "transparent" }} />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        </Animated.View>
      )}

      {showLoading && (
        <Animated.View style={[styles.loadingOverlay, { opacity: loadingFade }]}>
          <Image source={require("../assets/images/splash-icon.png")} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </Animated.View>
      )}

      <MapHint visible={hintVisible} topInset={insets.top} />

      {rewardToast && <PlaceRewardToast toast={rewardToast} onHide={() => setRewardToast(null)} topInset={insets.top} />}
      {achievToast && (
        <AchievementToastView toast={achievToast} topInset={insets.top}
          onHide={() => { setAchievToast(null); setTimeout(showNextAchievement, 400); }} />
      )}

      {routeSummary && <RouteCompleteModal summary={routeSummary} onClose={() => setRouteSummary(null)} />}

      <SaveFavoriteModal
        visible={saveFavModal} defaultName={defaultFavName} defaultDescription={defaultFavDesc}
        onSave={handleSaveCustomFav} onCancel={() => setSaveFavModal(false)}
      />

      {hasCallout && (
        <Animated.View style={[styles.callout, { bottom: calloutBottom, opacity: calloutOpacity }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.calloutTypeRow}>
              <Text style={styles.calloutTypeIcon}>
                {selectedPlace ? (favoritedIdsRef.current.has(selectedPlace.id) ? "♥" : "P") : "*"}
              </Text>
              <Text style={styles.calloutType}>
                {selectedPlace
                  ? hotspotDataRef.current.has(selectedPlace.id)
                    ? "Punto de interes · Lugar popular"
                    : "Punto de interes"
                  : "Destino personalizado"}
              </Text>
            </View>
            <Text style={styles.calloutName} numberOfLines={1}>
              {selectedPlace?.name ?? customDest?.geocoded?.shortName ?? (customDest?.loadingGeocode ? "Buscando..." : "Destino")}
            </Text>
            {(selectedPlace?.description || customDest?.geocoded?.address) ? (
              <Text style={styles.calloutDesc} numberOfLines={2}>{selectedPlace?.description ?? customDest?.geocoded?.address}</Text>
            ) : null}
            {customDest?.loadingGeocode && <ActivityIndicator size="small" color="#64748b" style={{ alignSelf: "flex-start", marginTop: 4 }} />}
            {selectedHotspot && (
              <View style={styles.hotspotInfo}>
                <Text style={styles.hotspotInfoText}>
                  🔥 {selectedHotspot.visitors} visitantes · {selectedHotspot.visit_percentage.toFixed(0)}% de exploradores
                </Text>
              </View>
            )}
            <Text style={styles.calloutXp}>
              {selectedPlace && selectedPlace.reward_xp > 0 ? `+${selectedPlace.reward_xp} XP al llegar`
                : selectedPlace ? "Destino guardado"
                  : "XP calculada al trazar ruta"}
            </Text>
          </View>
          <View style={styles.calloutActions}>
            {selectedPlace && (
              <TouchableOpacity style={styles.favBtn} onPress={handleToggleFavorite} disabled={togglingFav}>
                {togglingFav ? <ActivityIndicator size="small" color="#ff5a5f" /> : <Text style={{ fontSize: 20 }}>{calloutFav ? "❤️" : "🤍"}</Text>}
              </TouchableOpacity>
            )}
            {customDest && !customDest.loadingGeocode && (
              <TouchableOpacity style={styles.favBtn} onPress={() => !customFavSaved && setSaveFavModal(true)} disabled={customFavSaved}>
                <Text style={{ fontSize: 20 }}>{customFavSaved ? "❤️" : "🤍"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.calloutNavBtn, customDest?.loadingGeocode && { opacity: 0.6 }]}
              onPress={handleNavigate} disabled={loadingRoute || customDest?.loadingGeocode}>
              {loadingRoute ? <ActivityIndicator size="small" color="#020617" /> : <Text style={styles.calloutNavText}>Ir aqui</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.calloutCloseBtn} onPress={clearAll}>
              <Text style={styles.calloutCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {route && (
        <View style={[styles.navBar, { bottom: calloutBottom }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.navDest} numberOfLines={1}>{navDestName}</Text>
            <Text style={styles.navDetails}>
              {remainingMeters !== null
                ? `${formatDistance(remainingMeters)}  ·  ${formatDuration(remainingSeconds ?? 0)}`
                : `${formatDistance(route.distanceMeters)}  ·  ${formatDuration(route.durationSeconds)}`}
            </Text>
          </View>
          <View style={styles.navRight}>
            <View style={styles.navXpBadge}><Text style={styles.navXpText}>+{route.estimatedXp} XP</Text></View>
            <TouchableOpacity style={styles.navCancelBtn} onPress={clearAll}>
              <Text style={styles.navCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {location && !hasCallout && (
        <TouchableOpacity
          style={[styles.compassBtn, { bottom: compassBottom }]}
          onPress={() => cameraRef.current?.setCamera({
            centerCoordinate: [location.coords.longitude, location.coords.latitude],
            zoomLevel: 18, heading: 0, pitch: 0, animationDuration: 800,
          })}>
          <Text style={styles.compassText}>🧭</Text>
        </TouchableOpacity>
      )}

      <MissionsMenu topInset={insets.top} bottomInset={insets.bottom} />
      <GameMenu bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617", justifyContent: "center", alignItems: "center", zIndex: 999 },
  loadingText: { marginTop: 15, color: "#e2e8f0", fontSize: 16, fontWeight: "500" },
  compassBtn: { position: "absolute", right: 20, backgroundColor: "#1e90ff", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 8 },
  compassText: { fontSize: 22, color: "#fff", fontWeight: "700" },
  hotspotMarker: { backgroundColor: "rgba(255,69,0,0.8)", padding: 8, borderRadius: 20, borderWidth: 2, borderColor: "#ffeb3b", elevation: 10 },
  hotspotText: { fontSize: 16, color: "#fff" },
  placeMarker: { backgroundColor: "rgba(34,211,238,0.15)", padding: 8, borderRadius: 20, borderWidth: 2, borderColor: "#22d3ee", elevation: 8 },
  placeMarkerVisited: { borderColor: "#4ade80", backgroundColor: "rgba(74,222,128,0.1)" },
  placeMarkerSelected: { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.15)", elevation: 12 },
  placeMarkerFav: { borderColor: "#ff5a5f", backgroundColor: "rgba(255,90,95,0.12)" },
  placeMarkerHotspot: { borderColor: "#fb923c", backgroundColor: "rgba(251,146,60,0.15)", elevation: 10 },
  favMarker: { backgroundColor: "rgba(255,90,95,0.12)", padding: 8, borderRadius: 20, borderWidth: 2, borderColor: "#ff5a5f", elevation: 8 },
  placeText: { fontSize: 16, color: "#fff" },
  destinationMarker: { backgroundColor: "rgba(10,20,40,0.85)", padding: 6, borderRadius: 16, borderWidth: 2, borderColor: "#22d3ee" },
  hotspotInfo: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(251,146,60,0.1)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4, alignSelf: "flex-start" },
  hotspotInfoText: { color: "#fb923c", fontSize: 11, fontWeight: "600" },
  callout: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(10,20,40,0.97)", borderRadius: 22, borderWidth: 1, borderColor: "rgba(34,211,238,0.35)", padding: 16, gap: 12, elevation: 20 },
  calloutTypeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  calloutTypeIcon: { fontSize: 12, color: "#475569" },
  calloutType: { color: "#475569", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  calloutName: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  calloutDesc: { color: "#64748b", fontSize: 12, marginBottom: 4 },
  calloutXp: { color: "#22d3ee", fontSize: 12, fontWeight: "600" },
  calloutActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  favBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,90,95,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,90,95,0.2)" },
  calloutNavBtn: { backgroundColor: "#22d3ee", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, minWidth: 68, alignItems: "center" },
  calloutNavText: { color: "#020617", fontWeight: "700", fontSize: 13 },
  calloutCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  calloutCloseText: { color: "#64748b", fontSize: 14, fontWeight: "700" },
  navBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(10,20,40,0.97)", borderRadius: 22, borderWidth: 1, borderColor: "rgba(34,211,238,0.35)", paddingVertical: 14, paddingHorizontal: 18, gap: 12, elevation: 20 },
  navDest: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  navDetails: { color: "#22d3ee", fontSize: 13, fontWeight: "500" },
  navRight: { alignItems: "flex-end", gap: 6 },
  navXpBadge: { backgroundColor: "rgba(34,211,238,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  navXpText: { color: "#22d3ee", fontSize: 12, fontWeight: "700" },
  navCancelBtn: { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12 },
  navCancelText: { color: "#ef4444", fontWeight: "600", fontSize: 13 },
});