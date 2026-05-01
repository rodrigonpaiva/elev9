import { useMemo, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  View,
} from "react-native";
import { ApiClientError } from "@elev9/api-client";
import { Button, Card, colors, Screen, Text } from "@elev9/ui";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { mobileApiClient } from "../api/client";
import type { RootStackParamList } from "../navigation/app-navigator";

export function WorkoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Workout">>();
  const { trainingPlanId, workout } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const payload = useMemo(
    () => ({
      trainingPlanId,
      workoutDayIndex: workout.dayIndex,
      durationMinutes: Math.max(20, workout.exercises.length * 12),
      completedExercises: workout.exercises.map((exercise) => ({
        name: exercise.name,
        setsDone: exercise.sets,
        repsDone: parseReps(exercise.reps),
      })),
    }),
    [trainingPlanId, workout],
  );

  async function handleCompleteWorkout() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await mobileApiClient.progress.logWorkout(payload);
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to complete workout.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} scroll>
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
        <Card style={styles.heroCard}>
          <Text style={styles.eyebrow}>Workout</Text>
          <Text variant="headline" style={styles.title}>
            {workout.title}
          </Text>
          <Text style={styles.subtitle}>
            {workout.focus} · {workout.intensity} intensity
          </Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="title">Exercises</Text>
          <View style={styles.exerciseList}>
            {workout.exercises.map((exercise) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.sets} sets · {exercise.reps} reps
                  </Text>
                </View>
                <Text style={styles.exerciseRest}>
                  {exercise.restSeconds}s rest
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button
          label="Complete Workout"
          loading={isSubmitting}
          onPress={handleCompleteWorkout}
          style={styles.fullButton}
        />
      </Animated.View>
    </Screen>
  );
}

function parseReps(reps: string): number {
  const match = reps.match(/\d+/);
  return match ? Number(match[0]) : 10;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  animatedBlock: {
    gap: 18,
  },
  heroCard: {
    gap: 8,
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
  sectionCard: {
    gap: 14,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseRow: {
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0b1220",
    padding: 14,
  },
  exerciseCopy: {
    gap: 4,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseMeta: {
    color: colors.mutedText,
  },
  exerciseRest: {
    color: colors.mutedText,
    fontSize: 13,
  },
  error: {
    color: "#fca5a5",
  },
  fullButton: {
    width: "100%",
  },
});
