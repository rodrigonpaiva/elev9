import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ApiClientError } from "@elev9/api-client";
import type { ProgressSummaryResponse } from "@elev9/types";
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

type SummaryState = ProgressSummaryResponse["summary"] | null;
type Period = "week" | "month";

const PERIOD_OPTIONS: Period[] = ["week", "month"];

export function ProgressSummaryScreen() {
  const [summary, setSummary] = useState<SummaryState>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (
    nextPeriod: Period,
    options?: { refresh?: boolean },
  ) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const response = await apiClient.progress.getSummary(nextPeriod);
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
      void load(period);
    }, [load, period]),
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

  const handlePeriodChange = useCallback((nextPeriod: Period) => {
    if (nextPeriod === period) {
      return;
    }

    setPeriod(nextPeriod);
    void load(nextPeriod);
  }, [load, period]);

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(period, { refresh: true })}
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
          <Badge label="Progress" variant="primary" />
          <Text variant="headline" style={styles.title}>
            Progress Summary
          </Text>
          <Text style={styles.subtitle}>
            Track your volume, consistency and recent momentum over time.
          </Text>
        </Card>

        <Card style={styles.selectorCard}>
          <SectionHeader
            title="Period"
            subtitle="Switch the summary range and refetch your latest metrics."
          />
          <View style={styles.periodSelector}>
            {PERIOD_OPTIONS.map((option) => {
              const isActive = option === period;

              return (
                <Pressable
                  key={option}
                  onPress={() => handlePeriodChange(option)}
                  style={[
                    styles.periodChip,
                    isActive ? styles.periodChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodChipLabel,
                      isActive ? styles.periodChipLabelActive : null,
                    ]}
                  >
                    {capitalize(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading progress...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">Progress unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button label="Retry" onPress={() => void load(period)} style={styles.fullButton} />
          </Card>
        ) : summary ? (
          <>
            <Card style={styles.overviewCard}>
              <SectionHeader
                title={`This ${summary.period}`}
                subtitle="Your active reporting window."
              />
              <View style={styles.highlightRow}>
                <Badge label={capitalize(summary.period)} variant="primary" />
                <Text style={styles.highlightCopy}>
                  {summary.workoutsCompleted} workout
                  {summary.workoutsCompleted === 1 ? "" : "s"} logged
                </Text>
              </View>
            </Card>

            <View style={styles.metricsGrid}>
              <MetricCard
                label="Workouts completed"
                value={String(summary.workoutsCompleted)}
              />
              <MetricCard
                label="Total minutes"
                value={String(summary.totalDurationMinutes)}
              />
              <MetricCard
                label="Average duration"
                value={`${summary.averageDurationMinutes} min`}
              />
              <MetricCard
                label="Last workout"
                value={
                  summary.lastWorkoutDate
                    ? formatDate(summary.lastWorkoutDate)
                    : "No activity yet"
                }
              />
            </View>
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  selectorCard: {
    gap: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 10,
  },
  periodChip: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  periodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  periodChipLabel: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  periodChipLabelActive: {
    color: colors.primaryText,
  },
  loadingState: {
    minHeight: 260,
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
  overviewCard: {
    gap: 14,
    backgroundColor: colors.card,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highlightCopy: {
    color: colors.text,
    fontWeight: "600",
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    gap: 8,
    backgroundColor: colors.card,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  fullButton: {
    width: "100%",
  },
});
