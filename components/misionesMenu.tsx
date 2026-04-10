import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { MissionWithProgress, getMissionsWithProgress } from "@/api/missionsService";

interface Props {
  topInset?: number;
  bottomInset?: number;
}

// ================================
// HELPER DE FORMATO
// ================================
function formatMetric(value: number, metric: string): string {
  switch (metric) {
    case "km2":         return `${value.toFixed(3)} km²`;
    case "distance_km": return `${value.toFixed(2)} km`;
    case "places":
    case "cells":       return String(Math.floor(value));
    default:            return String(value);
  }
}

// ================================
// TARJETA DE MISIÓN
// ================================
function MissionCard({ mission }: { mission: MissionWithProgress }) {
  const pct = Math.round(mission.progress * 100);

  const renderRewardIcon = () => {
    switch (mission.reward_type) {
      case "xp":   return <Ionicons name="flash" size={16} color="#facc15" />;
      case "pin":  return <Ionicons name="location" size={16} color="#22d3ee" />;
      case "skin": return <MaterialCommunityIcons name="tshirt-crew" size={16} color="#a78bfa" />;
    }
  };

  return (
    <View style={[styles.card, mission.completed && styles.cardCompleted]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.missionTitle, mission.completed && styles.missionTitleDone]}>
            {mission.title}
          </Text>
          <Text style={styles.missionSub}>
            {formatMetric(mission.current, mission.metric)} / {formatMetric(mission.target, mission.metric)}
          </Text>
        </View>
        <View style={styles.rewardContainer}>
          {renderRewardIcon()}
          <Text style={styles.reward}>{mission.reward_label}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%` },
            mission.completed && styles.progressFillDone,
          ]}
        />
      </View>

      <View style={styles.cardBottom}>
        {mission.completed
          ? <Text style={styles.completedLabel}>✅ Completada</Text>
          : <Text style={styles.pctLabel}>{pct}%</Text>
        }
      </View>
    </View>
  );
}

// ================================
// COMPONENTE PRINCIPAL
// ================================
export default function MissionsMenu({ topInset = 0, bottomInset = 0 }: Props) {
  const [open, setOpen]           = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [daily, setDaily]         = useState<MissionWithProgress[]>([]);
  const [weekly, setWeekly]       = useState<MissionWithProgress[]>([]);

  const slideAnim = useRef(new Animated.Value(-350)).current;
  const indicator = useRef(new Animated.Value(0)).current;

  // Cargar al abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMissionsWithProgress().then(({ daily: d, weekly: w }) => {
      setDaily(d);
      setWeekly(w);
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: open ? 0 : -350,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [open]);

  useEffect(() => {
    const backAction = () => { if (open) { setOpen(false); return true; } return false; };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, [open]);

  useEffect(() => {
    Animated.spring(indicator, {
      toValue: activeTab,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [activeTab]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50 && activeTab === 1) setActiveTab(0);
        else if (g.dx < -50 && activeTab === 0) setActiveTab(1);
      },
    })
  ).current;

  const translateIndicator = indicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 130],
  });

  const buttonTop = topInset + 10;
  const panelTop  = topInset + 70;
  const navHeight = 70 + bottomInset;
  const maxH      = Dimensions.get("window").height - panelTop - navHeight - 16;

  return (
    <>
      <TouchableOpacity style={[styles.button, { top: buttonTop }]} onPress={() => setOpen(!open)}>
        <Ionicons name="trophy" size={22} color="white" />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { bottom: navHeight }]}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />

          <Animated.View
            style={[styles.panel, { top: panelTop, maxHeight: maxH, transform: [{ translateX: slideAnim }] }]}
            {...panResponder.panHandlers}
          >
            <BlurView intensity={100} tint="dark" style={styles.blur}>
              {/* Tabs */}
              <View style={styles.tabs}>
                <TouchableOpacity onPress={() => setActiveTab(0)} style={styles.tab}>
                  <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>Diarias</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab(1)} style={styles.tab}>
                  <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>Semanales</Text>
                </TouchableOpacity>
                <Animated.View
                  style={[styles.tabIndicator, { transform: [{ translateX: translateIndicator }] }]}
                />
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#22d3ee" />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(activeTab === 0 ? daily : weekly).map((m) => (
                    <MissionCard key={m.key} mission={m} />
                  ))}
                  {(activeTab === 0 ? daily : weekly).length === 0 && (
                    <Text style={styles.empty}>No hay misiones disponibles</Text>
                  )}
                </ScrollView>
              )}
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
    left: 20,
    width: 300,
    borderRadius: 28,
    overflow: "hidden",
  },
  blur: { flex: 1, padding: 18 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 6,
    marginBottom: 16,
    position: "relative",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, zIndex: 2 },
  tabText: { fontSize: 15, fontWeight: "600", color: "#aaa" },
  activeTabText: { color: "#fff" },
  tabIndicator: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 120,
    height: 36,
    backgroundColor: "#22d3ee",
    borderRadius: 18,
    opacity: 0.2,
  },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  empty: { color: "#475569", textAlign: "center", paddingVertical: 30, fontSize: 14 },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 14,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.15)",
  },
  cardCompleted: {
    borderColor: "rgba(74,222,128,0.3)",
    backgroundColor: "rgba(74,222,128,0.05)",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  missionTitle: { color: "white", fontSize: 13, fontWeight: "600", marginBottom: 2 },
  missionTitleDone: { color: "#4ade80" },
  missionSub: { color: "#64748b", fontSize: 11 },
  rewardContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  reward: { color: "#facc15", fontSize: 11, fontWeight: "600" },
  progressBar: { height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: "#22d3ee", borderRadius: 4 },
  progressFillDone: { backgroundColor: "#4ade80" },
  cardBottom: { marginTop: 6, alignItems: "flex-end" },
  pctLabel: { color: "#64748b", fontSize: 11 },
  completedLabel: { color: "#4ade80", fontSize: 11, fontWeight: "600" },
});