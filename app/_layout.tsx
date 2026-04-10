import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { MapSettingsProvider } from "../context/mapConfig";
import { supabase } from "../api/supabase";

export default function RootLayout() {
  useEffect(() => {
    // 1. Al arrancar, leer la sesión guardada en AsyncStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/map");
      } else {
        router.replace("/login");
      }
    });

    // 2. Escuchar cambios de sesión en tiempo real
    //    - Login  → manda al mapa
    //    - Logout → manda al login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace("/map");
        } else {
          router.replace("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <MapSettingsProvider>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="map" />
      </Stack>
    </MapSettingsProvider>
  );
}