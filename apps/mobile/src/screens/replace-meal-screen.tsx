import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Meal, MealOption, TodayNutrition } from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type ReplacementReason =
  | 'Food unavailable'
  | 'Restaurant meal'
  | 'Allergy'
  | 'Preference'
  | 'Travel'
  | 'Budget'
  | 'No time'
  | 'Other';

type RankedAlternative = {
  option: MealOption;
  score: number;
  prepTimeLabel: string;
};

type ReplaceMealModel = {
  meal: Meal;
  alternatives: RankedAlternative[];
};

const REPLACEMENT_REASONS: ReplacementReason[] = [
  'Food unavailable',
  'Restaurant meal',
  'Allergy',
  'Preference',
  'Travel',
  'Budget',
  'No time',
  'Other',
];

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#eef2f7',
  surface: '#f8fafc',
  selectedSurface: '#ecfdf5',
  selectedBorder: '#22c55e',
  success: '#166534',
  danger: '#991b1b',
  skeletonSoft: '#f7f9fc',
} as const;

export function ReplaceMealScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReplaceMeal'>>();
  const { mealId } = route.params;
  const [todayNutrition, setTodayNutrition] = useState<TodayNutrition | null>(
    null,
  );
  const [selectedReason, setSelectedReason] =
    useState<ReplacementReason>('Food unavailable');
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const returnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const response = await apiClient.nutrition.getTodayNutrition();
      setTodayNutrition(response.todayNutrition);
    } catch (error) {
      if (isNutritionEmptyState(error)) {
        setTodayNutrition(null);
      } else {
        setErrorMessage(getReplaceMealErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();

    return () => {
      if (returnTimeout.current) {
        clearTimeout(returnTimeout.current);
      }
    };
  }, [load]);

  const model = useMemo(
    () =>
      todayNutrition
        ? buildReplaceMealModel({
            mealId,
            reason: selectedReason,
            todayNutrition,
          })
        : null,
    [mealId, selectedReason, todayNutrition],
  );

  const selectedAlternative = useMemo(() => {
    if (!model) {
      return null;
    }

    return (
      model.alternatives.find(
        (alternative) => alternative.option.id === selectedAlternativeId,
      ) ??
      model.alternatives[0] ??
      null
    );
  }, [model, selectedAlternativeId]);

  useEffect(() => {
    if (!model?.alternatives.length) {
      setSelectedAlternativeId(null);
      return;
    }

    if (
      !selectedAlternativeId ||
      !model.alternatives.some(
        (alternative) => alternative.option.id === selectedAlternativeId,
      )
    ) {
      setSelectedAlternativeId(model.alternatives[0].option.id);
    }
  }, [model, selectedAlternativeId]);

  const handleKeepOriginal = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    if (!model || !selectedAlternative || isSaving || isSaved) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await apiClient.nutrition.replaceMeal(model.meal.id, {
        reason: `${selectedReason}: preferred replacement ${selectedAlternative.option.title}`,
      });
      setIsSaved(true);
      returnTimeout.current = setTimeout(() => {
        navigation.navigate('TodaysMeals');
      }, 700);
    } catch (error) {
      setSaveError(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaved,
    isSaving,
    model,
    navigation,
    selectedAlternative,
    selectedReason,
  ]);

  if (isLoading) {
    return <ReplaceMealSkeleton />;
  }

  if (errorMessage) {
    return (
      <ReplaceMealStateView
        title="Unable to load meal alternatives."
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  }

  if (!model || model.alternatives.length === 0 || !selectedAlternative) {
    return (
      <ReplaceMealStateView
        title="No suitable replacement available."
        message="Your current meal remains the best option today."
        actionLabel="Keep Original Meal"
        onAction={handleKeepOriginal}
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
        <CurrentMealCard meal={model.meal} />
        <ReasonSelector
          onSelect={setSelectedReason}
          selectedReason={selectedReason}
        />
        <AlternativesSection
          alternatives={model.alternatives}
          onSelect={setSelectedAlternativeId}
          selectedAlternativeId={selectedAlternative.option.id}
        />
        <CoachExplanation
          alternative={selectedAlternative}
          currentMeal={model.meal}
          reason={selectedReason}
        />
        <NutritionComparison
          currentMeal={model.meal}
          replacement={selectedAlternative.option}
        />
        <Confirmation
          errorMessage={saveError}
          isSaved={isSaved}
          isSaving={isSaving}
          onConfirm={handleConfirm}
          onKeepOriginal={handleKeepOriginal}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const CurrentMealCard = memo(function CurrentMealCard({
  meal,
}: {
  meal: Meal;
}) {
  return (
    <View
      accessibilityLabel={`${meal.title}. ${Math.round(
        meal.estimatedMacros.calories,
      )} calories. ${Math.round(meal.estimatedMacros.proteinGrams)} grams protein.`}
      style={styles.hero}
    >
      <Text style={styles.eyebrow}>CURRENT MEAL</Text>
      <Text style={styles.heroTitle}>{meal.title}</Text>
      <Text style={styles.heroMessage}>{meal.description}</Text>
      <View style={styles.summaryRow}>
        <MacroPill
          label={`${Math.round(meal.estimatedMacros.calories)} kcal`}
        />
        <MacroPill
          label={`${Math.round(meal.estimatedMacros.proteinGrams)}g protein`}
        />
        <MacroPill
          label={`${Math.round(meal.estimatedMacros.carbsGrams)}g carbs`}
        />
        <MacroPill
          label={`${Math.round(meal.estimatedMacros.fatGrams)}g fat`}
        />
      </View>
      <Text style={styles.statusText}>
        Status: {formatMealStatus(meal.status)}
      </Text>
    </View>
  );
});

const ReasonSelector = memo(function ReasonSelector({
  onSelect,
  selectedReason,
}: {
  selectedReason: ReplacementReason;
  onSelect: (reason: ReplacementReason) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>WHY REPLACE?</Text>
      <View style={styles.reasonGrid}>
        {REPLACEMENT_REASONS.map((reason) => {
          const isSelected = reason === selectedReason;

          return (
            <Pressable
              accessibilityLabel={reason}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={reason}
              onPress={() => onSelect(reason)}
              style={({ pressed }) => [
                styles.reasonCard,
                isSelected ? styles.reasonCardSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.reasonText,
                  isSelected ? styles.reasonTextSelected : null,
                ]}
              >
                {reason}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const AlternativesSection = memo(function AlternativesSection({
  alternatives,
  onSelect,
  selectedAlternativeId,
}: {
  alternatives: RankedAlternative[];
  selectedAlternativeId: string;
  onSelect: (alternativeId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>RECOMMENDED ALTERNATIVES</Text>
      <View style={styles.alternativeList}>
        {alternatives.map((alternative) => {
          const isSelected = alternative.option.id === selectedAlternativeId;

          return (
            <Pressable
              accessibilityLabel={`${alternative.option.title}. ${Math.round(
                alternative.option.estimatedMacros.calories,
              )} calories. ${Math.round(
                alternative.option.estimatedMacros.proteinGrams,
              )} grams protein. Recommended replacement.`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={alternative.option.id}
              onPress={() => onSelect(alternative.option.id)}
              style={({ pressed }) => [
                styles.alternativeCard,
                isSelected ? styles.alternativeCardSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.alternativeHeader}>
                <View style={styles.alternativeTitleGroup}>
                  <Text style={styles.alternativeTitle}>
                    {alternative.option.title}
                  </Text>
                  <Text numberOfLines={2} style={styles.alternativeDescription}>
                    {alternative.option.reason}
                  </Text>
                </View>
                <Text style={styles.matchScore}>
                  {Math.round(alternative.score)}%
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <MacroPill
                  label={`${Math.round(
                    alternative.option.estimatedMacros.calories,
                  )} kcal`}
                />
                <MacroPill
                  label={`${Math.round(
                    alternative.option.estimatedMacros.proteinGrams,
                  )}g protein`}
                />
                <MacroPill label={alternative.prepTimeLabel} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const CoachExplanation = memo(function CoachExplanation({
  alternative,
  currentMeal,
  reason,
}: {
  currentMeal: Meal;
  alternative: RankedAlternative;
  reason: ReplacementReason;
}) {
  const explanation = getCoachExplanation(
    currentMeal,
    alternative.option,
    reason,
  );

  return (
    <View
      accessibilityLabel={`Coach explanation. ${explanation}`}
      style={styles.card}
    >
      <Text style={styles.sectionLabel}>COACH EXPLANATION</Text>
      <Text style={styles.coachText}>{explanation}</Text>
    </View>
  );
});

const NutritionComparison = memo(function NutritionComparison({
  currentMeal,
  replacement,
}: {
  currentMeal: Meal;
  replacement: MealOption;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>NUTRITION COMPARISON</Text>
      <View style={styles.comparisonColumns}>
        <ComparisonColumn
          label="Current"
          macros={currentMeal.estimatedMacros}
          title={currentMeal.title}
        />
        <Text style={styles.arrow}>↓</Text>
        <ComparisonColumn
          label="Replacement"
          macros={replacement.estimatedMacros}
          title={replacement.title}
        />
      </View>
    </View>
  );
});

const Confirmation = memo(function Confirmation({
  errorMessage,
  isSaved,
  isSaving,
  onConfirm,
  onKeepOriginal,
}: {
  errorMessage: string | null;
  isSaved: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onKeepOriginal: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>CONFIRM</Text>
      {isSaved ? (
        <View
          accessibilityLabel="Meal updated successfully."
          style={styles.successBox}
        >
          <Text style={styles.successText}>Meal updated successfully.</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          accessibilityLabel="Use this meal"
          disabled={isSaved}
          label="Use This Meal"
          loading={isSaving}
          onPress={onConfirm}
        />
        <Button
          accessibilityLabel="Keep original meal"
          label="Keep Original Meal"
          onPress={onKeepOriginal}
          variant="ghost"
        />
      </View>
    </View>
  );
});

function MacroPill({ label }: { label: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryValue}>{label}</Text>
    </View>
  );
}

function ComparisonColumn({
  label,
  macros,
  title,
}: {
  label: string;
  title: string;
  macros: Meal['estimatedMacros'];
}) {
  return (
    <View style={styles.comparisonColumn}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.comparisonTitle}>
        {title}
      </Text>
      <View style={styles.comparisonMetricGrid}>
        <ComparisonMetric
          label="Calories"
          value={`${Math.round(macros.calories)} kcal`}
        />
        <ComparisonMetric
          label="Protein"
          value={`${Math.round(macros.proteinGrams)}g`}
        />
        <ComparisonMetric
          label="Carbs"
          value={`${Math.round(macros.carbsGrams)}g`}
        />
        <ComparisonMetric
          label="Fat"
          value={`${Math.round(macros.fatGrams)}g`}
        />
      </View>
    </View>
  );
}

function ComparisonMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.comparisonMetric}>
      <Text style={styles.comparisonMetricValue}>{value}</Text>
      <Text style={styles.comparisonMetricLabel}>{label}</Text>
    </View>
  );
}

function ReplaceMealSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading meal alternatives"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCardSmall} />
      </View>
    </SafeAreaView>
  );
}

function ReplaceMealStateView({
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

function buildReplaceMealModel(input: {
  mealId: string;
  todayNutrition: TodayNutrition;
  reason: ReplacementReason;
}): ReplaceMealModel | null {
  const meal = input.todayNutrition.meals.find(
    (candidate) => candidate.id === input.mealId,
  );

  if (!meal) {
    return null;
  }

  return {
    meal,
    alternatives: rankAlternatives(meal, input.reason),
  };
}

function rankAlternatives(
  meal: Meal,
  reason: ReplacementReason,
): RankedAlternative[] {
  return [...meal.alternatives]
    .map((option) => ({
      option,
      score:
        getMacroSimilarityScore(meal, option) + getReasonScore(option, reason),
      prepTimeLabel: getPrepTimeLabel(option, reason),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.option.title.localeCompare(right.option.title);
    })
    .slice(0, 4);
}

function getMacroSimilarityScore(meal: Meal, option: MealOption): number {
  const current = meal.estimatedMacros;
  const next = option.estimatedMacros;
  const calorieScore = getSimilarity(current.calories, next.calories);
  const proteinScore = getSimilarity(current.proteinGrams, next.proteinGrams);
  const carbsScore = getSimilarity(current.carbsGrams, next.carbsGrams);
  const fatScore = getSimilarity(current.fatGrams, next.fatGrams);

  return Math.round(
    calorieScore * 0.35 +
      proteinScore * 0.35 +
      carbsScore * 0.15 +
      fatScore * 0.15,
  );
}

function getSimilarity(current: number, replacement: number): number {
  if (current <= 0) {
    return 100;
  }

  const difference = Math.abs(current - replacement) / current;

  return Math.max(0, 100 - difference * 100);
}

function getReasonScore(option: MealOption, reason: ReplacementReason): number {
  const descriptor = `${option.title} ${option.reason} ${option.foodItems
    .map((item) => item.tags.join(' '))
    .join(' ')}`.toLowerCase();

  switch (reason) {
    case 'No time':
    case 'Travel':
      return descriptor.includes('quick') || descriptor.includes('simple')
        ? 8
        : 0;
    case 'Budget':
      return descriptor.includes('budget') || descriptor.includes('simple')
        ? 8
        : 0;
    case 'Restaurant meal':
      return descriptor.includes('restaurant') || descriptor.includes('wrap')
        ? 8
        : 0;
    case 'Allergy':
      return descriptor.includes('allergy') ? 8 : 0;
    case 'Preference':
    case 'Food unavailable':
    case 'Other':
    default:
      return 0;
  }
}

function getPrepTimeLabel(
  option: MealOption,
  reason: ReplacementReason,
): string {
  if (reason === 'No time' || reason === 'Travel') {
    return '8 minutes';
  }

  const itemCount = option.foodItems.length;

  if (itemCount <= 2) {
    return '10 minutes';
  }

  if (itemCount <= 4) {
    return '15 minutes';
  }

  return '20 minutes';
}

function getCoachExplanation(
  currentMeal: Meal,
  replacement: MealOption,
  reason: ReplacementReason,
): string {
  const proteinDifference = Math.abs(
    currentMeal.estimatedMacros.proteinGrams -
      replacement.estimatedMacros.proteinGrams,
  );

  if (reason === 'No time' || reason === 'Travel') {
    return 'This replacement maintains your protein target while reducing preparation time.';
  }

  if (reason === 'Food unavailable' || reason === 'Budget') {
    return 'This option better matches what may be available today while keeping your plan aligned.';
  }

  if (proteinDifference <= 10) {
    return "This meal keeps your protein target close to today's original plan.";
  }

  return "This meal keeps your recovery nutrition aligned with today's goals.";
}

function formatMealStatus(status: Meal['status']): string {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'replaced':
      return 'Replaced';
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

function getReplaceMealErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load meal alternatives.';
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to update meal.';
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
  eyebrow: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 4,
  },
  summaryPill: {
    borderRadius: 999,
    backgroundColor: tokens.surface,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  summaryValue: {
    color: tokens.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  statusText: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
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
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonCard: {
    minHeight: 58,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reasonCardSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.selectedSurface,
  },
  reasonText: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  reasonTextSelected: {
    color: tokens.text,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  alternativeList: {
    gap: 12,
  },
  alternativeCard: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  alternativeCardSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.selectedSurface,
  },
  alternativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  alternativeTitleGroup: {
    flex: 1,
    gap: 5,
  },
  alternativeTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  alternativeDescription: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  matchScore: {
    color: tokens.success,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
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
  coachText: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '800',
  },
  comparisonColumns: {
    gap: 12,
  },
  comparisonColumn: {
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  comparisonLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  comparisonTitle: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  comparisonMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  comparisonMetric: {
    width: '47%',
    gap: 3,
  },
  comparisonMetricValue: {
    color: tokens.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  comparisonMetricLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  arrow: {
    color: tokens.tertiaryText,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  successBox: {
    borderRadius: 18,
    backgroundColor: tokens.selectedSurface,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  successText: {
    color: tokens.success,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  errorBox: {
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  errorText: {
    color: tokens.danger,
    fontSize: 14,
    lineHeight: 20,
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
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 156,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 154,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCardSmall: {
    height: 118,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
