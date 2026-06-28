import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  RecoverySnapshot,
  TodayWorkout,
  TrainingPlanResponse,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type TrainingPlan = TrainingPlanResponse['trainingPlan'];
type Exercise = TodayWorkout['exercises'][number];

type WorkoutOverviewState = {
  trainingPlanId: string | null;
  workout: TodayWorkout | null;
  coachDecision: CoachDecision | null;
  recoverySnapshot: RecoverySnapshot | null;
};

type WorkoutOverviewModel = {
  title: string;
  objective: string;
  coachNote: string;
  durationLabel: string;
  exerciseLabel: string;
  difficultyLabel: 'Easy' | 'Moderate' | 'Hard';
  difficultyVariant: 'primary' | 'muted' | 'danger';
  focusLabel: string;
  benefits: string[];
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
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

export function WorkoutOverviewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutOverview'>>();
  const initialWorkout = route.params.workout;
  const initialTrainingPlanId = route.params.trainingPlanId;
  const [state, setState] = useState<WorkoutOverviewState>({
    trainingPlanId: initialTrainingPlanId,
    workout: initialWorkout,
    coachDecision: null,
    recoverySnapshot: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    const [trainingResult, coachResult, recoveryResult] =
      await Promise.allSettled([
        apiClient.training.getCurrentPlan(),
        apiClient.ai.getTodayCoachDecision(),
        apiClient.recovery.getTodayRecovery(),
      ]);

    if (trainingResult.status === 'fulfilled') {
      const trainingPlan = trainingResult.value.trainingPlan;
      setState({
        trainingPlanId: trainingPlan.id,
        workout: resolveTodaysWorkout(trainingPlan),
        coachDecision:
          coachResult.status === 'fulfilled'
            ? coachResult.value.coachDecision
            : null,
        recoverySnapshot:
          recoveryResult.status === 'fulfilled'
            ? recoveryResult.value.recoverySnapshot
            : null,
      });
    } else if (isEmptyTrainingError(trainingResult.reason)) {
      setState({
        trainingPlanId: null,
        workout: null,
        coachDecision: null,
        recoverySnapshot: null,
      });
    } else {
      setErrorMessage('Workout unavailable.');
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const model = useMemo(() => {
    if (!state.workout) {
      return null;
    }

    return buildWorkoutOverviewModel({
      coachDecision: state.coachDecision,
      recoverySnapshot: state.recoverySnapshot,
      workout: state.workout,
    });
  }, [state.coachDecision, state.recoverySnapshot, state.workout]);

  const handleStartWorkout = useCallback(() => {
    if (!state.trainingPlanId || !state.workout) {
      return;
    }

    navigation.replace('ActiveWorkout', {
      trainingPlanId: state.trainingPlanId,
      workout: state.workout,
    });
  }, [navigation, state.trainingPlanId, state.workout]);

  const handleMaybeLater = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleExercisePress = useCallback(
    (exercise: Exercise) => {
      if (!state.workout) {
        return;
      }

      navigation.navigate('ExerciseDetail', {
        exercise,
        workoutContext: {
          title: state.workout.title,
          focus: state.workout.focus,
          format: state.workout.format,
          intensity: state.workout.intensity,
        },
      });
    },
    [navigation, state.workout],
  );

  if (isLoading) {
    return <WorkoutOverviewSkeleton />;
  }

  if (errorMessage) {
    return (
      <WorkoutOverviewStateView
        title="Workout unavailable."
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  }

  if (!model || !state.workout) {
    return (
      <WorkoutOverviewStateView
        title="No workout scheduled today."
        message="Your next session will appear here."
        actionLabel="Back to Dashboard"
        onAction={handleMaybeLater}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
      >
        <View
          accessibilityLabel={model.accessibilityLabel}
          style={styles.stack}
        >
          <WorkoutHero model={model} />
          <CoachNote note={model.coachNote} />
          <WorkoutSummary model={model} />
          <ExerciseList
            workout={state.workout}
            onExercisePress={handleExercisePress}
          />
          <WorkoutBenefits benefits={model.benefits} />
          <View style={styles.actions}>
            <Button
              accessibilityLabel={`Start workout. ${model.title}`}
              label="Start Workout"
              onPress={handleStartWorkout}
            />
            <Button
              accessibilityLabel="Maybe later"
              label="Maybe Later"
              onPress={handleMaybeLater}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const WorkoutHero = memo(function WorkoutHero({
  model,
}: {
  model: WorkoutOverviewModel;
}) {
  return (
    <View style={styles.hero}>
      <Badge
        label={model.difficultyLabel}
        variant={model.difficultyVariant}
        style={styles.heroBadge}
      />
      <Text style={styles.heroTitle}>{model.title}</Text>
      <Text numberOfLines={2} style={styles.heroObjective}>
        {model.objective}
      </Text>
    </View>
  );
});

const CoachNote = memo(function CoachNote({ note }: { note: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>TODAY&apos;S COACH NOTE</Text>
      <Text style={styles.coachNote}>{note}</Text>
    </View>
  );
});

const WorkoutSummary = memo(function WorkoutSummary({
  model,
}: {
  model: WorkoutOverviewModel;
}) {
  return (
    <View style={styles.summaryGrid}>
      <SummaryTile label="Duration" value={model.durationLabel} />
      <SummaryTile label="Exercises" value={model.exerciseLabel} />
      <SummaryTile label="Difficulty" value={model.difficultyLabel} />
      <SummaryTile label="Training Focus" value={model.focusLabel} />
    </View>
  );
});

const SummaryTile = memo(function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
});

const ExerciseList = memo(function ExerciseList({
  onExercisePress,
  workout,
}: {
  workout: TodayWorkout;
  onExercisePress: (exercise: Exercise) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>EXERCISES</Text>
      <View style={styles.exerciseList}>
        {workout.exercises.map((exercise) => (
          <Pressable
            key={exercise.name}
            accessibilityLabel={`View details for ${exercise.name}`}
            accessibilityRole="button"
            onPress={() => onExercisePress(exercise)}
            style={styles.exerciseRow}
          >
            <View style={styles.exerciseCopy}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'} •{' '}
                {exercise.reps} reps
                {exercise.restSeconds > 0
                  ? ` • ${formatRest(exercise.restSeconds)} rest`
                  : ''}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const WorkoutBenefits = memo(function WorkoutBenefits({
  benefits,
}: {
  benefits: string[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>WORKOUT BENEFITS</Text>
      <Text style={styles.benefitIntro}>
        Today&apos;s workout helps improve:
      </Text>
      <View style={styles.benefitList}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.benefitDot} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

function WorkoutOverviewSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          accessibilityLabel="Loading workout overview"
          style={styles.stack}
        >
          <View style={styles.hero}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonObjective} />
          </View>
          <View style={styles.card}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonCoachLine} />
            <View style={styles.skeletonCoachShort} />
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.skeletonSummaryTile} />
            <View style={styles.skeletonSummaryTile} />
            <View style={styles.skeletonSummaryTile} />
            <View style={styles.skeletonSummaryTile} />
          </View>
          <View style={styles.card}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonExercise} />
            <View style={styles.skeletonExercise} />
            <View style={styles.skeletonExercise} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutOverviewStateView({
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
      <View
        accessibilityLabel={`${title} ${message ?? ''}`}
        style={styles.state}
      >
        <Text style={styles.stateTitle}>{title}</Text>
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.stateButton}
        />
      </View>
    </SafeAreaView>
  );
}

function buildWorkoutOverviewModel({
  coachDecision,
  recoverySnapshot,
  workout,
}: {
  workout: TodayWorkout;
  coachDecision: CoachDecision | null;
  recoverySnapshot: RecoverySnapshot | null;
}): WorkoutOverviewModel {
  const exerciseCount = workout.exercises.length;
  const durationMinutes = getEstimatedDurationMinutes(exerciseCount);
  const difficulty = getDifficulty(workout.intensity);
  const focusLabel = getFocusLabel(workout);

  return {
    title: workout.title,
    objective: getObjective(workout),
    coachNote: getCoachNote({ coachDecision, recoverySnapshot, workout }),
    durationLabel: `${durationMinutes} min`,
    exerciseLabel: `${exerciseCount} ${
      exerciseCount === 1 ? 'exercise' : 'exercises'
    }`,
    difficultyLabel: difficulty.label,
    difficultyVariant: difficulty.variant,
    focusLabel,
    benefits: getBenefits(workout),
    accessibilityLabel: `Today's workout. ${workout.title}. Duration ${durationMinutes} minutes. ${exerciseCount} ${
      exerciseCount === 1 ? 'exercise' : 'exercises'
    }.`,
  };
}

function resolveTodaysWorkout(trainingPlan: TrainingPlan): TodayWorkout | null {
  const todayIndex = getUtcDayIndex(new Date());
  const matchingDay = trainingPlan.weeklySchedule.find(
    (day) => day.dayIndex === todayIndex,
  );

  if (!matchingDay) {
    return null;
  }

  return {
    dayIndex: matchingDay.dayIndex,
    title: matchingDay.title,
    focus: matchingDay.focus,
    format: matchingDay.format,
    intensity: matchingDay.intensity,
    exercises: matchingDay.exercises,
  };
}

function getUtcDayIndex(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function getEstimatedDurationMinutes(exerciseCount: number): number {
  return Math.max(20, exerciseCount * 12);
}

function getDifficulty(intensity: TodayWorkout['intensity']): {
  label: WorkoutOverviewModel['difficultyLabel'];
  variant: WorkoutOverviewModel['difficultyVariant'];
} {
  switch (intensity) {
    case 'high':
      return { label: 'Hard', variant: 'danger' };
    case 'moderate':
      return { label: 'Moderate', variant: 'muted' };
    case 'low':
    default:
      return { label: 'Easy', variant: 'primary' };
  }
}

function getObjective(workout: TodayWorkout): string {
  const descriptor = `${workout.focus} ${workout.format}`.toLowerCase();

  if (descriptor.includes('conditioning') || descriptor.includes('hiit')) {
    return 'Improve conditioning while managing fatigue.';
  }

  if (descriptor.includes('recovery') || descriptor.includes('mobility')) {
    return 'Support recovery with quality movement.';
  }

  if (descriptor.includes('lower') || descriptor.includes('leg')) {
    return 'Build lower body strength and movement quality.';
  }

  if (descriptor.includes('upper')) {
    return 'Build upper body strength and movement quality.';
  }

  return workout.focus.trim().length > 0
    ? workout.focus
    : 'Build strength, control, and consistency.';
}

function getCoachNote({
  coachDecision,
  recoverySnapshot,
  workout,
}: {
  coachDecision: CoachDecision | null;
  recoverySnapshot: RecoverySnapshot | null;
  workout: TodayWorkout;
}): string {
  if (recoverySnapshot && recoverySnapshot.readinessScore >= 80) {
    return 'You recovered well. Push your working sets today.';
  }

  if (recoverySnapshot && recoverySnapshot.readinessScore < 60) {
    return 'Focus on movement quality rather than intensity.';
  }

  if (coachDecision?.summary.trim()) {
    return coachDecision.summary.trim();
  }

  if (workout.intensity === 'high') {
    return 'Keep rest periods controlled and move with intent.';
  }

  return 'Focus on clean reps and steady effort today.';
}

function getFocusLabel(workout: TodayWorkout): string {
  const source = workout.focus || workout.format || workout.title;
  const firstWord = source.trim().split(/\s+/)[0];

  return firstWord ? toTitleCase(firstWord) : 'Training';
}

function getBenefits(workout: TodayWorkout): string[] {
  const descriptor = `${workout.title} ${workout.focus} ${workout.format}`
    .toLowerCase()
    .trim();
  const benefits = new Set<string>();

  if (descriptor.includes('strength') || descriptor.includes('upper')) {
    benefits.add('Strength');
  }

  if (
    descriptor.includes('conditioning') ||
    descriptor.includes('hiit') ||
    workout.intensity === 'high'
  ) {
    benefits.add('Endurance');
  }

  if (
    descriptor.includes('recovery') ||
    descriptor.includes('mobility') ||
    workout.intensity === 'low'
  ) {
    benefits.add('Movement Quality');
  }

  benefits.add('Consistency');

  return Array.from(benefits).slice(0, 3);
}

function formatRest(restSeconds: number): string {
  if (restSeconds < 60) {
    return `${restSeconds}s`;
  }

  const minutes = Math.floor(restSeconds / 60);
  const seconds = restSeconds % 60;

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function toTitleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function isEmptyTrainingError(error: unknown): boolean {
  return (
    error instanceof ApiClientError && error.code === 'TRAINING_PLAN_NOT_FOUND'
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  stack: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 24,
  },
  hero: {
    gap: 12,
    paddingTop: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
  },
  heroTitle: {
    color: tokens.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },
  heroObjective: {
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  card: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  coachNote: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryTile: {
    width: '48%',
    minHeight: 82,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  summaryValue: {
    color: tokens.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },
  exerciseList: {
    gap: 2,
  },
  exerciseRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.softBorder,
  },
  exerciseCopy: {
    gap: 5,
  },
  exerciseName: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  exerciseMeta: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  benefitIntro: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
  benefitList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.text,
  },
  benefitText: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
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
  skeletonBadge: {
    width: 96,
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonTitle: {
    width: '82%',
    height: 38,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonObjective: {
    width: '72%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonLabel: {
    width: 132,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonCoachLine: {
    width: '92%',
    height: 22,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonCoachShort: {
    width: '58%',
    height: 22,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonSummaryTile: {
    width: '48%',
    height: 82,
    borderRadius: 20,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonExercise: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: tokens.skeletonSoft,
  },
});
