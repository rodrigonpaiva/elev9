import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  Meal,
  NutritionRecommendation,
  TodayNutrition,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type MealTimelineStatus =
  | 'Completed'
  | 'Next'
  | 'Planned'
  | 'Partial'
  | 'Skipped';
type BadgeVariant = 'primary' | 'muted' | 'danger';

type MealTimelineItem = {
  meal: Meal;
  status: MealTimelineStatus;
  badgeVariant: BadgeVariant;
  timeLabel: string | null;
  accessibilityLabel: string;
};

type TodaysMealsModel = {
  heroMessage: string;
  meals: MealTimelineItem[];
  nextMealId: string | null;
  macros: Array<{
    label: string;
    value: string;
  }>;
  coachNote: string;
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

export function TodaysMealsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [todayNutrition, setTodayNutrition] = useState<TodayNutrition | null>(
    null,
  );
  const [recommendations, setRecommendations] = useState<
    NutritionRecommendation[]
  >([]);
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

    const [todayResult, recommendationsResult] = await Promise.allSettled([
      apiClient.nutrition.getTodayNutrition(),
      apiClient.nutrition.getNutritionRecommendations({ limit: 3 }),
    ]);

    if (todayResult.status === 'fulfilled') {
      setTodayNutrition(todayResult.value.todayNutrition);
    } else if (isNutritionEmptyState(todayResult.reason)) {
      setTodayNutrition(null);
    } else {
      setTodayNutrition(null);
      setErrorMessage(getMealsErrorMessage(todayResult.reason));
    }

    setRecommendations(
      recommendationsResult.status === 'fulfilled'
        ? recommendationsResult.value.recommendations
        : [],
    );
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
      todayNutrition
        ? buildTodaysMealsModel({
            recommendations,
            todayNutrition,
          })
        : null,
    [recommendations, todayNutrition],
  );

  const handleBackToNutritionOverview = useCallback(() => {
    navigation.navigate('NutritionOverview');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleOpenNutritionPlan = useCallback(() => {
    navigation.navigate('NutritionPlan');
  }, [navigation]);

  const handleLogMeal = useCallback(
    (mealId: string) => {
      navigation.navigate('LogMeal', { mealId });
    },
    [navigation],
  );

  const handleOpenMeal = useCallback(
    (mealId: string) => {
      navigation.navigate('MealDetail', { mealId });
    },
    [navigation],
  );

  const renderMeal = useCallback(
    ({ item }: { item: MealTimelineItem }) => (
      <MealTimelineCard item={item} onPress={handleOpenMeal} />
    ),
    [handleOpenMeal],
  );

  if (isLoading) {
    return <TodaysMealsSkeleton />;
  }

  if (errorMessage) {
    return (
      <TodaysMealsStateView
        title="Unable to load today's meals."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (!model || model.meals.length === 0) {
    return (
      <TodaysMealsStateView
        title="No meals planned today."
        message="Your personalized meals will appear here once your nutrition plan is ready."
        actionLabel="Back to Nutrition Overview"
        onAction={handleBackToNutritionOverview}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={model.meals}
        keyExtractor={(item) => item.meal.id}
        renderItem={renderMeal}
        ItemSeparatorComponent={TimelineSeparator}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
        ListHeaderComponent={<MealsHeader heroMessage={model.heroMessage} />}
        ListFooterComponent={
          <MealsFooter
            coachNote={model.coachNote}
            macros={model.macros}
            nextMealId={model.nextMealId}
            onLogMeal={handleLogMeal}
            onOpenCoach={handleOpenCoach}
            onOpenNutritionPlan={handleOpenNutritionPlan}
          />
        }
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const MealsHeader = memo(function MealsHeader({
  heroMessage,
}: {
  heroMessage: string;
}) {
  return (
    <View
      accessibilityLabel={`Today's meals. ${heroMessage}`}
      style={styles.hero}
    >
      <Text style={styles.heroTitle}>Today&apos;s Meals</Text>
      <Text style={styles.heroMessage}>{heroMessage}</Text>
      <Text style={styles.sectionLabel}>MEAL TIMELINE</Text>
    </View>
  );
});

const MealTimelineCard = memo(function MealTimelineCard({
  item,
  onPress,
}: {
  item: MealTimelineItem;
  onPress: (mealId: string) => void;
}) {
  const { meal } = item;

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPress(meal.id)}
      style={styles.mealCard}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleGroup}>
          <Text style={styles.mealType}>{formatMealType(meal.type)}</Text>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          {item.timeLabel ? (
            <Text style={styles.mealTime}>{item.timeLabel}</Text>
          ) : null}
        </View>
        <Badge
          label={item.status}
          variant={item.badgeVariant}
          style={styles.statusBadge}
        />
      </View>

      <Text numberOfLines={2} style={styles.mealDescription}>
        {meal.description}
      </Text>

      <View style={styles.mealMacroRow}>
        <Text style={styles.mealMacro}>
          {Math.round(meal.estimatedMacros.calories)} kcal
        </Text>
        <Text style={styles.mealMacro}>
          {Math.round(meal.estimatedMacros.proteinGrams)}g protein
        </Text>
      </View>

      <Text style={styles.disabledHint}>View meal guidance</Text>
    </Pressable>
  );
});

function TimelineSeparator() {
  return <View style={styles.timelineSeparator} />;
}

const MealsFooter = memo(function MealsFooter({
  coachNote,
  macros,
  nextMealId,
  onLogMeal,
  onOpenCoach,
  onOpenNutritionPlan,
}: {
  macros: TodaysMealsModel['macros'];
  coachNote: string;
  nextMealId: string | null;
  onLogMeal: (mealId: string) => void;
  onOpenCoach: () => void;
  onOpenNutritionPlan: () => void;
}) {
  return (
    <View style={styles.footer}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MACRO SUMMARY</Text>
        <View style={styles.metricGrid}>
          {macros.map((macro) => (
            <View key={macro.label} style={styles.metricCard}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.metricValue}
              >
                {macro.value}
              </Text>
              <Text style={styles.metricLabel}>{macro.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        accessibilityLabel={`Coach nutrition note. ${coachNote}`}
        style={styles.card}
      >
        <Text style={styles.sectionLabel}>COACH NUTRITION NOTE</Text>
        <Text style={styles.coachNote}>{coachNote}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actions}>
          {nextMealId ? (
            <Button
              label="Log Next Meal"
              onPress={() => onLogMeal(nextMealId)}
              variant="ghost"
              accessibilityLabel="Log next meal"
            />
          ) : null}
          <Button
            label="View Nutrition Plan"
            onPress={onOpenNutritionPlan}
            variant="ghost"
            accessibilityLabel="View nutrition plan"
          />
          <Button
            label="Open Coach"
            onPress={onOpenCoach}
            variant="ghost"
            accessibilityLabel="Open coach"
          />
        </View>
      </View>
    </View>
  );
});

function TodaysMealsSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading today's meals"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonMeal} />
        <View style={styles.skeletonMeal} />
        <View style={styles.skeletonMeal} />
        <View style={styles.metricGrid}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function TodaysMealsStateView({
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

function buildTodaysMealsModel(input: {
  todayNutrition: TodayNutrition;
  recommendations: NutritionRecommendation[];
}): TodaysMealsModel {
  const { todayNutrition, recommendations } = input;
  const meals = todayNutrition.meals.map((meal) =>
    buildMealTimelineItem(meal, todayNutrition),
  );
  const completedMeals = meals.filter(
    (item) => item.status === 'Completed',
  ).length;
  const remainingMeals = meals.filter(
    (item) => item.status === 'Next' || item.status === 'Planned',
  ).length;

  return {
    heroMessage: getHeroMessage(todayNutrition, completedMeals, remainingMeals),
    meals,
    nextMealId: todayNutrition.nextMeal?.id ?? null,
    macros: [
      {
        label: 'Calories',
        value: `${Math.round(todayNutrition.macroTargets.calories)} kcal`,
      },
      {
        label: 'Protein',
        value: `${Math.round(todayNutrition.macroTargets.proteinGrams)}g protein`,
      },
      {
        label: 'Carbs',
        value: `${Math.round(todayNutrition.macroTargets.carbsGrams)}g carbs`,
      },
      {
        label: 'Fat',
        value: `${Math.round(todayNutrition.macroTargets.fatGrams)}g fat`,
      },
    ],
    coachNote: getCoachNutritionNote(todayNutrition, recommendations),
  };
}

function buildMealTimelineItem(
  meal: Meal,
  nutrition: TodayNutrition,
): MealTimelineItem {
  const status = getMealTimelineStatus(meal, nutrition);
  const badgeVariant = getBadgeVariant(status);

  return {
    meal,
    status,
    badgeVariant,
    timeLabel: getMealTimeLabel(meal.type),
    accessibilityLabel: `${meal.title}. ${status} meal. ${Math.round(
      meal.estimatedMacros.calories,
    )} calories. ${Math.round(
      meal.estimatedMacros.proteinGrams,
    )} grams of protein.`,
  };
}

function getMealTimelineStatus(
  meal: Meal,
  nutrition: TodayNutrition,
): MealTimelineStatus {
  if (nutrition.nextMeal?.id === meal.id) {
    return 'Next';
  }

  const nextMealIndex = nutrition.nextMeal
    ? nutrition.meals.findIndex((item) => item.id === nutrition.nextMeal?.id)
    : -1;
  const mealIndex = nutrition.meals.findIndex((item) => item.id === meal.id);

  if (nextMealIndex === -1) {
    return 'Completed';
  }

  if (mealIndex >= 0 && mealIndex < nextMealIndex) {
    return 'Completed';
  }

  return 'Planned';
}

function getBadgeVariant(status: MealTimelineStatus): BadgeVariant {
  switch (status) {
    case 'Completed':
    case 'Next':
      return 'primary';
    case 'Partial':
    case 'Planned':
      return 'muted';
    case 'Skipped':
      return 'danger';
  }
}

function getHeroMessage(
  nutrition: TodayNutrition,
  completedMeals: number,
  remainingMeals: number,
): string {
  if (nutrition.nextMeal) {
    return `Your next meal is ${nutrition.nextMeal.title}.`;
  }

  if (completedMeals > 0) {
    return `${completedMeals} meals completed, ${remainingMeals} remaining.`;
  }

  return `You have ${nutrition.meals.length} meals planned today.`;
}

function getCoachNutritionNote(
  nutrition: TodayNutrition,
  recommendations: NutritionRecommendation[],
): string {
  const recommendation = recommendations
    .flatMap((item) => item.recommendations)
    .find((item) => item.trim().length > 0);

  if (recommendation) {
    return recommendation.trim();
  }

  if (nutrition.nutritionFocus.trim()) {
    return nutrition.nutritionFocus.trim();
  }

  if (nutrition.nextMeal) {
    return 'Prioritize protein at your next meal.';
  }

  return "Your meals are aligned with today's nutrition target.";
}

function formatMealType(type: Meal['type']): string {
  switch (type) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    case 'snack':
      return 'Snack';
  }
}

function getMealTimeLabel(type: Meal['type']): string | null {
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

function getMealsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Unable to load today's meals.";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  hero: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 20,
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
    paddingBottom: 10,
  },
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  mealCard: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  mealTitleGroup: {
    flex: 1,
    gap: 5,
  },
  mealType: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mealTitle: {
    color: tokens.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  mealTime: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  statusBadge: {
    flexShrink: 0,
  },
  mealDescription: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  mealMacroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealMacro: {
    color: tokens.text,
    borderRadius: 999,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  disabledHint: {
    color: tokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  timelineSeparator: {
    height: 14,
  },
  footer: {
    gap: 22,
    paddingTop: 24,
  },
  section: {
    gap: 12,
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
    fontSize: 20,
    lineHeight: 26,
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
  coachNote: {
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
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMeal: {
    height: 164,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMetric: {
    width: '48%',
    height: 92,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
});
