import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { ApiClientError } from "@elev9/api-client";
import { Button, Card, Screen, Text } from "@elev9/ui";
import type { DashboardHomeResponse } from "@elev9/types";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";

export function DashboardScreen() {
  const { signOut } = useAuth();
  console.log("DashboardScreen rendered");
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
      <Screen contentClassName="items-center justify-center gap-4 bg-panel">
        <ActivityIndicator color="#0f766e" />
        <Text className="text-slate">Loading dashboard...</Text>
      </Screen>
    );
  }

  if (!dashboard) {
    return (
      <Screen contentClassName="justify-center gap-5 bg-panel">
        <Card className="gap-4">
          <Text variant="title">Dashboard unavailable</Text>
          <Text className="text-slate">
            {errorMessage ?? "Unable to load your home dashboard."}
          </Text>
        </Card>
        <Button label="Retry" onPress={() => void loadDashboard()} />
        <Button
          label="Logout"
          onPress={() => void signOut()}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-5 bg-panel" scroll>
      <Card className="gap-2 border-0 bg-ink">
        <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-accent">
          Elev9 Home
        </Text>
        <Text variant="headline" className="text-white">
          {dashboard.user.name}
        </Text>
        <Text className="text-slate-200">
          Your home dashboard for training and progress.
        </Text>
      </Card>

      <Card className="gap-3">
        <Text variant="title">Fitness Profile</Text>
        <Text className="text-slate">
          Goal: {dashboard.fitnessProfile?.goal ?? "Not created yet"}
        </Text>
        <Text className="text-slate">
          Activity: {dashboard.fitnessProfile?.activityLevel ?? "Not created yet"}
        </Text>
      </Card>

      <Card className="gap-3">
        <Text variant="title">Today&apos;s Workout</Text>
        {dashboard.trainingPlan?.todayWorkout ? (
          <View style={{ gap: 8 }}>
            <Text className="text-lg font-semibold">
              {dashboard.trainingPlan.todayWorkout.title}
            </Text>
            <Text className="text-slate">
              Focus: {dashboard.trainingPlan.todayWorkout.focus}
            </Text>
            <Text className="text-slate">
              Format: {dashboard.trainingPlan.todayWorkout.format}
            </Text>
            <Text className="text-slate">
              Intensity: {dashboard.trainingPlan.todayWorkout.intensity}
            </Text>
            <Text className="text-slate">
              Exercises: {dashboard.trainingPlan.todayWorkout.exercises.length}
            </Text>
          </View>
        ) : (
          <Text className="text-slate">No training today</Text>
        )}
      </Card>

      <Card className="gap-3">
        <Text variant="title">Weekly Summary</Text>
        <Text className="text-slate">
          Completed: {dashboard.progressSummary.workoutsCompleted}
        </Text>
        <Text className="text-slate">
          Total Minutes: {dashboard.progressSummary.totalDurationMinutes}
        </Text>
        <Text className="text-slate">
          Average Minutes: {dashboard.progressSummary.averageDurationMinutes}
        </Text>
        <Text className="text-slate">
          Last Workout: {dashboard.progressSummary.lastWorkoutDate ?? "No activity yet"}
        </Text>
      </Card>

      {errorMessage ? <Text className="text-danger">{errorMessage}</Text> : null}

      <Button label="Refresh" onPress={() => void loadDashboard()} />
      <Button
        label="Logout"
        onPress={() => void signOut()}
        variant="secondary"
      />
    </Screen>
  );
}
