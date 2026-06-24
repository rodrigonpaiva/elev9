import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { TodayWorkout } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import type { RootStackParamList } from '../navigation/app-navigator';

type Exercise = TodayWorkout['exercises'][number];
type WorkoutPhase = 'exercise' | 'paused' | 'complete';

type ExerciseProgress = {
  completedSets: boolean[];
};

type CompletedExercise =
  RootStackParamList['WorkoutCompletion']['completedExercises'][number];

type ActiveWorkoutModel = {
  exercise: Exercise;
  exerciseIndex: number;
  exerciseCount: number;
  completedSets: boolean[];
  completedSetCount: number;
  currentSetNumber: number;
  completionPercentage: number;
  guidance: string;
  accessibilityLabel: string;
};

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#eef2f7',
  surface: '#f8fafc',
  progressTrack: '#eef2f7',
  progressFill: '#111827',
  successSurface: '#ecfdf5',
  successBorder: '#bbf7d0',
  successText: '#166534',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

export function ActiveWorkoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ActiveWorkout'>>();
  const { trainingPlanId } = route.params;
  const [workout, setWorkout] = useState(route.params.workout);
  const [startedAt, setStartedAt] = useState(
    () => route.params.startedAt ?? Date.now(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [replacementBanner, setReplacementBanner] = useState<string | null>(
    route.params.replacementBanner ?? null,
  );
  const [progress, setProgress] = useState<ExerciseProgress[]>(() =>
    route.params.initialProgress ??
    route.params.workout.exercises.map((exercise) => ({
      completedSets: Array.from({ length: exercise.sets }, () => false),
    })),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 220);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!route.params.replacementToken) {
      return;
    }

    setWorkout(route.params.workout);
    setProgress(
      route.params.initialProgress ??
        route.params.workout.exercises.map((exercise) => ({
          completedSets: Array.from({ length: exercise.sets }, () => false),
        })),
    );
    setStartedAt(route.params.startedAt ?? startedAt);
    setReplacementBanner(route.params.replacementBanner ?? null);
    setPhase('exercise');
  }, [
    route.params.initialProgress,
    route.params.replacementBanner,
    route.params.replacementToken,
    route.params.startedAt,
    route.params.workout,
    startedAt,
  ]);

  const model = useMemo(
    () =>
      buildActiveWorkoutModel({
        exerciseIndex,
        progress,
        workout,
      }),
    [exerciseIndex, progress, workout],
  );

  const handleCompleteSet = useCallback(() => {
    if (!model) {
      return;
    }

    const nextCompletedSetCount = model.completedSetCount + 1;
    const isExerciseComplete = nextCompletedSetCount >= model.exercise.sets;
    const isWorkoutComplete =
      isExerciseComplete && exerciseIndex >= workout.exercises.length - 1;
    const nextExerciseIndex =
      isExerciseComplete && !isWorkoutComplete ? exerciseIndex + 1 : exerciseIndex;
    const nextExercise = workout.exercises[nextExerciseIndex] ?? model.exercise;
    const nextSetNumber = isExerciseComplete ? 1 : nextCompletedSetCount + 1;
    const nextProgress = progress.map((item, index) => {
      if (index !== exerciseIndex) {
        return item;
      }

      const nextIncompleteSetIndex = item.completedSets.findIndex(
        (isComplete) => !isComplete,
      );

      if (nextIncompleteSetIndex < 0) {
        return item;
      }

      return {
        completedSets: item.completedSets.map((isComplete, setIndex) =>
          setIndex === nextIncompleteSetIndex ? true : isComplete,
        ),
      };
    });

    if (isWorkoutComplete) {
      navigation.replace('WorkoutCompletion', {
        trainingPlanId,
        workout,
        durationMinutes: getElapsedWorkoutMinutes(startedAt),
        completedExercises: buildCompletedExercises(workout, nextProgress),
      });
      return;
    } else {
      setProgress(nextProgress);
      setExerciseIndex(nextExerciseIndex);
      setPhase('exercise');
    }

    navigation.navigate('RestTimer', {
      exerciseName: model.exercise.name,
      isWorkoutComplete,
      nextExerciseName: nextExercise.name,
      nextSetNumber,
      reps: nextExercise.reps,
      restSeconds: model.exercise.restSeconds,
      totalSets: nextExercise.sets,
    });
  }, [
    exerciseIndex,
    model,
    navigation,
    progress,
    startedAt,
    trainingPlanId,
    workout,
  ]);

  const handlePreviousExercise = useCallback(() => {
    setExerciseIndex((current) => Math.max(0, current - 1));
    setPhase('exercise');
  }, []);

  const handleNextExercise = useCallback(() => {
    if (!model) {
      return;
    }

    if (exerciseIndex >= workout.exercises.length - 1) {
      setPhase('complete');
      return;
    }

    setExerciseIndex((current) =>
      Math.min(workout.exercises.length - 1, current + 1),
    );
    setPhase('exercise');
  }, [exerciseIndex, model, workout.exercises.length]);

  const handlePause = useCallback(() => {
    setPhase('paused');
  }, []);

  const handleExercisePress = useCallback(() => {
    if (!model) {
      return;
    }

    navigation.navigate('ExerciseDetail', {
      exercise: model.exercise,
      workoutContext: {
        title: workout.title,
        focus: workout.focus,
        format: workout.format,
        intensity: workout.intensity,
      },
      replacementContext: {
        trainingPlanId,
        workout,
        exerciseIndex,
        progress,
        startedAt,
      },
    });
  }, [
    exerciseIndex,
    model,
    navigation,
    progress,
    startedAt,
    trainingPlanId,
    workout,
  ]);

  const handleReplaceExercise = useCallback(() => {
    navigation.navigate('ExerciseReplacement', {
      trainingPlanId,
      workout,
      exerciseIndex,
      progress,
      startedAt,
    });
  }, [exerciseIndex, navigation, progress, startedAt, trainingPlanId, workout]);

  const handleResume = useCallback(() => {
    setPhase('exercise');
  }, []);

  const handleFinishWorkout = useCallback(() => {
    navigation.replace('WorkoutCompletion', {
      trainingPlanId,
      workout,
      durationMinutes: getElapsedWorkoutMinutes(startedAt),
      completedExercises: buildCompletedExercises(workout, progress),
    });
  }, [navigation, progress, startedAt, trainingPlanId, workout]);

  const handleRetry = useCallback(() => {
    setExerciseIndex(0);
    setPhase('exercise');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 220);
  }, []);

  if (isLoading) {
    return <ActiveWorkoutSkeleton />;
  }

  if (!model) {
    return (
      <ActiveWorkoutStateView
        title="Workout data unavailable."
        actionLabel="Retry"
        onAction={handleRetry}
      />
    );
  }

  if (phase === 'paused') {
    return (
      <ActiveWorkoutStateView
        title="Workout paused."
        message="Take a moment. Your progress is still here."
        actionLabel="Resume Workout"
        onAction={handleResume}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <ActiveWorkoutStateView
        title="Workout complete."
        message="Review and save your session."
        actionLabel="Finish Workout"
        onAction={handleFinishWorkout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View accessibilityLabel={model.accessibilityLabel} style={styles.stack}>
          <WorkoutHeader
            exerciseCount={model.exerciseCount}
            exerciseIndex={model.exerciseIndex}
            title={workout.title}
          />
          <ProgressArea completionPercentage={model.completionPercentage} />
          <CurrentExerciseHero model={model} onPress={handleExercisePress} />
          {replacementBanner ? (
            <View
              accessibilityLabel={replacementBanner}
              style={styles.replacementBanner}
            >
              <Text style={styles.replacementBannerText}>
                {replacementBanner}
              </Text>
            </View>
          ) : null}
          <Prescription exercise={model.exercise} />
          <CoachGuidance guidance={model.guidance} />
          <Button
            accessibilityLabel={`Replace ${model.exercise.name}`}
            label="Replace Exercise"
            onPress={handleReplaceExercise}
            variant="ghost"
          />
          <SetTracker
            completedSets={model.completedSets}
            currentSetNumber={model.currentSetNumber}
          />

          <Button
            accessibilityLabel={`Complete set ${model.currentSetNumber}`}
            disabled={model.completedSetCount >= model.exercise.sets}
            label="Complete Set"
            onPress={handleCompleteSet}
          />

          <View style={styles.navigationRow}>
            <Button
              accessibilityLabel="Previous exercise"
              disabled={exerciseIndex === 0}
              label="Previous Exercise"
              onPress={handlePreviousExercise}
              variant="ghost"
              style={styles.navigationButton}
            />
            <Button
              accessibilityLabel="Next exercise"
              disabled={
                exerciseIndex >= workout.exercises.length - 1 ||
                model.completedSetCount < model.exercise.sets
              }
              label="Next Exercise"
              onPress={handleNextExercise}
              variant="ghost"
              style={styles.navigationButton}
            />
          </View>

          <Pressable
            accessibilityLabel="Pause workout"
            accessibilityRole="button"
            hitSlop={10}
            onPress={handlePause}
            style={styles.pauseButton}
          >
            <Text style={styles.pauseText}>Pause Workout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const WorkoutHeader = memo(function WorkoutHeader({
  exerciseCount,
  exerciseIndex,
  title,
}: {
  title: string;
  exerciseIndex: number;
  exerciseCount: number;
}) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.workoutTitle}>
        {title}
      </Text>
      <Text style={styles.exerciseCounter}>
        Exercise {exerciseIndex + 1} of {exerciseCount}
      </Text>
    </View>
  );
});

