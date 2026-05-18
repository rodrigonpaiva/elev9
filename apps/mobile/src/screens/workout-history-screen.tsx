import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ApiClientError } from '@elev9/api-client';
import type { WorkoutHistoryResponse } from '@elev9/types';
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from '@elev9/ui';

import { mobileApiClient } from '../api/client';

type WorkoutHistoryItem = WorkoutHistoryResponse['workoutLogs'][number];

const INITIAL_LIMIT = 20;

export function WorkoutHistoryScreen() {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadWorkoutHistory = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const response =
          await mobileApiClient.progress.getWorkoutHistory(INITIAL_LIMIT);
        setWorkoutLogs(response.workoutLogs);
      } catch (error) {
        if (error instanceof ApiClientError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Unable to load workout history.');
        }
      } finally {
        if (options?.refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWorkoutHistory();
    }, [loadWorkoutHistory]),
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
            onRefresh={() => void loadWorkoutHistory({ refresh: true })}
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
          <Badge label="History" variant="primary" />
          <Text variant="headline" style={styles.title}>
            Workout History
          </Text>
          <Text style={styles.subtitle}>
            Review your recent sessions, duration and perceived effort.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading workout history...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">History unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              label="Retry"
              onPress={() => void loadWorkoutHistory()}
              style={styles.fullButton}
            />
          </Card>
        ) : workoutLogs.length === 0 ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">No workouts yet</Text>
            <Text style={styles.subtitle}>
              Finish your first session and it will appear here with duration,
              difficulty and exercise details.
            </Text>
          </Card>
        ) : (
          <View style={styles.listContent}>
            <SectionHeader
              title="Recent sessions"
              subtitle={`${workoutLogs.length} logged workout${workoutLogs.length > 1 ? 's' : ''}.`}
            />
            {workoutLogs.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                    <Text style={styles.itemDay}>
                      Workout Day {item.workoutDayIndex + 1}
                    </Text>
                  </View>
                  <Badge
                    label={`${item.durationMinutes} min`}
                    variant="primary"
                  />
                </View>

                <View style={styles.metricRow}>
                  <MetricPill
                    label="Difficulty"
                    value={
                      item.feedback?.difficulty
                        ? capitalize(item.feedback.difficulty)
                        : 'Not rated'
                    }
                  />
                  <MetricPill
                    label="Exercises"
                    value={String(item.completedExercises.length)}
                  />
                </View>

                {item.feedback?.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{item.feedback.notes}</Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
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
  loadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
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
  fullButton: {
    width: '100%',
  },
  listContent: {
    gap: 14,
  },
  itemCard: {
    gap: 14,
    backgroundColor: colors.card,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemTitleBlock: {
    flex: 1,
    gap: 4,
  },
  itemDate: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  itemDay: {
    color: colors.mutedText,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricPill: {
    flex: 1,
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  notesBox: {
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  notesLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notesText: {
    color: colors.text,
  },
});
