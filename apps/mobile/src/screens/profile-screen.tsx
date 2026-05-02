import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ApiClientError } from "@elev9/api-client";
import type { DashboardHomeResponse } from "@elev9/types";
import type {
  FitnessProfileActivityLevel,
  FitnessProfileGoal,
} from "@elev9/types";
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from "@elev9/ui";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";

export function ProfileScreen() {
  const { signOut, status } = useAuth();
  const [dashboard, setDashboard] =
    useState<DashboardHomeResponse["dashboard"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (options?: { refresh?: boolean }) => {
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
        setErrorMessage("Unable to load your profile.");
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
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  const trainingPlanStatus = resolveTrainingPlanStatus(dashboard);

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View
        style={[
          styles.stack,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={styles.heroCard}>
          <Badge variant="primary" label="Profile" />
          <Text variant="headline" style={styles.title}>
            {dashboard?.user.name ?? "Elev9 User"}
          </Text>
          <Text style={styles.subtitle}>
            Your account snapshot, training setup and secure session controls.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">Profile unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button label="Retry" onPress={() => void load()} style={styles.fullButton} />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <SectionHeader
                title="Account"
                subtitle="Basic identity tied to your current session."
              />
              <InfoRow label="Name" value={dashboard?.user.name ?? "Not available"} />
              <InfoRow
                label="Session"
                value={status === "authenticated" ? "Authenticated" : "Inactive"}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Fitness Profile"
                subtitle="Your current goal and activity rhythm."
              />
              <InfoRow
                label="Fitness goal"
                value={formatGoal(dashboard?.fitnessProfile?.goal)}
              />
              <InfoRow
                label="Activity level"
                value={formatActivityLevel(dashboard?.fitnessProfile?.activityLevel)}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Training Plan"
                subtitle="Current plan availability and workout readiness."
              />
              <InfoRow label="Plan status" value={trainingPlanStatus.status} />
              <InfoRow label="Today workout" value={trainingPlanStatus.todayWorkout} />
              <InfoRow
                label="Weekly progress"
                value={`${dashboard?.progressSummary.workoutsCompleted ?? 0} workouts`}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Session Control"
                subtitle="Refresh your profile or securely leave this device."
              />
              <View style={styles.actions}>
                <Button
                  label="Refresh Profile"
                  onPress={() => void load({ refresh: true })}
                  variant="secondary"
                  style={styles.fullButton}
                />
                <Button
                  label="Logout"
                  onPress={() => void handleSignOut()}
                  loading={isSigningOut}
                  variant="danger"
                  style={styles.fullButton}
                />
              </View>
            </Card>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatGoal(goal?: FitnessProfileGoal) {
  switch (goal) {
    case "gain_muscle":
      return "Gain muscle";
    case "lose_weight":
      return "Lose weight";
    case "maintain":
      return "Maintain";
    default:
      return "Not set";
  }
}

function formatActivityLevel(activityLevel?: FitnessProfileActivityLevel) {
  switch (activityLevel) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Not set";
  }
}

function resolveTrainingPlanStatus(
  dashboard: DashboardHomeResponse["dashboard"] | null,
) {
  if (!dashboard?.trainingPlan) {
    return {
      status: "No plan created",
      todayWorkout: "Unavailable",
    };
  }

  if (!dashboard.trainingPlan.todayWorkout) {
    return {
      status: "Plan active",
      todayWorkout: "No workout for today",
    };
  }

  return {
    status: "Plan active",
    todayWorkout: dashboard.trainingPlan.todayWorkout.title,
  };
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  stack: {
    gap: 18,
  },
  heroCard: {
    gap: 10,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  loadingState: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  feedbackCard: {
    gap: 14,
  },
  errorText: {
    color: colors.danger,
  },
  card: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  label: {
    flex: 1,
    color: colors.mutedText,
    fontWeight: "600",
  },
  value: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
  actions: {
    gap: 12,
  },
  fullButton: {
    width: "100%",
  },
});
