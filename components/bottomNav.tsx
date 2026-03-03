import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;
export type MenuType = "bitacora" | "favoritos" | "perfil" | "ajustes";

interface TabItem {
  name: string;
  icon: IconName;
  key: MenuType;
}

interface Props {
  activeMenu: MenuType | null;
  onSelect: (menu: MenuType | null) => void;
}

export default function BottomNav({ activeMenu, onSelect }: Props) {
  const tabs: TabItem[] = [
    { name: "Bitácora", icon: "book-outline", key: "bitacora" },
    { name: "Favoritos", icon: "star-outline", key: "favoritos" },
    { name: "Perfil", icon: "person-outline", key: "perfil" },
    { name: "Ajustes", icon: "settings-outline", key: "ajustes" },
  ];

  const activeIndex = tabs.findIndex(tab => tab.key === activeMenu);
  const indicatorPosition = useRef(new Animated.Value(activeIndex === -1 ? 0 : activeIndex)).current;

  useEffect(() => {
    if (activeIndex !== -1) {
      Animated.spring(indicatorPosition, {
        toValue: activeIndex,
        useNativeDriver: false,
        speed: 20,
        bounciness: 8,
      }).start();
    }
  }, [activeIndex]);

  const indicatorTranslate = indicatorPosition.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * (100 / tabs.length)),
  });

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={40} tint="dark" style={styles.container}>
        {/* Indicador */}
        {activeIndex !== -1 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                left: indicatorTranslate.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                width: `${100 / tabs.length}%`,
              },
            ]}
          />
        )}

        {tabs.map((tab, index) => {
          const isActive = activeMenu === tab.key;
          const activeIcon = tab.icon.replace("-outline", "") as IconName;

          return (
            <TouchableOpacity
              key={index}
              style={styles.tab}
              onPress={() => 
                onSelect(activeMenu === tab.key ? null : tab.key)
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? activeIcon : tab.icon}
                size={24}
                color={isActive ? "#22d3ee" : "#aaa"}
              />
              <Text style={[styles.label, isActive && styles.activeText]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,10,20,0.6)",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    zIndex: 2,
  },
  label: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  activeText: {
    color: "#22d3ee",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    height: 3,
    backgroundColor: "#22d3ee",
    borderRadius: 2,
  },
});