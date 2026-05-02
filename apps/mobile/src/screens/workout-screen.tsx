import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ApiClientError } from "@elev9/api-client";
import { Badge, Button, Card, colors, Input, Screen, Text } from "@elev9/ui";

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

const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
  const successPulse = useRef(new Animated.Value(0)).current;

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

  const summary = useMemo(() => {
    const totalSets = exerciseLogs.reduce(
      (sum, exercise) => sum + (parseInteger(exercise.setsDone) ?? 0),
      0,
    );
    const totalReps = exerciseLogs.reduce(
      (sum, exercise) => sum + (parseInteger(exercise.repsDone) ?? 0),
      0,
    );

    return {
      exerciseCount: exerciseLogs.length,
      totalSets,
      totalReps,
    };
  }, [exerciseLogs]);

  async function handleCompleteWorkout() {
    if (!payload) {
      setErrorMessage("Please fix the highlighted fields before submitting.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await mobileApiClient.progress.logWorkout(payload);
      setSuccessMessage("Workout completed 🎉");
      Animated.sequence([
        Animated.timing(successPulse, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(successPulse, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        navigation.goBack();
      }, 650);
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
    setSuccessMessage(null);
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

  function adjustDuration(delta: number) {
    const currentValue = parseInteger(durationMinutes) ?? 0;
    const nextValue = Math.min(300, Math.max(1, currentValue + delta));
    setSuccessMessage(null);
    setDurationMinutes(String(nextValue));
  }

  function adjustExerciseValue(
    index: number,
    field: "setsDone" | "repsDone",
    delta: number,
  ) {
    const currentValue = parseInteger(exerciseLogs[index]?.[field] ?? "0") ?? 0;
    const nextValue = Math.max(0, currentValue + delta);
    updateExerciseField(index, field, String(nextValue));
  }

  const successStyle = {
    opacity: successPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.94],
    }),
    transform: [
      {
        scale: successPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.02],
        }),
      },
    ],
  };

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
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text variant="headline" style={styles.title}>
                Today&apos;s Workout
              </Text>
              <Text style={styles.subtitle}>Workout Day {workout.dayIndex + 1}</Text>
            </View>
            <Badge label={capitalize(workout.intensity)} variant="primary" />
          </View>
          <Text variant="title" style={styles.workoutName}>
            {workout.title}
          </Text>
          <Text style={styles.heroMeta}>{workout.focus}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionTitle
            eyebrow="Session"
            title="Workout duration"
            subtitle="Adjust the total session time before you complete this workout."
          />
          <View style={styles.durationCard}>
            <Text style={styles.durationLabel}>Workout duration (minutes)</Text>
            <View style={styles.durationControls}>
              <StepperButton label="−10" onPress={() => adjustDuration(-10)} />
              <TextInput
                keyboardType="number-pad"
                value={durationMinutes}
                onChangeText={(value) => {
                  setSuccessMessage(null);
                  setDurationMinutes(sanitizeNumericInput(value));
                }}
                style={styles.durationInput}
                selectionColor={colors.primary}
              />
              <StepperButton label="+10" onPress={() => adjustDuration(10)} />
            </View>
            {validation.durationError ? (
              <Text style={styles.error}>{validation.durationError}</Text>
            ) : null}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionTitle
            eyebrow="Exercises"
            title="Log each movement"
            subtitle="Update the real sets and reps you completed for every exercise."
          />
          <View style={styles.exerciseList}>
            {exerciseLogs.map((exercise, index) => (
              <Card key={exercise.name} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      Planned: {exercise.targetSets} sets x {exercise.targetReps}
                    </Text>
                  </View>
                  <Badge label={`${exercise.restSeconds}s rest`} variant="muted" />
                </View>

                <View style={styles.exerciseControls}>
                  <StepperField
                    label="Sets done"
                    value={exercise.setsDone}
                    errorMessage={validation.exerciseErrors[index]?.setsDone}
                    onChangeText={(value) => updateExerciseField(index, "setsDone", value)}
                    onDecrement={() => adjustExerciseValue(index, "setsDone", -1)}
                    onIncrement={() => adjustExerciseValue(index, "setsDone", 1)}
                  />
                  <StepperField
                    label="Reps done"
                    value={exercise.repsDone}
                    errorMessage={validation.exerciseErrors[index]?.repsDone}
                    onChangeText={(value) => updateExerciseField(index, "repsDone", value)}
                    onDecrement={() => adjustExerciseValue(index, "repsDone", -1)}
                    onIncrement={() => adjustExerciseValue(index, "repsDone", 1)}
                  />
                </View>
              </Card>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionTitle
            eyebrow="Summary"
            title="How did it feel?"
            subtitle="Optional feedback helps capture the quality of the session."
          />
          <View style={styles.metricsRow}>
            <SummaryPill label="Exercises" value={String(summary.exerciseCount)} />
            <SummaryPill label="Sets" value={String(summary.totalSets)} />
            <SummaryPill label="Reps" value={String(summary.totalReps)} />
          </View>
          <View style={styles.difficultyGroup}>
            {DIFFICULTY_OPTIONS.map((option) => {
              const selected = difficulty === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSuccessMessage(null);
                    setDifficulty((current) => (current === option ? null : option));
                  }}
                  style={[
                    styles.difficultyChip,
                    selected ? styles.difficultyChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyChipLabel,
                      selected ? styles.difficultyChipLabelActive : null,
                    ]}
                  >
                    {capitalize(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="Notes"
            placeholder="Optional notes about energy, pain points or performance."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={notes}
            onChangeText={(value) => {
              setSuccessMessage(null);
              setNotes(value);
            }}
            errorMessage={validation.notesError}
            inputStyle={styles.notesInput}
          />
          {validation.feedbackError ? (
            <Text style={styles.error}>{validation.feedbackError}</Text>
          ) : null}
        </Card>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {successMessage ? (
          <Animated.View style={successStyle}>
            <Card style={styles.successCard}>
              <Text style={styles.successText}>{successMessage}</Text>
            </Card>
          </Animated.View>
        ) : null}

        <Card style={styles.completeCard}>
          <Text variant="title">Complete workout</Text>
          <Text style={styles.completeCopy}>
            Save your duration, exercise results and optional feedback.
          </Text>
          <Button
            label="Complete Workout"
            loading={isSubmitting}
            disabled={!validation.isValid || isSubmitting}
            onPress={handleCompleteWorkout}
            style={styles.fullButton}
          />
        </Card>
      </Animated.View>
    </Screen>
  );
}

function SectionTitle(input: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{input.eyebrow}</Text>
      <Text variant="title">{input.title}</Text>
      <Text style={styles.sectionSubtitle}>{input.subtitle}</Text>
    </View>
  );
}

function StepperField(input: {
  label: string;
  value: string;
  errorMessage?: string | null;
  onChangeText: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.stepperField}>
      <Text style={styles.stepperLabel}>{input.label}</Text>
      <View style={styles.stepperControl}>
        <StepperButton label="−" onPress={input.onDecrement} compact />
        <TextInput
          keyboardType="number-pad"
          value={input.value}
          onChangeText={(value) => input.onChangeText(sanitizeNumericInput(value))}
          style={styles.stepperInput}
          selectionColor={colors.primary}
        />
        <StepperButton label="+" onPress={input.onIncrement} compact />
      </View>
      {input.errorMessage ? <Text style={styles.error}>{input.errorMessage}</Text> : null}
    </View>
  );
}

function StepperButton(input: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={input.onPress}
      style={[
        styles.stepperButton,
        input.compact ? styles.stepperButtonCompact : null,
      ]}
    >
      <Text style={styles.stepperButtonLabel}>{input.label}</Text>
    </Pressable>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
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
    paddingBottom: 40,
  },
  animatedBlock: {
    gap: 18,
  },
  heroCard: {
    gap: 10,
    backgroundColor: colors.surface,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  workoutName: {
    color: colors.text,
  },
  heroMeta: {
    color: colors.mutedText,
  },
  sectionCard: {
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    color: colors.mutedText,
  },
  durationCard: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  durationLabel: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  durationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  durationInput: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    gap: 14,
    backgroundColor: colors.surface,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exerciseCopy: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  exerciseMeta: {
    color: colors.mutedText,
  },
  exerciseControls: {
    flexDirection: "row",
    gap: 12,
  },
  stepperField: {
    flex: 1,
    gap: 8,
  },
  stepperLabel: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  stepperControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  stepperButton: {
    minWidth: 72,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stepperButtonCompact: {
    minWidth: 48,
    minHeight: 52,
    borderRadius: 14,
  },
  stepperButtonLabel: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  difficultyGroup: {
    flexDirection: "row",
    gap: 10,
  },
  difficultyChip: {
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
  difficultyChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  difficultyChipLabel: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  difficultyChipLabelActive: {
    color: colors.primaryText,
  },
  notesInput: {
    minHeight: 112,
    paddingTop: 16,
  },
  successCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  successText: {
    color: colors.primaryText,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  completeCard: {
    gap: 12,
    backgroundColor: colors.surface,
    marginTop: 6,
  },
  completeCopy: {
    color: colors.mutedText,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  fullButton: {
    width: "100%",
  },
});
