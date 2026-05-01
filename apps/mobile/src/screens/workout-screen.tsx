import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ApiClientError } from "@elev9/api-client";
import { Button, Card, colors, Input, Screen, Text } from "@elev9/ui";

import { mobileApiClient } from "../api/client";
import type { RootStackParamList } from "../navigation/app-navigator";

type ExerciseLogState = {
  name: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  setsDone: string;
  repsDone: string;
};

type Difficulty = "easy" | "medium" | "hard";

export function WorkoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Workout">>();
  const { trainingPlanId, workout } = route.params;
  const [durationMinutes, setDurationMinutes] = useState(
    String(Math.max(20, workout.exercises.length * 12)),
  );
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogState[]>(() =>
    workout.exercises.map((exercise) => ({
      name: exercise.name,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      restSeconds: exercise.restSeconds,
      setsDone: String(exercise.sets),
      repsDone: String(parseReps(exercise.reps)),
    })),
  );
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const validation = useMemo(() => {
    const duration = parseInteger(durationMinutes);
    const durationError =
      duration === null || duration < 1 || duration > 300
        ? "Duration must be an integer between 1 and 300."
        : null;

    const notesError =
      notes.length > 500 ? "Notes must be at most 500 characters." : null;
    const feedbackError =
      notes.trim().length > 0 && !difficulty
        ? "Select a difficulty to include feedback notes."
        : null;

    const exerciseErrors = exerciseLogs.map((exercise) => {
      const setsDone = parseInteger(exercise.setsDone);
      const repsDone = parseInteger(exercise.repsDone);

      return {
        setsDone:
          setsDone === null || setsDone < 0
            ? "Sets done must be an integer greater than or equal to 0."
            : null,
        repsDone:
          repsDone === null || repsDone < 0
            ? "Reps done must be an integer greater than or equal to 0."
            : null,
      };
    });

    const firstExerciseError = exerciseErrors.find(
      (item) => item.setsDone || item.repsDone,
    );

    return {
      duration,
      durationError,
      notesError,
      feedbackError,
      exerciseErrors,
      isValid: !durationError && !notesError && !feedbackError && !firstExerciseError,
    };
  }, [difficulty, durationMinutes, exerciseLogs, notes]);

  const payload = useMemo(() => {
    if (!validation.isValid || validation.duration === null) {
      return null;
    }

    const feedback =
      difficulty
        ? {
            difficulty,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          }
        : undefined;

    return {
      trainingPlanId,
      workoutDayIndex: workout.dayIndex,
      durationMinutes: validation.duration,
      completedExercises: exerciseLogs.map((exercise) => ({
        name: exercise.name,
        setsDone: parseInteger(exercise.setsDone) ?? 0,
        repsDone: parseInteger(exercise.repsDone) ?? 0,
      })),
      feedback,
    };
  }, [difficulty, exerciseLogs, notes, trainingPlanId, validation, workout.dayIndex]);

  async function handleCompleteWorkout() {
    if (!payload) {
      setErrorMessage("Please fix the highlighted fields before submitting.");
      return;
    }

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

  function updateExerciseField(
    index: number,
    field: "setsDone" | "repsDone",
    value: string,
  ) {
    setExerciseLogs((current) =>
      current.map((exercise, currentIndex) =>
        currentIndex === index
          ? {
              ...exercise,
              [field]: sanitizeNumericInput(value),
            }
          : exercise,
      ),
    );
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
          <Text variant="title">Session</Text>
          <Input
            label="Duration in minutes"
            keyboardType="number-pad"
            value={durationMinutes}
            onChangeText={(value) => setDurationMinutes(sanitizeNumericInput(value))}
            errorMessage={validation.durationError}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="title">Exercises</Text>
          <View style={styles.exerciseList}>
            {exerciseLogs.map((exercise, index) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    Target: {exercise.targetSets} sets · {exercise.targetReps} reps
                  </Text>
                  <Text style={styles.exerciseRest}>
                    {exercise.restSeconds}s rest
                  </Text>
                </View>

                <View style={styles.exerciseInputs}>
                  <Input
                    label="Sets done"
                    keyboardType="number-pad"
                    value={exercise.setsDone}
                    onChangeText={(value) => updateExerciseField(index, "setsDone", value)}
                    errorMessage={validation.exerciseErrors[index]?.setsDone}
                    containerStyle={styles.halfField}
                  />
                  <Input
                    label="Reps done"
                    keyboardType="number-pad"
                    value={exercise.repsDone}
                    onChangeText={(value) => updateExerciseField(index, "repsDone", value)}
                    errorMessage={validation.exerciseErrors[index]?.repsDone}
                    containerStyle={styles.halfField}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="title">Workout Feedback</Text>
          <Text style={styles.fieldHelp}>Optional</Text>
          <View style={styles.difficultyGroup}>
            {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
              <Button
                key={option}
                label={capitalize(option)}
                variant={difficulty === option ? "primary" : "secondary"}
                onPress={() => setDifficulty((current) => (current === option ? null : option))}
                style={styles.difficultyButton}
              />
            ))}
          </View>
          <Input
            label="Notes"
            placeholder="How did the session feel?"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
            errorMessage={validation.notesError}
            inputStyle={styles.notesInput}
          />
          {validation.feedbackError ? (
            <Text style={styles.error}>{validation.feedbackError}</Text>
          ) : null}
        </Card>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button
          label="Complete Workout"
          loading={isSubmitting}
          disabled={!validation.isValid}
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

function parseInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

function sanitizeNumericInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  fieldHelp: {
    color: colors.mutedText,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseRow: {
    gap: 12,
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
  exerciseInputs: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  difficultyGroup: {
    flexDirection: "row",
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    minWidth: 0,
  },
  notesInput: {
    minHeight: 112,
    paddingTop: 16,
  },
  error: {
    color: "#fca5a5",
  },
  fullButton: {
    width: "100%",
  },
});
