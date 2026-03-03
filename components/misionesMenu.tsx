import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    BackHandler,
    Dimensions,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

type Mission = {
  title: string;
  progress: number;
  reward: string;
  rewardType: "xp" | "pin" | "skin";
};

export default function MissionsMenu() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const slideAnim = useRef(new Animated.Value(-350)).current;
  const indicator = useRef(new Animated.Value(0)).current;

  // =============================
  // Abrir / cerrar animación
  // =============================
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: open ? 0 : -350,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [open]);

  // =============================
  // Back button cierra menú
  // =============================
  useEffect(() => {
    const backAction = () => {
      if (open) {
        setOpen(false);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => sub.remove();
  }, [open]);

  // =============================
  // Indicador animado
  // =============================
  useEffect(() => {
    Animated.spring(indicator, {
      toValue: activeTab,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [activeTab]);

  // =============================
  // Swipe horizontal
  // =============================
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 50 && activeTab === 1) {
          setActiveTab(0);
        } else if (gesture.dx < -50 && activeTab === 0) {
          setActiveTab(1);
        }
      },
    })
  ).current;

  const missions: { daily: Mission[]; weekly: Mission[] } = {
    daily: [
      { title: "Descubre 0.3 km² hoy", progress: 0.4, reward: "100 XP", rewardType: "xp" },
      { title: "Encuentra 2 lugares", progress: 0.5, reward: "Pin común", rewardType: "pin" },
      { title: "Camina 2 km", progress: 0.2, reward: "80 XP", rewardType: "xp" },
      { title: "Zona completa", progress: 0.1, reward: "Skin fragmento", rewardType: "skin" },
    ],
    weekly: [
      { title: "Explora 2 km²", progress: 0.3, reward: "400 XP", rewardType: "xp" },
      { title: "Descubre 10 lugares", progress: 0.6, reward: "Pin raro", rewardType: "pin" },
      { title: "Camina 15 km", progress: 0.4, reward: "300 XP", rewardType: "xp" },
      { title: "Completa 3 zonas", progress: 0.2, reward: "Skin épica", rewardType: "skin" },
    ],
  };

  const renderRewardIcon = (type: Mission["rewardType"]) => {
    switch (type) {
      case "xp":
        return <Ionicons name="flash" size={18} color="#facc15" />;
      case "pin":
        return <Ionicons name="location" size={18} color="#22d3ee" />;
      case "skin":
        return <MaterialCommunityIcons name="tshirt-crew" size={18} color="#a78bfa" />;
    }
  };

  const renderMission = (mission: Mission, index: number) => (
    <View key={index} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.title}>{mission.title}</Text>
        <View style={styles.rewardContainer}>
          {renderRewardIcon(mission.rewardType)}
          <Text style={styles.reward}>{mission.reward}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${mission.progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );

  const translateIndicator = indicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <>
      {/* Botón */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen(!open)}
      >
        <Ionicons name="trophy" size={22} color="white" />
      </TouchableOpacity>

      {open && (
        <>
          {/* Fondo tocable para cerrar */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />

          {/* Panel */}
          <Animated.View
            style={[
              styles.panel,
              { transform: [{ translateX: slideAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            <BlurView intensity={100} tint="dark" style={styles.blur}>
              {/* Tabs */}
              <View style={styles.tabs}>
                <TouchableOpacity onPress={() => setActiveTab(0)} style={styles.tab}>
                  <Text style={[styles.tabText, activeTab === 0 && styles.activeTab]}>
                    Diarias
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab(1)} style={styles.tab}>
                  <Text style={[styles.tabText, activeTab === 1 && styles.activeTab]}>
                    Semanales
                  </Text>
                </TouchableOpacity>

                <Animated.View
                  style={[
                    styles.indicator,
                    { transform: [{ translateX: translateIndicator }] },
                  ]}
                />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {activeTab === 0
                  ? missions.daily.map(renderMission)
                  : missions.weekly.map(renderMission)}
              </ScrollView>
            </BlurView>
          </Animated.View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "#0f172a",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  panel: {
    position: "absolute",
    top: 120,
    left: 20,
    width: 300,
    height: 450,
    borderRadius: 28,
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    padding: 18,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 6,
    marginBottom: 20,
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    zIndex: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#aaa",
  },
  activeTab: {
    color: "#fff",
  },
  indicator: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 110,
    height: 36,
    backgroundColor: "#22d3ee",
    borderRadius: 18,
    opacity: 0.2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 15,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontSize: 14,
    flex: 1,
  },
  rewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reward: {
    color: "#facc15",
    fontSize: 12,
    marginLeft: 4,
  },
  progressBar: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 5,
  },
  progressFill: {
    height: 10,
    backgroundColor: "#22d3ee",
    borderRadius: 5,
  },
});