const ProgressArea = memo(function ProgressArea({
  completionPercentage,
}: {
  completionPercentage: number;
}) {
  return (
    <View style={styles.progressArea}>
      <View style={styles.progressCopy}>
        <Text style={styles.progressLabel}>Workout Completion</Text>
        <Text style={styles.progressValue}>{completionPercentage}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(2, completionPercentage)}%` },
          ]}
        />
      </View>
    </View>
  );
});

const CurrentExerciseHero = memo(function CurrentExerciseHero({
  model,
  onPress,
}: {
  model: ActiveWorkoutModel;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`View details for ${model.exercise.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.exerciseHero}
    >
      <Badge label={`Set ${model.currentSetNumber}`} variant="muted" />
      <Text style={styles.exerciseName}>{model.exercise.name}</Text>
    </Pressable>
  );
});

const Prescription = memo(function Prescription({
  exercise,
}: {
  exercise: Exercise;
}) {
  return (
    <View style={styles.prescriptionRow}>
      <PrescriptionCard label="Sets" value={String(exercise.sets)} />
      <PrescriptionCard label="Reps" value={exercise.reps} />
      <PrescriptionCard label="Rest" value={formatRest(exercise.restSeconds)} />
    </View>
  );
});

const PrescriptionCard = memo(function PrescriptionCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.prescriptionCard}>
      <Text style={styles.prescriptionValue}>{value}</Text>
      <Text style={styles.prescriptionLabel}>{label}</Text>
    </View>
  );
});

