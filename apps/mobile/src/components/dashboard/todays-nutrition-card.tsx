import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  NutritionAction,
  NutritionAvailability,
  TodayNutrition,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import {
  buildNutritionCardModel,
  getActionLabel,
  getAvailabilityMessage,
  getAvailabilityTitle,
  type NutritionCardModel,
} from './todays-nutrition-card-model';

type TodaysNutritionCardProps = {
  todayNutrition: TodayNutrition | null;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onAction: (action: NutritionAction) => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';
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
  onRetry,
  todayNutrition,
  onAction,
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
        accessibilityLabel="Nutrition setup is not available. Open nutrition to continue."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>NUTRITION</Text>
          <Text style={styles.emptyTitle}>Nutrition setup is not ready.</Text>
          <Text style={styles.emptyMessage}>
            Open Nutrition to finish setup and receive daily guidance.
          </Text>
          <Button
            accessibilityLabel="Open nutrition setup"
            label="Open Nutrition"
            onPress={() => onAction({ type: 'open_profile' })}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  if (todayNutrition?.availability !== 'available') {
    return (
      <NutritionAvailabilityState
        action={model.action}
        availability={todayNutrition?.availability ?? 'not_available'}
        onAction={onAction}
        onRetry={onRetry}
        title={getAvailabilityTitle(todayNutrition?.availability)}
        message={getAvailabilityMessage(todayNutrition?.availability)}
      />
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
        <Text style={styles.caloriesLabel}>{model.calorieDetailLabel}</Text>
      </View>

      {model.calorieProgress !== null ? (
        <View
          accessibilityLabel={`Calorie progress ${model.calorieProgress} percent`}
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${model.calorieProgress}%` },
            ]}
          />
        </View>
      ) : null}

      {model.macros.length > 0 ? (
        <View style={styles.macroRow}>
          {model.macros.map((macro) => (
            <View key={macro.label} style={styles.macroItem}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroValue}>{macro.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.mealsSection}>
        <View style={styles.mealMetric}>
          <Text style={styles.mealLabel}>Meals</Text>
          <Text style={styles.mealValue}>{model.mealsLabel}</Text>
        </View>
        <View style={styles.mealDivider} />
        <View style={styles.mealMetric}>
          <Text style={styles.mealLabel}>Next Meal</Text>
          <Text numberOfLines={1} style={styles.mealValue}>
            {model.nextMealLabel ?? 'Not available'}
          </Text>
        </View>
      </View>

      {model.focusMessage ? (
        <View style={styles.focusBox}>
          <Text style={styles.focusLabel}>{model.focusLabel}</Text>
          <Text style={styles.focusText}>{model.focusMessage}</Text>
        </View>
      ) : null}

      {model.freshnessLabel ? (
        <Text
          accessibilityLabel={model.freshnessLabel}
          style={styles.freshness}
        >
          {model.freshnessLabel}
        </Text>
      ) : null}

      <Button
        accessibilityLabel={getActionLabel(model.action)}
        label={getActionLabel(model.action)}
        onPress={() => onAction(model.action)}
        variant="ghost"
        style={styles.primaryButton}
      />
    </View>
  );
});

function NutritionAvailabilityState({
  action,
  availability,
  message,
  onAction,
  onRetry,
  title,
}: {
  action: NutritionAction;
  availability: NutritionAvailability;
  message: string;
  onAction: (action: NutritionAction) => void;
  onRetry: () => void;
  title: string;
}) {
  const canRetry =
    availability === 'not_available' || availability === 'processing_failed';

  return (
    <View accessibilityLabel={`${title}. ${message}`} style={styles.card}>
      <View style={styles.emptyContent}>
        <Text style={styles.label}>NUTRITION</Text>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
        <Button
          accessibilityLabel={getActionLabel(action)}
          label={getActionLabel(action)}
          onPress={() => onAction(action)}
          style={styles.primaryButton}
        />
        {canRetry ? (
          <Button
            accessibilityLabel="Retry loading nutrition data"
            label="Try Again"
            onPress={onRetry}
            style={styles.primaryButton}
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}

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
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: tokens.softBorder,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tokens.text,
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
  freshness: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 17,
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
