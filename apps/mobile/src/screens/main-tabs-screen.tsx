import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@elev9/ui";
import { Badge, Text } from "@elev9/ui";

import { CurrentWorkoutScreen } from "./current-workout-screen";
import { DashboardScreen } from "./dashboard-screen";
import { ProfileScreen } from "./profile-screen";
import { ProgressSummaryScreen } from "./progress-summary-screen";
import { WorkoutHistoryScreen } from "./workout-history-screen";

type MainTabKey = "home" | "workout" | "history" | "progress" | "profile";

const TABS: Array<{ key: MainTabKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "workout", label: "Workout" },
  { key: "history", label: "History" },
  { key: "progress", label: "Progress" },
  { key: "profile", label: "Profile" },
];

export function MainTabsScreen() {
  const [activeTab, setActiveTab] = useState<MainTabKey>("home");

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.content}>{renderTab(activeTab, setActiveTab)}</View>
      <View style={styles.tabBarShell}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabItem, isActive ? styles.tabItemActive : null]}
              >
                {isActive ? <Badge label={tab.label} variant="primary" /> : null}
                <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function renderTab(
  activeTab: MainTabKey,
  setActiveTab: (tab: MainTabKey) => void,
) {
  switch (activeTab) {
    case "home":
      return <DashboardScreen onOpenHistory={() => setActiveTab("history")} />;
    case "workout":
      return <CurrentWorkoutScreen />;
    case "history":
      return <WorkoutHistoryScreen />;
    case "progress":
      return <ProgressSummaryScreen />;
    case "profile":
      return <ProfileScreen />;
    default:
      return <DashboardScreen onOpenHistory={() => setActiveTab("history")} />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBarShell: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: "#0b1220",
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: colors.text,
  },
});