const CoachGuidance = memo(function CoachGuidance({
  guidance,
}: {
  guidance: string;
}) {
  return (
    <View style={styles.guidanceCard}>
      <Text style={styles.guidanceLabel}>COACH GUIDANCE</Text>
      <Text style={styles.guidanceText}>{guidance}</Text>
    </View>
  );
});

const SetTracker = memo(function SetTracker({
  completedSets,
  currentSetNumber,
}: {
  completedSets: boolean[];
  currentSetNumber: number;
}) {
  return (
    <View style={styles.setTracker}>
      {completedSets.map((isComplete, index) => {
        const isCurrent = index + 1 === currentSetNumber;

        return (
          <View
            key={`set-${index + 1}`}
            style={[
              styles.setPill,
              isComplete ? styles.setPillComplete : null,
              isCurrent && !isComplete ? styles.setPillCurrent : null,
            ]}
          >
            <Text
              style={[
                styles.setText,
                isComplete ? styles.setTextComplete : null,
              ]}
            >
              Set {index + 1}
              {isComplete ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

function ActiveWorkoutSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="Loading active workout" style={styles.stack}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonHero} />
        <View style={styles.prescriptionRow}>
          <View style={styles.skeletonPrescription} />
          <View style={styles.skeletonPrescription} />
          <View style={styles.skeletonPrescription} />
        </View>
        <View style={styles.skeletonGuidance} />
      </View>
    </SafeAreaView>
  );
}

function ActiveWorkoutStateView({
  actionLabel,
  message,
  onAction,
  title,
}: {
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={`${title} ${message ?? ''}`} style={styles.state}>
        <Text style={styles.stateTitle}>{title}</Text>
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
        <Button label={actionLabel} onPress={onAction} style={styles.stateButton} />
      </View>
    </SafeAreaView>
  );
}

function buildActiveWorkoutModel({
  exerciseIndex,
  progress,
  workout,
}: {
  workout: TodayWorkout;
  exerciseIndex: number;
  progress: ExerciseProgress[];
}): ActiveWorkoutModel | null {
  const exercise = workout.exercises[exerciseIndex];

  if (!exercise) {
    return null;
  }

  const currentProgress = progress[exerciseIndex];
  const completedSets =
    currentProgress?.completedSets ??
    Array.from({ length: exercise.sets }, () => false);
  const completedSetCount = completedSets.filter(Boolean).length;
  const totalSets = progress.reduce(
    (sum, item) => sum + item.completedSets.length,
    0,
  );
  const totalCompletedSets = progress.reduce(
    (sum, item) =>
      sum + item.completedSets.filter((isComplete) => isComplete).length,
    0,
  );
  const currentSetNumber = Math.min(
    exercise.sets,
    completedSetCount + 1,
  );
  const completionPercentage =
    totalSets > 0 ? Math.round((totalCompletedSets / totalSets) * 100) : 0;
  const reps = exercise.reps;

  return {
    exercise,
    exerciseCount: workout.exercises.length,
    exerciseIndex,
    completedSets,
    completedSetCount,
    currentSetNumber,
    completionPercentage,
    guidance: getCoachGuidance(exercise, workout),
    accessibilityLabel: `${exercise.name}. Set ${currentSetNumber} of ${exercise.sets}. ${reps} repetitions.`,
  };
}

function buildCompletedExercises(
  workout: TodayWorkout,
  progress: ExerciseProgress[],
): CompletedExercise[] {
  return workout.exercises.map((exercise, index) => {
    const setsDone =
      progress[index]?.completedSets.filter((isComplete) => isComplete).length ??
      0;

    return {
      name: exercise.name,
      setsDone,
      repsDone: setsDone * parseTargetReps(exercise.reps),
    };
  });
}

function getElapsedWorkoutMinutes(startedAt: number): number {
  return Math.min(
    300,
    Math.max(1, Math.ceil((Date.now() - startedAt) / 60000)),
  );
}

function getCoachGuidance(exercise: Exercise, workout: TodayWorkout): string {
  const descriptor = `${exercise.name} ${workout.focus} ${workout.format}`
    .toLowerCase()
    .trim();

  if (descriptor.includes('squat') || descriptor.includes('deadlift')) {
    return 'Brace your core and move through a controlled range.';
  }

  if (descriptor.includes('press') || descriptor.includes('bench')) {
    return 'Control the lowering phase and finish each rep with intent.';
  }

  if (descriptor.includes('pull') || descriptor.includes('row')) {
    return 'Lead with your back and keep your shoulders controlled.';
  }

  if (descriptor.includes('lunge') || descriptor.includes('split')) {
    return 'Stay tall and keep each rep balanced.';
  }

  if (workout.intensity === 'high') {
    return 'Keep your rest focused and maintain steady effort.';
  }

  if (workout.intensity === 'low') {
    return 'Focus on full range of motion and smooth breathing.';
  }

  return 'Focus on clean reps and consistent tempo.';
}

function parseTargetReps(value: string): number {
  const match = value.match(/\d+/);

  return match ? Number(match[0]) : 0;
}

function formatRest(restSeconds: number): string {
  if (restSeconds < 60) {
    return `${restSeconds} sec`;
  }

  const minutes = Math.floor(restSeconds / 60);
  const seconds = restSeconds % 60;

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 34,
  },
  stack: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 24,
  },
  header: {
    gap: 5,
    paddingTop: 6,
  },
  workoutTitle: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  exerciseCounter: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  progressArea: {
    gap: 10,
  },
  progressCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  progressLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressValue: {
    color: tokens.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: tokens.progressTrack,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tokens.progressFill,
  },
  exerciseHero: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  exerciseName: {
    color: tokens.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  prescriptionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prescriptionCard: {
    flex: 1,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  prescriptionValue: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  prescriptionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  guidanceCard: {
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  guidanceLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  guidanceText: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  replacementBanner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.successBorder,
    backgroundColor: tokens.successSurface,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  replacementBannerText: {
    color: tokens.successText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  setTracker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  setPill: {
    minHeight: 48,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 18,
  },
  setPillCurrent: {
    borderColor: tokens.text,
    backgroundColor: tokens.surface,
  },
  setPillComplete: {
    borderColor: tokens.successBorder,
    backgroundColor: tokens.successSurface,
  },
  setText: {
    color: tokens.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  setTextComplete: {
    color: tokens.successText,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navigationButton: {
    flex: 1,
    minWidth: 0,
  },
  pauseButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pauseText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: tokens.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 6,
  },
  skeletonHeader: {
    width: '52%',
    height: 20,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonHero: {
    height: 220,
    borderRadius: 32,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonPrescription: {
    flex: 1,
    height: 86,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonGuidance: {
    height: 92,
    borderRadius: 24,
    backgroundColor: tokens.skeletonSoft,
  },
});
