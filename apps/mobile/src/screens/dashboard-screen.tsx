import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ApiClientError } from "@elev9/api-client";
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from "@elev9/ui";
import type { DashboardHomeResponse, TodayWorkout } from "@elev9/types";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";
import type { RootStackParamList } from "../navigation/app-navigator";

type DashboardScreenProps = {
  onOpenHistory?: () => void;
  showLogout?: boolean;
};

export function DashboardScreen({
  onOpenHistory,
  showLogout = false,
}: DashboardScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();
  const [dashboard, setDashboard] =
    useState<DashboardHomeResponse["dashboard"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await apiClient.dashboard.getHome();
      setDashboard(response.dashboard);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_INVALID_SESSION"
      ) {
        await signOut();
        return;
      }

      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load dashboard.");
      }
    } finally {
      if (options?.refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  if (isLoading) {
    return (
      <Screen contentStyle={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </Screen>
    );
  }

  if (!dashboard) {
    return (
      <Screen contentStyle={styles.emptyScreen}>
        <Card style={styles.sectionCard}>
          <Text variant="title">Dashboard unavailable</Text>
          <Text style={styles.mutedText}>
            {errorMessage ?? "Unable to load your home dashboard."}
          </Text>
        </Card>
        <Button label="Retry" onPress={() => void loadDashboard()} style={styles.fullButton} />
        <Button
          label="Logout"
          onPress={() => void signOut()}
          variant="secondary"
          style={styles.fullButton}
        />
      </Screen>
    );
  }

  const trainingPlan = dashboard.trainingPlan;
  const todayWorkout = trainingPlan?.todayWorkout;

  return (
    <Screen
      contentStyle={styles.scrollContent}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDashboard({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View style={[styles.animatedSection, animatedStyle(entrance, 0)]}>
        <Card style={styles.heroCard}>
          <Badge variant="primary" label="Elev9 Home" />
          <Text variant="headline" style={styles.heroTitle}>
            Welcome, {dashboard.user.name}
          </Text>
          <Text style={styles.heroSubtitle}>
            Stay consistent with today&apos;s plan and your weekly momentum.
          </Text>
        </Card>
      </Animated.View>

      <Animated.View style={[styles.animatedSection, animatedStyle(entrance, 1)]}>
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Weekly Progress"
            subtitle="A quick view of your recent training output."
          />
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Weekly workouts</Text>
              <Text style={styles.metricHighlight}>
                {dashboard.progressSummary.workoutsCompleted}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total minutes</Text>
              <Text style={styles.metricHighlight}>
                {dashboard.progressSummary.totalDurationMinutes}
              </Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Last workout</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.progressSummary.lastWorkoutDate
                  ? formatDashboardDate(dashboard.progressSummary.lastWorkoutDate)
                  : "No activity yet"}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Fitness goal</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.fitnessProfile?.goal ?? "Not created yet"}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={[styles.animatedSection, animatedStyle(entrance, 2)]}>
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Today&apos;s Workout"
            subtitle={
              trainingPlan && todayWorkout
                ? "Ready when you are."
                : "No workout is scheduled for today."
            }
          />
          {trainingPlan && todayWorkout ? (
            <Pressable
              onPress={() =>
                navigation.navigate("Workout", {
                  trainingPlanId: trainingPlan.id,
                  workout: todayWorkout as TodayWorkout,
                })
              }
              style={styles.workoutPressable}
            >
              <View style={styles.workoutContent}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutTitle}>{todayWorkout.title}</Text>
                  <Badge label={todayWorkout.intensity} variant="muted" />
                </View>
                <Text style={styles.metricValue}>Focus: {todayWorkout.focus}</Text>
                <Text style={styles.metricValue}>Format: {todayWorkout.format}</Text>
                <Text style={styles.metricValue}>
                  Exercises: {todayWorkout.exercises.length}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.fallbackBox}>
              <Text style={styles.metricValue}>No training today</Text>
              <Text style={styles.fallbackText}>
                Your current plan does not include a session for today.
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View style={[styles.animatedSection, animatedStyle(entrance, 3)]}>
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Quick Actions"
            subtitle="Jump into the most useful parts of the app."
          />
          <View style={styles.actionsGroup}>
            <Button
              label="Start Workout"
              onPress={() =>
                trainingPlan && todayWorkout
                  ? navigation.navigate("Workout", {
                      trainingPlanId: trainingPlan.id,
                      workout: todayWorkout as TodayWorkout,
                    })
                  : undefined
              }
              disabled={!trainingPlan || !todayWorkout}
              style={styles.fullButton}
            />
            <Button
              label="View History"
              onPress={() => onOpenHistory?.()}
              variant="secondary"
              style={styles.fullButton}
            />
            <Button
              label="Refresh Dashboard"
              onPress={() => void loadDashboard({ refresh: true })}
              variant="secondary"
              style={styles.fullButton}
            />
          </View>
        </Card>
      </Animated.View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {showLogout ? (
        <Button
          label="Logout"
          onPress={() => void signOut()}
          variant="secondary"
          style={styles.fullButton}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  emptyScreen: {
    justifyContent: "center",
    gap: 16,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 32,
  },
  animatedSection: {
    width: "100%",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    gap: 10,
  },
  heroTitle: {
    color: colors.text,
  },
  heroSubtitle: {
    color: colors.mutedText,
  },
  sectionCard: {
    gap: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0b1220",
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedText,
  },
  metricValue: {
    color: colors.text,
  },
  metricHighlight: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  metricSecondary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  workoutTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
  },
  workoutPressable: {
    borderRadius: 18,
  },
  workoutContent: {
    gap: 8,
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fallbackBox: {
    gap: 6,
    borderRadius: 18,
    backgroundColor: "#0b1220",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackText: {
    color: colors.mutedText,
  },
  error: {
    color: "#fca5a5",
  },
  mutedText: {
    color: colors.mutedText,
  },
  actionsGroup: {
    gap: 12,
  },
  fullButton: {
    width: "100%",
  },
});

function animatedStyle(value: Animated.Value, index: number) {
  return {
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [18 + index * 6, 0],
        }),
      },
    ],
  };
}

function formatDashboardDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
