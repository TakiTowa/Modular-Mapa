import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
  Animated, BackHandler, Dimensions, StyleSheet, TouchableOpacity, View,
} from "react-native";
import BottomNav, { MenuType } from "./bottomNav";
import { registerCloseMenu } from "../utils/Mapevents";

import AjustesMenu from "./menus/ajustes";
import BitacoraMenu from "./menus/bitacora";
import FavoritosMenu from "./menus/favoritos";
import PerfilMenu from "./menus/perfil";

const { height } = Dimensions.get("window");

interface Props { bottomInset?: number }

export default function GameMenu({ bottomInset = 0 }: Props) {
  const [menu, setMenu] = useState<MenuType | null>(null);
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Registrar el cierre para que favoritos.tsx pueda cerrarlo via mapEvents
  useEffect(() => {
    registerCloseMenu(() => setMenu(null));
  }, []);

  useEffect(() => {
    if (menu) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: height, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [menu]);

  useEffect(() => {
    const backAction = () => { if (menu) { setMenu(null); return true; } return false; };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, [menu]);

  const navHeight = 70 + bottomInset;

  const renderContent = () => {
    switch (menu) {
      case "perfil": return <PerfilMenu />;
      case "bitacora": return <BitacoraMenu />;
      case "favoritos": return <FavoritosMenu />;
      case "ajustes": return <AjustesMenu />;
      default: return null;
    }
  };

  return (
    <>
      {menu && (
        <>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.75)" }]} />
          </Animated.View>

          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { bottom: navHeight }]}
            activeOpacity={1} onPress={() => setMenu(null)}
          />

          <Animated.View style={[styles.panelContainer, { bottom: navHeight, transform: [{ translateY }] }]}>
            <BlurView intensity={70} tint="dark" style={styles.panel}>
              {renderContent()}
            </BlurView>
          </Animated.View>
        </>
      )}
      <BottomNav activeMenu={menu} onSelect={setMenu} bottomInset={bottomInset} />
    </>
  );
}

const styles = StyleSheet.create({
  panelContainer: { position: "absolute", top: 0, width: "100%" },
  panel: { flex: 1, padding: 20, paddingTop: 60, overflow: "hidden" },
});