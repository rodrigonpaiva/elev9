import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  RecoverySnapshot,
  NutritionReadModel,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient, mobileApiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type CompletionState = {
  coachDecision: CoachDecision | null;
  recoverySnapshot: RecoverySnapshot | null;
  nutrition: NutritionReadModel | null;
  workoutSaved: boolean;
};

type SummaryMetric = {
  label: string;
  value: string;
};

type NextStep = {
  label: string;
  description: string;
  onPress: () => void;
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
  successSurface: '#ecfdf5',
  successText: '#166534',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

export function WorkoutCompletionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutCompletion'>>();
  const { completedExercises, durationMinutes, trainingPlanId, workout } =
    route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [state, setState] = useState<CompletionState>({
    coachDecision: null,
    recoverySnapshot: null,
    nutrition: null,
    workoutSaved: false,
  });

  const handleBackToDashboard = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'home' });
  }, [navigation]);

  const handleViewSummary = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'history' });
  }, [navigation]);

  const handleReviewRecovery = useCallback(() => {
    navigation.navigate('DailyCheckInHistory');
  }, [navigation]);

  const handleViewNutrition = useCallback(() => {
    navigation.navigate('NutritionRecommendations');
  }, [navigation]);

  const handleViewProgress = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'progress' });
  }, [navigation]);

  const handleAskCoach = useCallback(() => {
    navigation.navigate('AskCoach');
  }, [navigation]);

  const loadCompletion = useCallback(async () => {
    if (!workout) {
      setHasLoadError(true);
      setIsLoading(false);
      return;
    }

    if (completedExercises.length === 0) {
      setHasLoadError(false);
      setIsLoading(false);
      return;
    }

    setHasLoadError(false);
    setIsLoading(true);

    const [logResult, coachResult, recoveryResult, nutritionResult] =
      await Promise.allSettled([
        mobileApiClient.progress.logWorkout({
          trainingPlanId,
          workoutDayIndex: workout.dayIndex,
          durationMinutes,
          completedExercises,
          feedback: {
            difficulty: getFeedbackDifficulty(workout.intensity),
          },
        }),
        apiClient.ai.getTodayCoachDecision(),
        apiClient.recovery.getTodayRecovery(),
        apiClient.nutrition.getTodayNutrition(),
      ]);

    const workoutSaved =
      logResult.status === 'fulfilled' ||
      (logResult.status === 'rejected' &&
        isAlreadyLoggedError(logResult.reason));

    setState({
      coachDecision:
        coachResult.status === 'fulfilled'
          ? coachResult.value.coachDecision
          : null,
      recoverySnapshot:
        recoveryResult.status === 'fulfilled'
          ? recoveryResult.value.recoverySnapshot
          : null,
      nutrition:
        nutritionResult.status === 'fulfilled'
          ? nutritionResult.value.todayNutrition
          : null,
      workoutSaved,
    });
    setIsLoading(false);
  }, [completedExercises, durationMinutes, trainingPlanId, workout]);

  useEffect(() => {
    void loadCompletion();
  }, [loadCompletion]);

  const model = useMemo(
    () =>
      buildCompletionModel({
        completedExercises,
        durationMinutes,
        nutrition: state.nutrition,
        recoverySnapshot: state.recoverySnapshot,
        workout,
        workoutSaved: state.workoutSaved,
      }),
    [
      completedExercises,
      durationMinutes,
      state.nutrition,
      state.recoverySnapshot,
      state.workoutSaved,
      workout,
    ],
  );

  const coachFeedback = useMemo(
    () =>
      getCoachFeedback({
        coachDecision: state.coachDecision,
        recoverySnapshot: state.recoverySnapshot,
        workout,
      }),
    [state.coachDecision, state.recoverySnapshot, workout],
  );

  const nextSteps = useMemo(
    () =>
      getNextSteps({
        nutrition: state.nutrition,
        onReviewRecovery: handleReviewRecovery,
        onViewNutrition: handleViewNutrition,
        onViewProgress: handleViewProgress,
        recoverySnapshot: state.recoverySnapshot,
      }),
    [
      handleReviewRecovery,
      handleViewNutrition,
      handleViewProgress,
      state.nutrition,
      state.recoverySnapshot,
    ],
  );

  if (isLoading) {
    return <WorkoutCompletionSkeleton />;
  }

  if (hasLoadError || !model) {
    if (completedExercises.length === 0) {
      return (
        <WorkoutCompletionStateView
          title="Workout completed."
          message="Your training summary will appear here."
          actionLabel="Return to Dashboard"
          onAction={handleBackToDashboard}
        />
      );
    }

    return (
      <WorkoutCompletionStateView
        title="Unable to load workout summary."
        actionLabel="Return to Dashboard"
        onAction={handleBackToDashboard}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          accessibilityLabel={model.accessibilityLabel}
          style={styles.stack}
        >
          <AchievementHero />
          <SummaryGrid metrics={model.metrics} />
          <Highlights highlights={model.highlights} />
          <CoachFeedback feedback={coachFeedback} />
          <NextSteps steps={nextSteps} />
          <View style={styles.actions}>
            <Button
              accessibilityLabel="Back to Dashboard"
              label="Back to Dashboard"
              onPress={handleBackToDashboard}
            />
            <Button
              accessibilityLabel="Ask Coach"
              label="Ask Coach"
              onPress={handleAskCoach}
              variant="ghost"
            />
            <Button
              accessibilityLabel="View workout history"
              label="View Workout History"
              onPress={handleViewSummary}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AchievementHero = memo(function AchievementHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.heroTitle}>Great work.</Text>
      <Text numberOfLines={2} style={styles.heroSubtitle}>
        You showed up today. Progress is built one session at a time.
      </Text>
    </View>
  );
});

