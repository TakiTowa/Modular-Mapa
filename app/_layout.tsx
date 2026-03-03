// import { Stack } from "expo-router";
// import { StatusBar } from "expo-status-bar";

// export default function RootLayout() {
//   return (
//     <>
//       <Stack screenOptions={{ headerShown: false }} />
//       <StatusBar style="auto" />
//     </>
//   );
// }

import { Stack } from "expo-router";
import { MapSettingsProvider } from "../context/mapConfig";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <MapSettingsProvider>
       {children}
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="map" />
      </Stack>
    </MapSettingsProvider>
  );
}