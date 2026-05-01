import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ApiClientError } from "@elev9/api-client";
import type { WorkoutHistoryResponse } from "@elev9/types";
import { Button, Card, colors, Screen, Text } from "@elev9/ui";

import { mobileApiClient } from "../api/client";

type WorkoutHistoryItem = WorkoutHistoryResponse["workoutLogs"][number];

const INITIAL_LIMIT = 20;

export function WorkoutHistoryScreen() {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadWorkoutHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await mobileApiClient.progress.getWorkoutHistory(
        INITIAL_LIMIT,
      );
      setWorkoutLogs(response.workoutLogs);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load workout history.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    <Screen contentStyle={styles.content}>
      <Animated.View
        style={[
          styles.animatedBlock,
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
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Progress</Text>
          <Text variant="headline" style={styles.title}>
            Workout History
          </Text>
          <Text style={styles.subtitle}>
            Review your recent training sessions.
          </Text>
        </View>

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
              Complete your first session to start building your history.
            </Text>
          </Card>
        ) : (
          <FlatList
            data={workoutLogs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.itemDuration}>
                    {item.durationMinutes} min
                  </Text>
                </View>
                <Text style={styles.itemTitle}>
                  Workout Day {item.workoutDayIndex}
                </Text>
                <Text style={styles.itemMeta}>
                  Exercises: {item.completedExercises.length}
                </Text>
                {item.feedback?.difficulty ? (
                  <Text style={styles.itemMeta}>
                    Difficulty: {capitalize(item.feedback.difficulty)}
                  </Text>
                ) : null}
              </Card>
            )}
          />
        )}
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 0,
  },
  animatedBlock: {
    flex: 1,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.primary,
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
  fullButton: {
    width: "100%",
  },
  listContent: {
    gap: 14,
    paddingBottom: 32,
  },
  itemCard: {
    gap: 8,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  itemDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  itemDuration: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  itemMeta: {
    color: colors.mutedText,
  },
});
