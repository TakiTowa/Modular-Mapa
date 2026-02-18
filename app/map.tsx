import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import Svg, { Circle, Mask, Rect } from "react-native-svg";
import { exploreCell, getExploredCells } from "../api/explorationService";


export default function MapScreen() {
  /* ------------------------------
     ESTADOS
  ------------------------------ */

  // Ubicación actual
  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  // Cuadrículas exploradas
  const [explored, setExplored] =
    useState<Record<string, boolean>>({});

  // Carga inicial
  const [loading, setLoading] = useState(true);

  /* ------------------------------
     FUNCIÓN: dividir el mapa
  ------------------------------ */
  function getCellKey(lat: number, lon: number) {
    const size = 0.0005; // ~50m
    const x = Math.floor(lat / size);
    const y = Math.floor(lon / size);
    return `${x}_${y}`;
  }

  /* ------------------------------
     CARGAR PROGRESO GUARDADO
  ------------------------------ */
 async function loadExplored() {
  const cells = await getExploredCells();

  const mapped: Record<string, boolean> = {};
  cells.forEach((cell) => {
    mapped[cell] = true;
  });

  setExplored(mapped);
}


  /* ------------------------------
     EFECTO: iniciar GPS
  ------------------------------ */
  useEffect(() => {
    (async () => {
      await loadExplored();

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Permiso denegado");
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);

          const key = getCellKey(
            loc.coords.latitude,
            loc.coords.longitude
          );

          setExplored((prev) => {
            if (prev[key]) return prev;

            exploreCell(key); // ← ahora va a la API
            return {
              ...prev,
              [key]: true,
            };
          });


          setLoading(false);
        }
      );
    })();
  }, []);

  /* ------------------------------
     CARGA
  ------------------------------ */
  if (loading || !location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ------------------------------
     RENDER
  ------------------------------ */
  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        showsUserLocation
        followsUserLocation
        region={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      />

      {/* NIEBLA */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Mask id="fogMask">
          <Rect width="100%" height="100%" fill="white" />

          {/* Agujero centrado en el jugador */}
          <Circle
            cx="50%"
            cy="50%"
            r="120"
            fill="black"
          />
        </Mask>

        <Rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#fogMask)"
        />
      </Svg>
    </View>
  );
}

/* ------------------------------
   ESTILOS
------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
