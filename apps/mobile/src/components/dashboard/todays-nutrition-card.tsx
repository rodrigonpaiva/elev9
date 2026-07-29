import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TodayNutrition, TodayWorkout } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

type TodaysNutritionCardProps = {
  todayNutrition: TodayNutrition | null;
  workout: TodayWorkout | null;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onCreateNutritionProfile: () => void;
  onOpenNutritionOverview?: () => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';
type AdherenceLabel =
  | 'Unavailable'
  | 'Not Started'
  | 'Below Range'
  | 'Within Range'
  | 'Above Range';

const tokens = {
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#f1f5f9',
  surface: '#f8fafc',
  skeleton: '#eef2f7',
  skeletonSoft: '#f7f9fc',
} as const;

export const TodaysNutritionCard = memo(function TodaysNutritionCard({
  errorMessage,
  isLoading,
  onCreateNutritionProfile,
  onOpenNutritionOverview,
  onRetry,
  todayNutrition,
  workout,
}: TodaysNutritionCardProps) {
  const model = useMemo(() => {
    if (!todayNutrition) {
      return null;
    }

    return buildNutritionCardModel(todayNutrition);
  }, [todayNutrition]);

  if (isLoading) {
    return <TodaysNutritionSkeleton />;
  }

  if (errorMessage) {
    return (
      <View
        accessibilityLabel="Nutrition data unavailable."
        style={styles.card}
      >
        <View style={styles.errorContent}>
          <Text style={styles.label}>NUTRITION</Text>
          <Text style={styles.errorTitle}>Nutrition data unavailable.</Text>
          <Button
            accessibilityLabel="Retry loading nutrition data"
            label="Retry"
            onPress={onRetry}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  if (!model) {
    return (
      <View
        accessibilityLabel="No nutrition plan available. Create your nutrition profile to receive personalized recommendations."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>NUTRITION</Text>
          <Text style={styles.emptyTitle}>No nutrition plan available.</Text>
          <Text style={styles.emptyMessage}>
            Create your nutrition profile to receive personalized
            recommendations.
          </Text>
          <Button
            accessibilityLabel="Create nutrition profile"
            label="Create Nutrition Profile"
            onPress={onCreateNutritionProfile}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>NUTRITION</Text>
        <Badge
          label={model.adherence.label}
          variant={model.adherence.badgeVariant}
          style={styles.adherenceBadge}
        />
      </View>

      <View style={styles.caloriesGroup}>
        <Text style={styles.calories}>{model.caloriesLabel}</Text>
        <Text style={styles.caloriesLabel}>Today&apos;s Target</Text>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.macroRow}
      >
        {model.macros.map((macro) => (
          <View key={macro.label} style={styles.macroItem}>
            <Text style={styles.macroLabel}>{macro.label}</Text>
            <Text style={styles.macroValue}>{macro.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mealsSection}>
        <View style={styles.mealMetric}>
          <Text style={styles.mealLabel}>Meals Remaining</Text>
          <Text style={styles.mealValue}>{model.mealsRemainingLabel}</Text>
        </View>
        <View style={styles.mealDivider} />
        <View style={styles.mealMetric}>
          <Text style={styles.mealLabel}>Next Meal</Text>
          <Text numberOfLines={1} style={styles.mealValue}>
            {model.nextMealLabel}
          </Text>
        </View>
      </View>

      <View style={styles.focusBox}>
        <Text style={styles.focusLabel}>TODAY&apos;S FOCUS</Text>
        <Text style={styles.focusText}>{model.focus}</Text>
      </View>

      {onOpenNutritionOverview ? (
        <Button
          accessibilityLabel="Open nutrition overview"
          label="View Nutrition"
          onPress={onOpenNutritionOverview}
          variant="ghost"
          style={styles.primaryButton}
        />
      ) : null}
    </View>
  );
});

function TodaysNutritionSkeleton() {
  return (
    <View accessibilityLabel="Loading today's nutrition" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.caloriesGroup}>
        <View style={styles.skeletonCalories} />
        <View style={styles.skeletonCaloriesLabel} />
      </View>
      <View style={styles.macroRow}>
        <View style={styles.skeletonMacro} />
        <View style={styles.skeletonMacro} />
        <View style={styles.skeletonMacro} />
      </View>
      <View style={styles.mealsSection}>
        <View style={styles.skeletonMeal} />
        <View style={styles.skeletonMeal} />
      </View>
      <View style={styles.focusBox}>
        <View style={styles.skeletonFocusLabel} />
        <View style={styles.skeletonFocusText} />
      </View>
    </View>
  );
}

function buildNutritionCardModel(
  nutrition: TodayNutrition,
) {
  const targets = nutrition.macroTargets;
  const adherence = {
    label: {
      unavailable: 'Unavailable',
      not_started: 'Not Started',
      below_range: 'Below Range',
      within_range: 'Within Range',
      above_range: 'Above Range',
    }[nutrition.progress.adherenceStatus] as AdherenceLabel,
    badgeVariant: {
      unavailable: 'muted',
      not_started: 'muted',
      below_range: 'danger',
      within_range: 'primary',
      above_range: 'danger',
    }[nutrition.progress.adherenceStatus] as BadgeVariant,
  };
  const mealsRemaining = nutrition.mealProgress.pending;
  const nextMealLabel = nutrition.nextMeal
    ? nutrition.nextMeal.title
    : 'No meals remaining';
  const focus = nutrition.focus.message;

  return {
    adherence,
    caloriesLabel: `${Math.round(targets.calories)} kcal`,
    macros: [
      { label: 'Protein', value: `${Math.round(targets.proteinGrams)}g` },
      { label: 'Carbs', value: `${Math.round(targets.carbsGrams)}g` },
      { label: 'Fat', value: `${Math.round(targets.fatGrams)}g` },
    ],
    mealsRemainingLabel: `${mealsRemaining} ${
      mealsRemaining === 1 ? 'meal' : 'meals'
    } remaining`,
    nextMealLabel,
    focus,
    accessibilityLabel: `Nutrition target ${Math.round(
      targets.calories,
    )} calories. Protein ${Math.round(
      targets.proteinGrams,
    )} grams. ${mealsRemaining} ${
      mealsRemaining === 1 ? 'meal' : 'meals'
    } remaining.`,
  };
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  headerRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  adherenceBadge: {
    flexShrink: 0,
  },
  caloriesGroup: {
    gap: 6,
  },
  calories: {
    color: tokens.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },
  caloriesLabel: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroItem: {
    flex: 1,
    minHeight: 68,
    justifyContent: 'center',
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  macroLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  macroValue: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  mealsSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  mealMetric: {
    flex: 1,
    gap: 6,
  },
  mealDivider: {
    width: 1,
    backgroundColor: tokens.softBorder,
  },
  mealLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  mealValue: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  focusBox: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  focusLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  focusText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
  },
  errorContent: {
    gap: 16,
  },
  errorTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyContent: {
    gap: 12,
  },
  emptyTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
  },
  skeletonLabel: {
    width: 82,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonBadge: {
    width: 118,
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonCalories: {
    width: '64%',
    height: 38,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonCaloriesLabel: {
    width: '34%',
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMacro: {
    flex: 1,
    height: 68,
    borderRadius: 18,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMeal: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonFocusLabel: {
    width: 86,
    height: 12,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonFocusText: {
    width: '78%',
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
});
