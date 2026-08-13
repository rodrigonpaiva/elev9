import { memo, useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  GetCurrentNutritionPlanResponse,
  NutritionRecommendation,
  NutritionReadModel,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type NutritionPlan = GetCurrentNutritionPlanResponse['nutritionPlan'];

type NutritionState = {
  todayNutrition: NutritionReadModel | null;
  nutritionPlan: NutritionPlan | null;
  recommendations: NutritionRecommendation[];
};

type Metric = {
  label: string;
  value: string;
};

type NutritionOverviewModel = {
  accessibilityLabel: string;
  heroTitle: string;
  heroMessage: string;
  targets: Metric[];
  progress: Metric[];
  nextMeal: {
    id: string;
    title: string;
    timeLabel: string | null;
    caloriesLabel: string;
    proteinLabel: string;
    description: string;
  } | null;
  coachInsight: string;
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
  skeleton: '#eef2f7',
  skeletonSoft: '#f7f9fc',
} as const;

export function NutritionOverviewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<NutritionState>({
    todayNutrition: null,
    nutritionPlan: null,
    recommendations: [],
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

    const [todayResult, planResult, recommendationsResult] =
      await Promise.allSettled([
        apiClient.nutrition.getTodayNutrition(),
        apiClient.nutrition.getCurrentNutritionPlan(),
        apiClient.nutrition.getNutritionRecommendations({ limit: 3 }),
      ]);

    const todayNutrition =
      todayResult.status === 'fulfilled'
        ? todayResult.value.todayNutrition
        : null;
    const nutritionPlan =
      planResult.status === 'fulfilled' ? planResult.value.nutritionPlan : null;
    const recommendations =
      recommendationsResult.status === 'fulfilled'
        ? recommendationsResult.value.recommendations
        : [];

    if (
      todayResult.status === 'rejected' &&
      !isNutritionEmptyState(todayResult.reason)
    ) {
      setErrorMessage(getNutritionErrorMessage(todayResult.reason));
    }

    setState({
      todayNutrition,
      nutritionPlan,
      recommendations,
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const model = useMemo(
    () =>
      state.todayNutrition
        ? buildNutritionOverviewModel({
            todayNutrition: state.todayNutrition,
          })
        : null,
    [state.recommendations, state.todayNutrition],
  );

  const handleCreateNutritionProfile = useCallback(() => {
    navigation.navigate('CreateNutritionProfile');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleOpenTodaysMeals = useCallback(() => {
    navigation.navigate('TodaysMeals');
  }, [navigation]);

  const handleOpenNutritionPlan = useCallback(() => {
    navigation.navigate('NutritionPlan');
  }, [navigation]);

  const handleOpenNutritionHistory = useCallback(() => {
    navigation.navigate('NutritionHistory');
  }, [navigation]);

  const handleOpenRecommendations = useCallback(() => {
    navigation.navigate('NutritionRecommendations');
  }, [navigation]);

  const handleOpenMeal = useCallback(
    (mealId: string) => {
      navigation.navigate('MealDetail', { mealId });
    },
    [navigation],
  );

  if (isLoading) {
    return <NutritionOverviewSkeleton />;
  }

  if (errorMessage) {
    return (
      <NutritionOverviewStateView
        title="Unable to load nutrition overview."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (!model) {
    return (
      <NutritionOverviewStateView
        title="No nutrition plan available."
        message="Create your nutrition profile to receive personalized nutrition coaching."
        actionLabel="Create Nutrition Profile"
        onAction={handleCreateNutritionProfile}
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
        <NutritionHero model={model} />
        <MetricGrid label="DAILY TARGETS" metrics={model.targets} />
        <MetricGrid label="TODAY'S PROGRESS" metrics={model.progress} />
        <NextMealCard nextMeal={model.nextMeal} onOpenMeal={handleOpenMeal} />
        <CoachInsightCard insight={model.coachInsight} />
        <QuickActions
          onOpenCoach={handleOpenCoach}
          onOpenNutritionHistory={handleOpenNutritionHistory}
          onOpenNutritionPlan={handleOpenNutritionPlan}
          onOpenRecommendations={handleOpenRecommendations}
          onOpenTodaysMeals={handleOpenTodaysMeals}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const NutritionHero = memo(function NutritionHero({
  model,
}: {
  model: NutritionOverviewModel;
}) {
  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.hero}>
      <Text style={styles.heroTitle}>{model.heroTitle}</Text>
      <Text style={styles.heroMessage}>{model.heroMessage}</Text>
    </View>
  );
});

const MetricGrid = memo(function MetricGrid({
  label,
  metrics,
}: {
  label: string;
  metrics: Metric[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {metric.value}
            </Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const NextMealCard = memo(function NextMealCard({
  nextMeal,
  onOpenMeal,
}: {
  nextMeal: NutritionOverviewModel['nextMeal'];
  onOpenMeal: (mealId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>NEXT MEAL</Text>
      {nextMeal ? (
        <>
          <View style={styles.nextMealHeader}>
            <View style={styles.nextMealTitleGroup}>
              <Text style={styles.nextMealTitle}>{nextMeal.title}</Text>
              {nextMeal.timeLabel ? (
                <Text style={styles.nextMealTime}>{nextMeal.timeLabel}</Text>
              ) : null}
            </View>
            <View style={styles.nextMealTargets}>
              <Text style={styles.nextMealTarget}>
                {nextMeal.caloriesLabel}
              </Text>
              <Text style={styles.nextMealTarget}>{nextMeal.proteinLabel}</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={styles.nextMealDescription}>
            {nextMeal.description}
          </Text>
          <Button
            accessibilityLabel={`View meal details for ${nextMeal.title}`}
            label="View Meal"
            onPress={() => onOpenMeal(nextMeal.id)}
            variant="ghost"
            style={styles.fullButton}
          />
        </>
      ) : (
        <>
          <Text style={styles.emptySectionTitle}>
            No meals remaining today.
          </Text>
          <Text style={styles.emptySectionMessage}>
            Your next planned meal will appear here.
          </Text>
        </>
      )}
    </View>
  );
});

const CoachInsightCard = memo(function CoachInsightCard({
  insight,
}: {
  insight: string;
}) {
  return (
    <View
      accessibilityLabel={`Coach nutrition insight. ${insight}`}
      style={styles.card}
    >
      <Text style={styles.sectionLabel}>COACH NUTRITION INSIGHT</Text>
      <Text style={styles.insightText}>{insight}</Text>
    </View>
  );
});

const QuickActions = memo(function QuickActions({
  onOpenCoach,
  onOpenNutritionHistory,
  onOpenNutritionPlan,
  onOpenRecommendations,
  onOpenTodaysMeals,
}: {
  onOpenCoach: () => void;
  onOpenNutritionHistory: () => void;
  onOpenNutritionPlan: () => void;
  onOpenRecommendations: () => void;
  onOpenTodaysMeals: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={styles.actions}>
        <Button
          label="View Today's Meals"
          onPress={onOpenTodaysMeals}
          variant="ghost"
          accessibilityLabel="View today's meals"
        />
        <Button
          label="Nutrition Plan"
          onPress={onOpenNutritionPlan}
          variant="ghost"
          accessibilityLabel="Open nutrition plan"
        />
        <Button
          label="History"
          onPress={onOpenNutritionHistory}
          variant="ghost"
          accessibilityLabel="Open nutrition history"
        />
        <Button
          label="Recommendations"
          onPress={onOpenRecommendations}
          variant="ghost"
          accessibilityLabel="Open nutrition recommendations"
        />
      </View>
    </View>
  );
});

function NutritionOverviewSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading nutrition overview"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.metricGrid}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
        </View>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCardSmall} />
      </View>
    </SafeAreaView>
  );
}

function NutritionOverviewStateView({
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

function buildNutritionOverviewModel(input: {
  todayNutrition: NutritionReadModel;
}): NutritionOverviewModel {
  const { todayNutrition } = input;
  const targets = todayNutrition.macroTargets;
  const mealsRemaining = todayNutrition.mealProgress.pending;
  const mealsCompleted = todayNutrition.mealProgress.completed;
  const heroTitle = getHeroTitle(todayNutrition);
  const heroMessage = getHeroMessage(todayNutrition);
  const coachInsight = getCoachInsight(todayNutrition);

  return {
    accessibilityLabel: `Nutrition overview. ${Math.round(
      targets.calories,
    )} calorie target. ${mealsCompleted} meals completed. ${
      todayNutrition.nextMeal
        ? `${todayNutrition.nextMeal.title} is your next meal.`
        : 'No meals remaining today.'
    }`,
    heroTitle,
    heroMessage,
    targets: [
      { label: 'Calories', value: `${Math.round(targets.calories)} kcal` },
      { label: 'Protein', value: `${Math.round(targets.proteinGrams)} g` },
      { label: 'Carbs', value: `${Math.round(targets.carbsGrams)} g` },
      { label: 'Fat', value: `${Math.round(targets.fatGrams)} g` },
    ],
    progress: [
      { label: 'Meals Completed', value: `${mealsCompleted} completed` },
      { label: 'Meals Remaining', value: `${mealsRemaining} remaining` },
      {
        label: 'Nutrition Adherence',
        value: formatAdherenceStatus(todayNutrition.progress.adherenceStatus),
      },
    ],
    nextMeal: todayNutrition.nextMeal
      ? {
          id: todayNutrition.nextMeal.id,
          title: todayNutrition.nextMeal.title,
          timeLabel: getMealTimeLabel(todayNutrition.nextMeal.type),
          caloriesLabel: `${Math.round(
            todayNutrition.nextMeal.estimatedMacros.calories,
          )} kcal`,
          proteinLabel: `${Math.round(
            todayNutrition.nextMeal.estimatedMacros.proteinGrams,
          )} g protein`,
          description: todayNutrition.nextMeal.description,
        }
      : null,
    coachInsight,
  };
}

function getHeroTitle(nutrition: NutritionReadModel): string {
  if (nutrition.progress.adherenceStatus === 'within_range') {
    return 'Nutrition On Track';
  }

  return 'Nutrition Focus Today';
}

function getHeroMessage(nutrition: NutritionReadModel): string {
  return nutrition.insight.message;
}

function getCoachInsight(nutrition: NutritionReadModel): string {
  return nutrition.insight.message;
}

function formatAdherenceStatus(
  status: NonNullable<NutritionReadModel['progress']>['adherenceStatus'],
): string {
  return status.replace('_', ' ');
}

function getMealTimeLabel(
  type: NonNullable<NutritionReadModel['meals']>[number]['type'],
): string | null {
  switch (type) {
    case 'breakfast':
      return 'Morning';
    case 'lunch':
      return 'Midday';
    case 'dinner':
      return 'Evening';
    case 'snack':
      return 'Snack';
  }
}

function isNutritionEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['NUTRITION_PLAN_NOT_FOUND', 'TODAY_NUTRITION_DAY_NOT_FOUND'].includes(
      error.code,
    )
  );
}

function getNutritionErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load nutrition overview.';
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
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
  },
  heroMessage: {
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    minHeight: 92,
    justifyContent: 'center',
    gap: 8,
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
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  nextMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  nextMealTitleGroup: {
    flex: 1,
    gap: 5,
  },
  nextMealTitle: {
    color: tokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  nextMealTime: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  nextMealTargets: {
    alignItems: 'flex-end',
    gap: 5,
    paddingTop: 4,
  },
  nextMealTarget: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  nextMealDescription: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  insightText: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '800',
  },
  actions: {
    gap: 10,
  },
  fullButton: {
    width: '100%',
  },
  emptySectionTitle: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  emptySectionMessage: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
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
    gap: 22,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMetric: {
    width: '48%',
    height: 92,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 190,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCardSmall: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
