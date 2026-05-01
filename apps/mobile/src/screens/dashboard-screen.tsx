import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ApiClientError } from "@elev9/api-client";
import { Button, Card, Screen, Text } from "@elev9/ui";
import type { DashboardHomeResponse } from "@elev9/types";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";

export function DashboardScreen() {
  const { signOut } = useAuth();
  const [dashboard, setDashboard] =
    useState<DashboardHomeResponse["dashboard"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <Screen contentStyle={styles.loadingScreen}>
        <ActivityIndicator color="#0f766e" />
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

  return (
    <Screen contentStyle={styles.scrollContent} scroll>
      <Card style={styles.heroCard}>
        <Text style={styles.eyebrow}>
          Elev9 Home
        </Text>
        <Text variant="headline" style={styles.heroTitle}>
          Welcome, {dashboard.user.name}
        </Text>
        <Text style={styles.heroSubtitle}>
          Your home dashboard for training and progress.
        </Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text variant="title">Fitness Profile</Text>
        <Text style={styles.metricLabel}>Primary goal</Text>
        <Text style={styles.metricValue}>
          Goal: {dashboard.fitnessProfile?.goal ?? "Not created yet"}
        </Text>
        <Text style={styles.metricLabel}>Activity level</Text>
        <Text style={styles.metricValue}>
          Activity: {dashboard.fitnessProfile?.activityLevel ?? "Not created yet"}
        </Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text variant="title">Today&apos;s Workout</Text>
        {dashboard.trainingPlan?.todayWorkout ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.workoutTitle}>
              {dashboard.trainingPlan.todayWorkout.title}
            </Text>
            <Text style={styles.metricValue}>
              Focus: {dashboard.trainingPlan.todayWorkout.focus}
            </Text>
            <Text style={styles.metricValue}>
              Format: {dashboard.trainingPlan.todayWorkout.format}
            </Text>
            <Text style={styles.metricValue}>
              Intensity: {dashboard.trainingPlan.todayWorkout.intensity}
            </Text>
            <Text style={styles.metricValue}>
              Exercises: {dashboard.trainingPlan.todayWorkout.exercises.length}
            </Text>
          </View>
        ) : (
          <View style={styles.fallbackBox}>
            <Text style={styles.metricValue}>No training today</Text>
            <Text style={styles.fallbackText}>
              Your current plan does not include a session for today.
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <Text variant="title">Weekly Summary</Text>
        <Text style={styles.metricValue}>
          Completed: {dashboard.progressSummary.workoutsCompleted}
        </Text>
        <Text style={styles.metricValue}>
          Total Minutes: {dashboard.progressSummary.totalDurationMinutes}
        </Text>
        <Text style={styles.metricValue}>
          Average Minutes: {dashboard.progressSummary.averageDurationMinutes}
        </Text>
        <Text style={styles.metricValue}>
          Last Workout: {dashboard.progressSummary.lastWorkoutDate ?? "No activity yet"}
        </Text>
      </Card>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Button label="Refresh" onPress={() => void loadDashboard()} style={styles.fullButton} />
      <Button
        label="Logout"
        onPress={() => void signOut()}
        variant="secondary"
        style={styles.fullButton}
      />
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
    color: "#475569",
  },
  emptyScreen: {
    justifyContent: "center",
    gap: 16,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#f59e0b",
  },
  heroTitle: {
    color: "#ffffff",
  },
  heroSubtitle: {
    color: "#cbd5e1",
  },
  sectionCard: {
    gap: 10,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
  },
  metricValue: {
    color: "#334155",
  },
  workoutTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  fallbackBox: {
    gap: 6,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  fallbackText: {
    color: "#64748b",
  },
  error: {
    color: "#dc2626",
  },
  mutedText: {
    color: "#475569",
  },
  fullButton: {
    width: "100%",
  },
});
