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
import { Button, Card, colors, Screen, SectionHeader, Text } from "@elev9/ui";

import { apiClient } from "../api/client";

type SummaryState = {
  period: "week" | "month";
  workoutsCompleted: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  lastWorkoutDate: string | null;
} | null;

export function ProgressSummaryScreen() {
  const [summary, setSummary] = useState<SummaryState>(null);
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
      const response = await apiClient.progress.getSummary("week");
      setSummary(response.summary);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load progress summary.");
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
          <Text variant="headline" style={styles.title}>
            Progress
          </Text>
          <Text style={styles.subtitle}>
            A weekly snapshot of your consistency and training time.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading progress...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">Progress unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button label="Retry" onPress={() => void load()} style={styles.fullButton} />
          </Card>
        ) : summary ? (
          <>
            <Card style={styles.card}>
              <SectionHeader
                title="This week"
                subtitle="Your latest progress summary."
              />
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Workouts</Text>
                  <Text style={styles.metricValue}>{summary.workoutsCompleted}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total minutes</Text>
                  <Text style={styles.metricValue}>{summary.totalDurationMinutes}</Text>
                </View>
              </View>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Average duration</Text>
                  <Text style={styles.metricSecondary}>
                    {summary.averageDurationMinutes} min
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Last workout</Text>
                  <Text style={styles.metricSecondary}>
                    {summary.lastWorkoutDate
                      ? formatDate(summary.lastWorkoutDate)
                      : "No activity yet"}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  metricSecondary: {
    color: colors.text,
    fontWeight: "600",
  },
  fullButton: {
    width: "100%",
  },
});
