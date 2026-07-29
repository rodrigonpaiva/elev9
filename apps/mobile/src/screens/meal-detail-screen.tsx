import { memo, useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  FoodItem,
  Meal,
  NutritionRecommendation,
  NutritionReadModel,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type MealStatusLabel = 'Next' | 'Planned' | 'Completed' | 'Partial' | 'Skipped';
type BadgeVariant = 'primary' | 'muted' | 'danger';

type MealDetailModel = {
  meal: Meal;
  status: MealStatusLabel;
  badgeVariant: BadgeVariant;
  accessibilityLabel: string;
  macros: Array<{
    label: string;
    value: string;
  }>;
  coachNote: string;
  preparationGuidance: string;
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

export function MealDetailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MealDetail'>>();
  const { mealId } = route.params;
  const [todayNutrition, setTodayNutrition] = useState<NutritionReadModel | null>(
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
      setErrorMessage(getMealDetailErrorMessage(todayResult.reason));
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
        ? buildMealDetailModel({
            mealId,
            recommendations,
            todayNutrition,
          })
        : null,
    [mealId, recommendations, todayNutrition],
  );

  const handleBackToTodaysMeals = useCallback(() => {
    navigation.navigate('TodaysMeals');
  }, [navigation]);

  const handleLogMeal = useCallback(() => {
    navigation.navigate('LogMeal', { mealId });
  }, [mealId, navigation]);

  const handleReplaceMeal = useCallback(() => {
    navigation.navigate('ReplaceMeal', { mealId });
  }, [mealId, navigation]);

  if (isLoading) {
    return <MealDetailSkeleton />;
  }

  if (errorMessage) {
    return (
      <MealDetailStateView
        title="Unable to load meal details."
        actionLabel="Back to Today's Meals"
        onAction={handleBackToTodaysMeals}
      />
    );
  }

  if (!model) {
    return (
      <MealDetailStateView
        title="Meal details unavailable."
        message="Your personalized meal guidance will appear here when available."
        actionLabel="Back to Today's Meals"
        onAction={handleBackToTodaysMeals}
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
        <MealHero model={model} />
        <MacroSummary macros={model.macros} />
        <FoodItemsSection foodItems={model.meal.foodItems} />
        <CoachNote note={model.coachNote} />
        <PreparationGuidance guidance={model.preparationGuidance} />
        <MealActions
          onBack={handleBackToTodaysMeals}
          onLogMeal={handleLogMeal}
          onReplaceMeal={handleReplaceMeal}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const MealHero = memo(function MealHero({ model }: { model: MealDetailModel }) {
  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.hero}>
      <View style={styles.heroTopRow}>
        <Text style={styles.mealType}>{formatMealType(model.meal.type)}</Text>
        <Badge
          label={model.status}
          variant={model.badgeVariant}
          style={styles.statusBadge}
        />
      </View>
      <Text style={styles.heroTitle}>{model.meal.title}</Text>
      <Text style={styles.heroMessage}>{model.meal.description}</Text>
    </View>
  );
});

const MacroSummary = memo(function MacroSummary({
  macros,
}: {
  macros: MealDetailModel['macros'];
}) {
  return (
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
  );
});

const FoodItemsSection = memo(function FoodItemsSection({
  foodItems,
}: {
  foodItems: FoodItem[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>FOOD ITEMS</Text>
      {foodItems.length > 0 ? (
        <View style={styles.foodList}>
          {foodItems.map((food) => (
            <FoodItemRow key={`${food.name}-${food.quantity}`} food={food} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Food item details will appear here when available.
        </Text>
      )}
    </View>
  );
});

const FoodItemRow = memo(function FoodItemRow({ food }: { food: FoodItem }) {
  const macros = food.estimatedMacros;

  return (
    <View style={styles.foodRow}>
      <View style={styles.foodTitleGroup}>
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodQuantity}>
          {food.quantity}
          {food.unit ? ` ${food.unit}` : ''}
        </Text>
      </View>
      {macros ? (
        <View style={styles.foodMacroGroup}>
          <Text style={styles.foodMacro}>
            {Math.round(macros.calories)} kcal
          </Text>
          <Text style={styles.foodMacro}>{getDominantMacroLabel(macros)}</Text>
        </View>
      ) : null}
    </View>
  );
});

const CoachNote = memo(function CoachNote({ note }: { note: string }) {
  return (
    <View accessibilityLabel={`Coach note. ${note}`} style={styles.card}>
      <Text style={styles.sectionLabel}>COACH NOTE</Text>
      <Text style={styles.coachNote}>{note}</Text>
    </View>
  );
});

const PreparationGuidance = memo(function PreparationGuidance({
  guidance,
}: {
  guidance: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>PREPARATION GUIDANCE</Text>
      <Text style={styles.guidanceText}>{guidance}</Text>
    </View>
  );
});

const MealActions = memo(function MealActions({
  onBack,
  onLogMeal,
  onReplaceMeal,
}: {
  onBack: () => void;
  onLogMeal: () => void;
  onReplaceMeal: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>ACTIONS</Text>
      <View style={styles.actions}>
        <Button
          label="Log Meal"
          onPress={onLogMeal}
          accessibilityLabel="Log meal"
        />
        <Button
          label="Replace Meal"
          onPress={onReplaceMeal}
          variant="ghost"
          accessibilityLabel="Replace meal"
        />
        <Button
          label="Back to Today's Meals"
          onPress={onBack}
          variant="ghost"
          accessibilityLabel="Back to today's meals"
        />
      </View>
    </View>
  );
});

function MealDetailSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading meal details"
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

function MealDetailStateView({
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

function buildMealDetailModel(input: {
  mealId: string;
  todayNutrition: NutritionReadModel;
  recommendations: NutritionRecommendation[];
}): MealDetailModel | null {
  const meal = input.todayNutrition.meals.find(
    (candidate) => candidate.id === input.mealId,
  );

  if (!meal) {
    return null;
  }

  const status = getMealStatus(meal, input.todayNutrition);

  return {
    meal,
    status,
    badgeVariant: getBadgeVariant(status),
    accessibilityLabel: `${formatMealType(meal.type)}. ${Math.round(
      meal.estimatedMacros.calories,
    )} calories. ${Math.round(
      meal.estimatedMacros.proteinGrams,
    )} grams of protein. ${status} meal.`,
    macros: [
      {
        label: 'Calories',
        value: `${Math.round(meal.estimatedMacros.calories)} kcal`,
      },
      {
        label: 'Protein',
        value: `${Math.round(meal.estimatedMacros.proteinGrams)}g`,
      },
      {
        label: 'Carbs',
        value: `${Math.round(meal.estimatedMacros.carbsGrams)}g`,
      },
      {
        label: 'Fat',
        value: `${Math.round(meal.estimatedMacros.fatGrams)}g`,
      },
    ],
    coachNote: getCoachNote(meal, input.todayNutrition, input.recommendations),
    preparationGuidance: getPreparationGuidance(meal, input.todayNutrition),
  };
}

function getMealStatus(meal: Meal, nutrition: NutritionReadModel): MealStatusLabel {
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

function getBadgeVariant(status: MealStatusLabel): BadgeVariant {
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

function getCoachNote(
  meal: Meal,
  nutrition: NutritionReadModel,
  recommendations: NutritionRecommendation[],
): string {
  const recommendation = recommendations
    .flatMap((item) => item.recommendations)
    .find((item) => item.trim().length > 0);

  if (recommendation) {
    return recommendation.trim();
  }

  if (nutrition.nextMeal?.id === meal.id) {
    return 'Prioritize protein and hydration with this meal.';
  }

  if (meal.type === 'dinner') {
    return 'This meal helps support recovery before tomorrow.';
  }

  if (meal.type === 'breakfast' || meal.type === 'lunch') {
    return 'This meal helps maintain energy for the rest of the day.';
  }

  return "This meal keeps your nutrition consistent with today's plan.";
}

function getPreparationGuidance(meal: Meal, nutrition: NutritionReadModel): string {
  if (nutrition.nextMeal?.id === meal.id) {
    return 'Keep portions consistent with the plan and hydrate with this meal.';
  }

  if (meal.type === 'snack') {
    return 'Use this meal to stay steady between larger meals.';
  }

  if (meal.type === 'dinner') {
    return 'Keep the meal calm, balanced and easy to digest.';
  }

  return 'Eat this meal when it fits your normal rhythm today.';
}

function getDominantMacroLabel(
  macros: NonNullable<FoodItem['estimatedMacros']>,
): string {
  const values = [
    {
      label: `${Math.round(macros.proteinGrams)}g protein`,
      value: macros.proteinGrams,
    },
    {
      label: `${Math.round(macros.carbsGrams)}g carbs`,
      value: macros.carbsGrams,
    },
    { label: `${Math.round(macros.fatGrams)}g fat`, value: macros.fatGrams },
  ];
  const dominant = values.reduce((current, candidate) =>
    candidate.value > current.value ? candidate : current,
  );

  return dominant.label;
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

function isNutritionEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['NUTRITION_PLAN_NOT_FOUND', 'TODAY_NUTRITION_DAY_NOT_FOUND'].includes(
      error.code,
    )
  );
}

function getMealDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load meal details.';
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  mealType: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexShrink: 0,
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
  foodList: {
    gap: 2,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.softBorder,
    paddingVertical: 14,
  },
  foodTitleGroup: {
    flex: 1,
    gap: 4,
  },
  foodName: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  foodQuantity: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  foodMacroGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  foodMacro: {
    color: tokens.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  coachNote: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '800',
  },
  guidanceText: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 27,
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
