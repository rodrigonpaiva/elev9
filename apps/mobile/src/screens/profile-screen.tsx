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
  const { signOut } = useAuth();
  const [dashboard, setDashboard] =
    useState<DashboardHomeResponse["dashboard"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  }, []);

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
        <View style={styles.hero}>
          <Badge variant="primary" label="Profile" />
          <Text variant="headline" style={styles.title}>
            {dashboard?.user.name ?? "Elev9 User"}
          </Text>
          <Text style={styles.subtitle}>
            Your current training identity and session access.
          </Text>
        </View>

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
                title="Training Identity"
                subtitle="Your active goal and workout rhythm."
              />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Goal</Text>
                <Text style={styles.value}>
                  {dashboard?.fitnessProfile?.goal ?? "Not set"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Activity</Text>
                <Text style={styles.value}>
                  {dashboard?.fitnessProfile?.activityLevel ?? "Not set"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Last workout</Text>
                <Text style={styles.value}>
                  {dashboard?.progressSummary.lastWorkoutDate ?? "No activity yet"}
                </Text>
              </View>
            </Card>

            <Button
              label="Refresh Profile"
              onPress={() => void load({ refresh: true })}
              variant="secondary"
              style={styles.fullButton}
            />
            <Button
              label="Logout"
              onPress={() => void signOut()}
              variant="secondary"
              style={styles.fullButton}
            />
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  stack: {
    gap: 18,
  },
  hero: {
    gap: 8,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  loadingState: {
    flex: 1,
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
    color: "#fca5a5",
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
    backgroundColor: "#0b1220",
    padding: 14,
  },
  label: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  value: {
    color: colors.text,
    fontWeight: "700",
  },
  fullButton: {
    width: "100%",
  },
});