const SummaryGrid = memo(function SummaryGrid({
  metrics,
}: {
  metrics: SummaryMetric[];
}) {
  return (
    <View style={styles.summaryGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricLabel}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
});

const Highlights = memo(function Highlights({
  highlights,
}: {
  highlights: string[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>PERFORMANCE HIGHLIGHTS</Text>
      <View style={styles.highlightList}>
        {highlights.map((highlight) => (
          <View key={highlight} style={styles.highlightRow}>
            <View style={styles.highlightDot} />
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const CoachFeedback = memo(function CoachFeedback({
  feedback,
}: {
  feedback: string;
}) {
  return (
    <View style={styles.coachCard}>
      <Text style={styles.label}>AI COACH FEEDBACK</Text>
      <Text numberOfLines={3} style={styles.coachText}>
        {feedback}
      </Text>
    </View>
  );
});

const NextSteps = memo(function NextSteps({ steps }: { steps: NextStep[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>NEXT STEPS</Text>
      <View style={styles.nextStepList}>
        {steps.map((step) => (
          <Pressable
            accessibilityLabel={`${step.label}. ${step.description}`}
            accessibilityRole="button"
            key={step.label}
            onPress={step.onPress}
            style={styles.nextStep}
          >
            <Text style={styles.nextStepTitle}>{step.label}</Text>
            <Text style={styles.nextStepDescription}>{step.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

function WorkoutCompletionSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          accessibilityLabel="Loading workout completion"
          style={styles.stack}
        >
          <View style={styles.hero}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonHeroTitle} />
            <View style={styles.skeletonHeroSubtitle} />
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.skeletonMetric} />
            <View style={styles.skeletonMetric} />
            <View style={styles.skeletonMetric} />
            <View style={styles.skeletonMetric} />
          </View>
          <View style={styles.card}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonShortLine} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutCompletionStateView({
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

function buildCompletionModel({
  completedExercises,
  durationMinutes,
  nutrition,
  recoverySnapshot,
  workout,
  workoutSaved,
}: {
  workout: RootStackParamList['WorkoutCompletion']['workout'];
  completedExercises: RootStackParamList['WorkoutCompletion']['completedExercises'];
  durationMinutes: number;
  recoverySnapshot: RecoverySnapshot | null;
  nutrition: NutritionReadModel | null;
  workoutSaved: boolean;
}) {
  if (!workout || completedExercises.length === 0) {
    return null;
  }

  const setsCompleted = completedExercises.reduce(
    (sum, exercise) => sum + exercise.setsDone,
    0,
  );
  const totalReps = completedExercises.reduce(
    (sum, exercise) => sum + exercise.repsDone,
    0,
  );
  const metrics: SummaryMetric[] = [
    { label: 'Duration', value: `${durationMinutes} min` },
    { label: 'Exercises', value: String(completedExercises.length) },
    { label: 'Sets Completed', value: String(setsCompleted) },
    { label: 'Total Reps', value: String(totalReps) },
  ];
  const highlights = getHighlights({
    nutrition,
    recoverySnapshot,
    setsCompleted,
    workout,
    workoutSaved,
  });

  return {
    metrics,
    highlights,
    accessibilityLabel: `Workout complete. ${durationMinutes} minutes. ${completedExercises.length} exercises completed. AI coach feedback available.`,
  };
}

function getHighlights({
  nutrition,
  recoverySnapshot,
  setsCompleted,
  workout,
  workoutSaved,
}: {
  workout: RootStackParamList['WorkoutCompletion']['workout'];
  setsCompleted: number;
  recoverySnapshot: RecoverySnapshot | null;
  nutrition: NutritionReadModel | null;
  workoutSaved: boolean;
}): string[] {
  const highlights = new Set<string>();

  if (workoutSaved) {
    highlights.add('Saved your completed training session.');
  }

  if (setsCompleted > 0) {
    highlights.add('Completed every planned exercise.');
  }

  if (recoverySnapshot?.recommendedIntensity === 'hard') {
    highlights.add('Recovery aligned well with effort.');
  } else if (recoverySnapshot?.recommendedIntensity === 'recovery') {
    highlights.add('Kept effort supportive for recovery.');
  }

  if (nutrition?.nextMeal) {
    highlights.add('Your next meal can support recovery.');
  }

  if (workout.intensity === 'high') {
    highlights.add('Handled a demanding training day.');
  }

  highlights.add('Maintained workout consistency.');

  return Array.from(highlights).slice(0, 4);
}

function getCoachFeedback({
  coachDecision,
  recoverySnapshot,
  workout,
}: {
  workout: RootStackParamList['WorkoutCompletion']['workout'];
  coachDecision: CoachDecision | null;
  recoverySnapshot: RecoverySnapshot | null;
}): string {
  if (coachDecision?.summary.trim()) {
    return coachDecision.summary.trim();
  }

  if (recoverySnapshot?.recommendedIntensity === 'recovery') {
    return 'You made today productive by respecting recovery and finishing the work with control.';
  }

  if (workout.intensity === 'high') {
    return 'You executed a strong session today. Hydrate, refuel, and let recovery do its work.';
  }

  return 'You executed this workout with strong consistency. Keep building momentum.';
}

function getNextSteps({
  nutrition,
  onReviewRecovery,
  onViewNutrition,
  onViewProgress,
  recoverySnapshot,
}: {
  recoverySnapshot: RecoverySnapshot | null;
  nutrition: NutritionReadModel | null;
  onReviewRecovery: () => void;
  onViewNutrition: () => void;
  onViewProgress: () => void;
}): NextStep[] {
  const steps: NextStep[] = [];

  if (nutrition?.nextMeal) {
    steps.push({
      label: nutrition.nextMeal.title,
      description: 'Your next meal supports recovery.',
      onPress: onViewNutrition,
    });
  } else {
    steps.push({
      label: 'Review nutrition',
      description: 'Protein and hydration remain important today.',
      onPress: onViewNutrition,
    });
  }

  if (recoverySnapshot?.recommendedIntensity === 'recovery') {
    steps.push({
      label: 'Prioritize sleep tonight',
      description: 'Recovery is the next training input.',
      onPress: onReviewRecovery,
    });
  } else {
    steps.push({
      label: 'Review recovery',
      description: 'Check how your body responds after training.',
      onPress: onReviewRecovery,
    });
  }

  steps.push({
    label: 'View progress',
    description: 'Keep your weekly momentum visible.',
    onPress: onViewProgress,
  });

  return steps;
}

function getFeedbackDifficulty(
  intensity: RootStackParamList['WorkoutCompletion']['workout']['intensity'],
): 'easy' | 'medium' | 'hard' {
  switch (intensity) {
    case 'high':
      return 'hard';
    case 'moderate':
      return 'medium';
    case 'low':
    default:
      return 'easy';
  }
}

function isAlreadyLoggedError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.code === 'ALREADY_EXISTS' ||
      error.message.includes('already exists'))
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
    paddingTop: 18,
    paddingBottom: 36,
  },
  stack: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
  successIcon: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 37,
    backgroundColor: tokens.successSurface,
  },
  successIconText: {
    color: tokens.successText,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  heroTitle: {
    color: tokens.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    maxWidth: 360,
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    minHeight: 88,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricValue: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  metricLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
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
  coachCard: {
    gap: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  highlightList: {
    gap: 11,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  highlightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.text,
  },
  highlightText: {
    flex: 1,
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  coachText: {
    color: tokens.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '800',
  },
  nextStepList: {
    gap: 10,
  },
  nextStep: {
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  nextStepTitle: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  nextStepDescription: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  skeletonIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonHeroTitle: {
    width: '58%',
    height: 40,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonHeroSubtitle: {
    width: '74%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMetric: {
    width: '48%',
    height: 88,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonLabel: {
    width: 142,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonLine: {
    width: '94%',
    height: 22,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonShortLine: {
    width: '60%',
    height: 22,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
});
