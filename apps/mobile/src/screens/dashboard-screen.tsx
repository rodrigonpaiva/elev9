import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { DashboardHomeResponse } from "@elev9/types";
import { ApiClientError } from "@elev9/api-client";

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
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.error}>{errorMessage ?? "Dashboard unavailable."}</Text>
          <Button onPress={() => void loadDashboard()} title="Retry" />
          <Button onPress={() => void signOut()} title="Logout" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome, {dashboard.user.name}</Text>

        <Text style={styles.sectionTitle}>Fitness</Text>
        <Text>
          Goal: {dashboard.fitnessProfile?.goal ?? "Not created"}
        </Text>
        <Text>
          Activity: {dashboard.fitnessProfile?.activityLevel ?? "Not created"}
        </Text>

        <Text style={styles.sectionTitle}>Today</Text>
        {dashboard.trainingPlan?.todayWorkout ? (
          <View>
            <Text>{dashboard.trainingPlan.todayWorkout.title}</Text>
            <Text>{dashboard.trainingPlan.todayWorkout.focus}</Text>
            <Text>{dashboard.trainingPlan.todayWorkout.intensity}</Text>
            <Text>
              Exercises: {dashboard.trainingPlan.todayWorkout.exercises.length}
            </Text>
          </View>
        ) : (
          <Text>Rest day</Text>
        )}

        <Text style={styles.sectionTitle}>Weekly Summary</Text>
        <Text>Completed: {dashboard.progressSummary.workoutsCompleted}</Text>
        <Text>
          Total Minutes: {dashboard.progressSummary.totalDurationMinutes}
        </Text>
        <Text>
          Average Minutes: {dashboard.progressSummary.averageDurationMinutes}
        </Text>
        <Text>
          Last Workout: {dashboard.progressSummary.lastWorkoutDate ?? "None"}
        </Text>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button onPress={() => void loadDashboard()} title="Refresh" />
        <Button onPress={() => void signOut()} title="Logout" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  error: {
    color: "#c00",
  },
});
