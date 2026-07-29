import { memo, useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  NutritionPlan,
  NutritionRecommendation,
  ProgressSummaryResponse,
  RecoverySnapshot,
  NutritionReadModel,
  TodayWorkout,
  TrainingPlanResponse,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type TrainingPlan = TrainingPlanResponse['trainingPlan'];
type ProgressSummary = ProgressSummaryResponse['summary'];

type RecommendationsState = {
  recommendations: NutritionRecommendation[];
  todayNutrition: NutritionReadModel | null;
  nutritionPlan: NutritionPlan | null;
  recoverySnapshot: RecoverySnapshot | null;
  trainingPlan: TrainingPlan | null;
  progressSummary: ProgressSummary | null;
  coachDecision: CoachDecision | null;
};

type Signal = {
  label: string;
  value: string;
};

type RecommendedAction = {
  label: string;
  description: string;
  onPress: () => void;
};

type RecommendationsModel = {
  heroTitle: string;
  heroMessage: string;
  priorityTitle: string;
  priorityExplanation: string;
  benefit: string;
  signals: Signal[];
  notes: string[];
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
  skeletonSoft: '#f7f9fc',
} as const;

export function NutritionRecommendationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<RecommendationsState>({
    coachDecision: null,
    nutritionPlan: null,
    progressSummary: null,
    recommendations: [],
    recoverySnapshot: null,
    todayNutrition: null,
    trainingPlan: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
      trackNutritionRecommendationsEvent('nutrition_recommendation_refreshed');
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    const [
      recommendationsResult,
      todayResult,
      planResult,
      recoveryResult,
      trainingResult,
      progressResult,
      coachResult,
    ] = await Promise.allSettled([
      apiClient.nutrition.getNutritionRecommendations({ limit: 5 }),
      apiClient.nutrition.getTodayNutrition(),
      apiClient.nutrition.getCurrentNutritionPlan(),
      apiClient.recovery.getTodayRecovery(),
      apiClient.training.getCurrentPlan(),
      apiClient.progress.getSummary('week'),
      apiClient.ai.getTodayCoachDecision(),
    ]);

    if (
      recommendationsResult.status === 'rejected' &&
      !isEmptyStateError(recommendationsResult.reason)
    ) {
      setErrorMessage(
        getRecommendationsErrorMessage(recommendationsResult.reason),
      );
    }

    setState({
      recommendations:
        recommendationsResult.status === 'fulfilled'
          ? recommendationsResult.value.recommendations
          : [],
      todayNutrition:
        todayResult.status === 'fulfilled'
          ? todayResult.value.todayNutrition
          : null,
      nutritionPlan:
        planResult.status === 'fulfilled'
          ? planResult.value.nutritionPlan
          : null,
      recoverySnapshot:
        recoveryResult.status === 'fulfilled'
          ? recoveryResult.value.recoverySnapshot
          : null,
      trainingPlan:
        trainingResult.status === 'fulfilled'
          ? trainingResult.value.trainingPlan
          : null,
      progressSummary:
        progressResult.status === 'fulfilled'
          ? progressResult.value.summary
          : null,
      coachDecision:
        coachResult.status === 'fulfilled'
          ? coachResult.value.coachDecision
          : null,
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      trackNutritionRecommendationsEvent('nutrition_recommendations_opened');
      void load();
    }, [load]),
  );

  const model = useMemo(() => buildRecommendationsModel(state), [state]);

  const handleTodaysMeals = useCallback(() => {
    trackNutritionRecommendationsEvent(
      'nutrition_recommendation_action_selected',
      {
        action: 'todays_meals',
      },
    );
    navigation.navigate('TodaysMeals');
  }, [navigation]);

  const handleNutritionPlan = useCallback(() => {
    trackNutritionRecommendationsEvent(
      'nutrition_recommendation_action_selected',
      {
        action: 'nutrition_plan',
      },
    );
    navigation.navigate('NutritionPlan');
  }, [navigation]);

  const handleHistory = useCallback(() => {
    trackNutritionRecommendationsEvent(
      'nutrition_recommendation_action_selected',
      {
        action: 'history',
      },
    );
    navigation.navigate('NutritionHistory');
  }, [navigation]);

  const handleCoach = useCallback(() => {
    trackNutritionRecommendationsEvent(
      'nutrition_recommendation_action_selected',
      {
        action: 'coach',
      },
    );
    navigation.navigate('AskCoach');
  }, [navigation]);

  const actions = useMemo(
    () =>
      buildRecommendedActions({
        onCoach: handleCoach,
        onHistory: handleHistory,
        onNutritionPlan: handleNutritionPlan,
        onTodaysMeals: handleTodaysMeals,
        todayNutrition: state.todayNutrition,
      }),
    [
      handleCoach,
      handleHistory,
      handleNutritionPlan,
      handleTodaysMeals,
      state.todayNutrition,
    ],
  );

  if (isLoading) {
    return <RecommendationsSkeleton />;
  }

  if (errorMessage) {
    return (
      <RecommendationsStateView
        title="Unable to load nutrition recommendations."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (
    state.recommendations.length === 0 &&
    !state.todayNutrition &&
    !state.coachDecision
  ) {
    return (
      <RecommendationsStateView
        title="No recommendations yet."
        message="Log meals and complete check-ins to unlock personalized nutrition guidance."
        actionLabel="View Today's Meals"
        onAction={handleTodaysMeals}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
      >
        <RecommendationHero model={model} />
        <PriorityRecommendation model={model} />
        <ContextSignals signals={model.signals} />
        <RecommendedActions actions={actions} />
        <CoachNotes notes={model.notes} />
        <QuickActions
          onCoach={handleCoach}
          onHistory={handleHistory}
          onNutritionPlan={handleNutritionPlan}
          onTodaysMeals={handleTodaysMeals}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const RecommendationHero = memo(function RecommendationHero({
  model,
}: {
  model: RecommendationsModel;
}) {
  return (
    <View
      accessibilityLabel={`Nutrition recommendation. ${model.heroTitle}. ${model.heroMessage}`}
      style={styles.hero}
    >
      <Text style={styles.heroTitle}>{model.heroTitle}</Text>
      <Text style={styles.heroMessage}>{model.heroMessage}</Text>
    </View>
  );
});

const PriorityRecommendation = memo(function PriorityRecommendation({
  model,
}: {
  model: RecommendationsModel;
}) {
  return (
    <View
      accessibilityLabel={`Priority recommendation. ${model.priorityTitle}. Benefit: ${model.benefit}.`}
      style={styles.card}
    >
      <Text style={styles.sectionLabel}>PRIORITY RECOMMENDATION</Text>
      <Text style={styles.priorityTitle}>{model.priorityTitle}</Text>
      <Text style={styles.bodyText}>{model.priorityExplanation}</Text>
      <View style={styles.benefitBox}>
        <Text style={styles.benefitText}>Benefit: {model.benefit}</Text>
      </View>
    </View>
  );
});

const ContextSignals = memo(function ContextSignals({
  signals,
}: {
  signals: Signal[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>CONTEXT SIGNALS</Text>
      <View style={styles.signalGrid}>
        {signals.map((signal) => (
          <View key={signal.label} style={styles.signalCard}>
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <Text style={styles.signalValue}>{signal.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const RecommendedActions = memo(function RecommendedActions({
  actions,
}: {
  actions: RecommendedAction[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>RECOMMENDED ACTIONS</Text>
      <View style={styles.actionCards}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={`${action.label}. ${action.description}`}
            accessibilityRole="button"
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.actionTitle}>{action.label}</Text>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const CoachNotes = memo(function CoachNotes({ notes }: { notes: string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>NUTRITION COACH NOTES</Text>
      <View style={styles.notesList}>
        {notes.map((note) => (
          <View key={note} style={styles.noteRow}>
            <View style={styles.noteDot} />
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const QuickActions = memo(function QuickActions({
  onCoach,
  onHistory,
  onNutritionPlan,
  onTodaysMeals,
}: {
  onTodaysMeals: () => void;
  onNutritionPlan: () => void;
  onHistory: () => void;
  onCoach: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={styles.actions}>
        <Button label="Today's Meals" onPress={onTodaysMeals} variant="ghost" />
        <Button
          label="Nutrition Plan"
          onPress={onNutritionPlan}
          variant="ghost"
        />
        <Button label="History" onPress={onHistory} variant="ghost" />
        <Button label="Coach" onPress={onCoach} variant="ghost" />
      </View>
    </View>
  );
});

function RecommendationsSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading nutrition recommendations"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonCard} />
        <View style={styles.signalGrid}>
          <View style={styles.skeletonSignal} />
          <View style={styles.skeletonSignal} />
          <View style={styles.skeletonSignal} />
        </View>
        <View style={styles.skeletonCardSmall} />
      </View>
    </SafeAreaView>
  );
}

function RecommendationsStateView({
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
          style={styles.fullButton}
        />
      </View>
    </SafeAreaView>
  );
}

function buildRecommendationsModel(
  state: RecommendationsState,
): RecommendationsModel {
  const recommendation = state.recommendations[0] ?? null;
  const primaryMessage = recommendation?.message.trim();
  const firstAction = recommendation?.recommendations.find(
    (item) => item.trim().length > 0,
  );
  const mealsRemaining = getMealsRemaining(state.todayNutrition);
  const workout = resolveTodaysWorkout(state.trainingPlan);
  const heroTitle = getHeroTitle(state, primaryMessage);
  const priorityTitle =
    firstAction ?? getFallbackPriority(state, mealsRemaining);

  return {
    heroTitle,
    heroMessage:
      primaryMessage ??
      'Small nutrition decisions today can improve recovery and consistency.',
    priorityTitle,
    priorityExplanation: getPriorityExplanation(state, priorityTitle),
    benefit: getExpectedBenefit(state),
    signals: getContextSignals({
      mealsRemaining,
      progressSummary: state.progressSummary,
      recoverySnapshot: state.recoverySnapshot,
      todayNutrition: state.todayNutrition,
      workout,
    }),
    notes: getCoachNotes(state),
  };
}

function buildRecommendedActions(input: {
  todayNutrition: NutritionReadModel | null;
  onTodaysMeals: () => void;
  onNutritionPlan: () => void;
  onHistory: () => void;
  onCoach: () => void;
}): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (input.todayNutrition?.nextMeal) {
    actions.push({
      label: 'View Next Meal',
      description: `${input.todayNutrition.nextMeal.title} is planned next.`,
      onPress: input.onTodaysMeals,
    });
  }

  actions.push(
    {
      label: 'Open Nutrition Plan',
      description: 'Review how today fits into your week.',
      onPress: input.onNutritionPlan,
    },
    {
      label: 'Review History',
      description: 'See recent consistency patterns.',
      onPress: input.onHistory,
    },
    {
      label: 'Open Coach',
      description: 'Ask for nutrition guidance.',
      onPress: input.onCoach,
    },
  );

  return actions.slice(0, 4);
}

function getHeroTitle(
  state: RecommendationsState,
  primaryMessage?: string,
): string {
  if (primaryMessage) {
    return normalizeHeadline(primaryMessage);
  }

  if (
    state.todayNutrition &&
    state.todayNutrition.progress.consumedProteinGrams <
      state.todayNutrition.progress.targetProteinGrams
  ) {
    return 'Focus on protein consistency.';
  }

  if (state.recoverySnapshot?.recommendedIntensity === 'recovery') {
    return 'Support recovery with your next meal.';
  }

  return 'Hydration matters today.';
}

function getFallbackPriority(
  state: RecommendationsState,
  mealsRemaining: number,
): string {
  if (state.todayNutrition?.nextMeal) {
    return `Complete ${state.todayNutrition.nextMeal.title}.`;
  }

  if (mealsRemaining > 0) {
    return 'Complete your next planned meal.';
  }

  return 'Review your nutrition plan.';
}

function getPriorityExplanation(
  state: RecommendationsState,
  title: string,
): string {
  if (state.coachDecision?.priority === 'nutrition') {
    return state.coachDecision.summary;
  }

  if (state.recoverySnapshot?.recommendedIntensity === 'recovery') {
    return 'Recovery meals are especially useful when your body is adapting.';
  }

  return `${title} This keeps nutrition aligned with your current training rhythm.`;
}

function getExpectedBenefit(state: RecommendationsState): string {
  if (state.recoverySnapshot?.recommendedIntensity === 'recovery') {
    return 'better recovery and training adaptation.';
  }

  if (state.todayNutrition?.progress.adherencePercentage !== undefined) {
    return 'stronger nutrition consistency.';
  }

  return 'clearer coaching signals.';
}

function getContextSignals(input: {
  todayNutrition: NutritionReadModel | null;
  recoverySnapshot: RecoverySnapshot | null;
  progressSummary: ProgressSummary | null;
  workout: TodayWorkout | null;
  mealsRemaining: number;
}): Signal[] {
  const signals: Signal[] = [];

  if (input.workout) {
    signals.push({
      label: 'Workout',
      value: `${input.workout.focus} today`,
    });
  }

  if (input.recoverySnapshot) {
    signals.push({
      label: 'Recovery',
      value: formatRecovery(input.recoverySnapshot),
    });
  }

  if (input.todayNutrition) {
    signals.push({
      label: 'Nutrition',
      value: `${input.mealsRemaining} meals remaining`,
    });
  }

  if (signals.length < 3 && input.progressSummary) {
    signals.push({
      label: 'Training',
      value: `${input.progressSummary.workoutsCompleted} workouts this week`,
    });
  }

  return signals.slice(0, 3);
}

function getCoachNotes(state: RecommendationsState): string[] {
  const backendNotes = state.recommendations
    .flatMap((recommendation) => recommendation.recommendations)
    .filter((note) => note.trim().length > 0)
    .slice(0, 3);

  if (backendNotes.length > 0) {
    return backendNotes;
  }

  const notes = ['Spread protein across meals.'];

  if (state.todayNutrition?.nextMeal) {
    notes.push('Avoid skipping your next planned meal.');
  }

  if (state.recoverySnapshot?.recommendedIntensity === 'recovery') {
    notes.push('Keep hydration consistent today.');
  } else {
    notes.push('Keep meal timing consistent today.');
  }

  return notes.slice(0, 3);
}

function resolveTodaysWorkout(
  trainingPlan: TrainingPlan | null,
): TodayWorkout | null {
  if (!trainingPlan) {
    return null;
  }

  const day = new Date().getUTCDay();
  const todayIndex = day === 0 ? 7 : day;
  const matchingDay = trainingPlan.weeklySchedule.find(
    (scheduleDay) => scheduleDay.dayIndex === todayIndex,
  );

  if (!matchingDay) {
    return null;
  }

  return {
    dayIndex: matchingDay.dayIndex,
    exercises: matchingDay.exercises,
    focus: matchingDay.focus,
    format: matchingDay.format,
    intensity: matchingDay.intensity,
    title: matchingDay.title,
  };
}

function getMealsRemaining(nutrition: NutritionReadModel | null): number {
  if (!nutrition?.nextMeal) {
    return 0;
  }

  const index = nutrition.meals.findIndex(
    (meal) => meal.id === nutrition.nextMeal?.id,
  );

  return index < 0 ? 1 : Math.max(0, nutrition.meals.length - index);
}

function formatRecovery(recovery: RecoverySnapshot): string {
  if (recovery.readinessScore >= 80) {
    return 'Ready';
  }

  if (recovery.readinessScore >= 60) {
    return 'Moderate';
  }

  return 'Recovery focus';
}

function normalizeHeadline(value: string): string {
  const trimmed = value.trim();

  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function trackNutritionRecommendationsEvent(
  _event:
    | 'nutrition_recommendations_opened'
    | 'nutrition_recommendation_action_selected'
    | 'nutrition_recommendation_refreshed',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}

function isEmptyStateError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'NUTRITION_PROFILE_NOT_FOUND',
      'NUTRITION_PLAN_NOT_FOUND',
      'TODAY_NUTRITION_DAY_NOT_FOUND',
      'USER_PROFILE_NOT_FOUND',
      'TRAINING_PLAN_NOT_FOUND',
    ].includes(error.code)
  );
}

function getRecommendationsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load nutrition recommendations.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  content: {
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  hero: {
    gap: 10,
    paddingTop: 8,
  },
  heroTitle: {
    color: tokens.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
  },
  heroMessage: {
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  card: {
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  priorityTitle: {
    color: tokens.text,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },
  bodyText: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  benefitBox: {
    borderRadius: 18,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  benefitText: {
    color: tokens.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  signalCard: {
    width: '48%',
    minHeight: 84,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  signalLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  signalValue: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  actionCards: {
    gap: 12,
  },
  actionCard: {
    gap: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  actionTitle: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  actionDescription: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  notesList: {
    gap: 13,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  noteDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.text,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    color: tokens.text,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
  },
  fullButton: {
    width: '100%',
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: tokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  skeletonContent: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 178,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonSignal: {
    width: '48%',
    height: 84,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCardSmall: {
    height: 124,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
