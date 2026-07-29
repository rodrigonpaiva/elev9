import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  Meal,
  MealLogStatus,
  NutritionRecommendation,
  NutritionReadModel,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type CompletionOption = {
  id: 'completed' | 'partial' | 'skipped' | 'customized';
  label: string;
  description: string;
  feedback: string;
};

type LogMealModel = {
  meal: Meal;
  caloriesLabel: string;
  proteinLabel: string;
  feedback: string;
};

type AnalyticsEvent =
  | 'meal_log_started'
  | 'meal_completed'
  | 'meal_partial'
  | 'meal_skipped'
  | 'meal_customized'
  | 'meal_log_saved';

const COMPLETION_OPTIONS: CompletionOption[] = [
  {
    id: 'completed',
    label: 'Completed',
    description: 'Meal eaten as planned.',
    feedback: 'Great consistency.',
  },
  {
    id: 'partial',
    label: 'Partially Completed',
    description: 'Only part of the meal was eaten.',
    feedback: 'Try to complete your protein target later today.',
  },
  {
    id: 'skipped',
    label: 'Skipped',
    description: 'Meal not eaten.',
    feedback: 'Your next meal becomes more important.',
  },
  {
    id: 'customized',
    label: 'Customized',
    description: 'You ate something different.',
    feedback: "Your coach will adapt today's nutrition guidance.",
  },
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

export function LogMealScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LogMeal'>>();
  const { mealId } = route.params;
  const [todayNutrition, setTodayNutrition] = useState<NutritionReadModel | null>(
    null,
  );
  const [recommendations, setRecommendations] = useState<
    NutritionRecommendation[]
  >([]);
  const [selectedStatus, setSelectedStatus] =
    useState<CompletionOption['id']>('completed');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setErrorMessage(getLogMealErrorMessage(todayResult.reason));
    }

    setRecommendations(
      recommendationsResult.status === 'fulfilled'
        ? recommendationsResult.value.recommendations
        : [],
    );
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    trackMealLogEvent('meal_log_started', { mealId });
    void load();

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [load, mealId]);

  const selectedOption = useMemo(
    () =>
      COMPLETION_OPTIONS.find((option) => option.id === selectedStatus) ??
      COMPLETION_OPTIONS[0],
    [selectedStatus],
  );

  const model = useMemo(
    () =>
      todayNutrition
        ? buildLogMealModel({
            mealId,
            recommendations,
            selectedOption,
            todayNutrition,
          })
        : null,
    [mealId, recommendations, selectedOption, todayNutrition],
  );

  const handleSelectStatus = useCallback((status: CompletionOption['id']) => {
    setSelectedStatus(status);
    setSaveError(null);
    trackMealLogEvent(getStatusAnalyticsEvent(status));
  }, []);

  const handleSave = useCallback(async () => {
    if (!model || isSaving || isSaved) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await apiClient.nutrition.logMeal({
        mealId: model.meal.id,
        status: toMealLogStatus(selectedStatus),
      });
      trackMealLogEvent('meal_log_saved', {
        mealId: model.meal.id,
        noteLength: notes.trim().length,
        status: selectedStatus,
      });
      setIsSaved(true);
      saveTimeout.current = setTimeout(() => {
        navigation.navigate('TodaysMeals');
      }, 700);
    } catch (error) {
      setSaveError(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [isSaved, isSaving, model, navigation, notes, selectedStatus]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isLoading) {
    return <LogMealSkeleton />;
  }

  if (errorMessage || !model) {
    return (
      <LogMealStateView
        title="Unable to load meal."
        actionLabel="Back to Today's Meals"
        onAction={() => navigation.navigate('TodaysMeals')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
      >
        <MealSummary model={model} />
        <CompletionStatus
          onSelect={handleSelectStatus}
          selectedStatus={selectedStatus}
        />
        <NotesField notes={notes} onChangeNotes={setNotes} />
        <CoachFeedback feedback={model.feedback} />
        <Confirmation
          errorMessage={saveError}
          isSaved={isSaved}
          isSaving={isSaving}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const MealSummary = memo(function MealSummary({
  model,
}: {
  model: LogMealModel;
}) {
  return (
    <View
      accessibilityLabel={`${model.meal.title}. ${model.caloriesLabel}. ${model.proteinLabel}.`}
      style={styles.hero}
    >
      <Text style={styles.eyebrow}>{formatMealType(model.meal.type)}</Text>
      <Text style={styles.heroTitle}>{model.meal.title}</Text>
      <Text style={styles.heroMessage}>{model.meal.description}</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryValue}>{model.caloriesLabel}</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryValue}>{model.proteinLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const CompletionStatus = memo(function CompletionStatus({
  onSelect,
  selectedStatus,
}: {
  selectedStatus: CompletionOption['id'];
  onSelect: (status: CompletionOption['id']) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>COMPLETION STATUS</Text>
      <View style={styles.optionList}>
        {COMPLETION_OPTIONS.map((option) => {
          const isSelected = option.id === selectedStatus;

          return (
            <Pressable
              accessibilityLabel={`${option.label}. ${option.description}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected ? styles.optionCardSelected : null,
                pressed ? styles.optionCardPressed : null,
              ]}
            >
              <View style={styles.optionDotOuter}>
                {isSelected ? <View style={styles.optionDotInner} /> : null}
              </View>
              <View style={styles.optionTextGroup}>
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const NotesField = memo(function NotesField({
  notes,
  onChangeNotes,
}: {
  notes: string;
  onChangeNotes: (notes: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>OPTIONAL NOTES</Text>
      <TextInput
        accessibilityLabel="Optional meal notes"
        maxLength={150}
        multiline
        onChangeText={onChangeNotes}
        placeholder="Anything worth remembering?"
        placeholderTextColor={tokens.tertiaryText}
        style={styles.notesInput}
        textAlignVertical="top"
        value={notes}
      />
      <Text style={styles.characterCount}>{notes.length}/150</Text>
    </View>
  );
});

const CoachFeedback = memo(function CoachFeedback({
  feedback,
}: {
  feedback: string;
}) {
  return (
    <View
      accessibilityLabel={`Coach feedback preview. ${feedback}`}
      style={styles.card}
    >
      <Text style={styles.sectionLabel}>COACH FEEDBACK PREVIEW</Text>
      <Text style={styles.feedbackText}>{feedback}</Text>
    </View>
  );
});

const Confirmation = memo(function Confirmation({
  errorMessage,
  isSaved,
  isSaving,
  onCancel,
  onSave,
}: {
  errorMessage: string | null;
  isSaved: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>CONFIRMATION</Text>
      {isSaved ? (
        <View
          accessibilityLabel="Meal logged successfully."
          style={styles.successBox}
        >
          <Text style={styles.successText}>Meal logged successfully.</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View accessibilityLabel="Unable to save meal." style={styles.errorBox}>
          <Text style={styles.errorText}>Unable to save meal.</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          accessibilityLabel="Save Meal Log"
          disabled={isSaved}
          label="Save Meal Log"
          loading={isSaving}
          onPress={onSave}
        />
        <Button
          accessibilityLabel="Cancel meal log"
          label="Cancel"
          onPress={onCancel}
          variant="ghost"
        />
      </View>
    </View>
  );
});

function LogMealSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading meal log"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonCard} />
      </View>
    </SafeAreaView>
  );
}

function LogMealStateView({
  actionLabel,
  onAction,
  title,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={title} style={styles.state}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.fullButton}
        />
      </View>
    </SafeAreaView>
  );
}

function buildLogMealModel(input: {
  mealId: string;
  todayNutrition: NutritionReadModel;
  recommendations: NutritionRecommendation[];
  selectedOption: CompletionOption;
}): LogMealModel | null {
  const meal = input.todayNutrition.meals.find(
    (candidate) => candidate.id === input.mealId,
  );

  if (!meal) {
    return null;
  }

  return {
    meal,
    caloriesLabel: `${Math.round(meal.estimatedMacros.calories)} kcal`,
    proteinLabel: `${Math.round(meal.estimatedMacros.proteinGrams)}g protein`,
    feedback: getCoachFeedback(input.selectedOption, input.recommendations),
  };
}

function getCoachFeedback(
  selectedOption: CompletionOption,
  recommendations: NutritionRecommendation[],
): string {
  const recommendation = recommendations
    .flatMap((item) => item.recommendations)
    .find((item) => item.trim().length > 0);

  return recommendation?.trim() ?? selectedOption.feedback;
}

function toMealLogStatus(status: CompletionOption['id']): MealLogStatus {
  switch (status) {
    case 'completed':
      return 'consumed';
    case 'skipped':
      return 'skipped';
    case 'customized':
    case 'partial':
      return 'partial';
  }
}

function getStatusAnalyticsEvent(
  status: CompletionOption['id'],
): AnalyticsEvent {
  switch (status) {
    case 'completed':
      return 'meal_completed';
    case 'partial':
      return 'meal_partial';
    case 'skipped':
      return 'meal_skipped';
    case 'customized':
      return 'meal_customized';
  }
}

function trackMealLogEvent(
  _event: AnalyticsEvent,
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
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

function getLogMealErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load meal.';
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Try again in a moment.';
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
    textTransform: 'uppercase',
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
  optionList: {
    gap: 12,
  },
  optionCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  optionCardSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.selectedSurface,
  },
  optionCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  optionDotOuter: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: tokens.selectedBorder,
  },
  optionDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.selectedBorder,
  },
  optionTextGroup: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  optionDescription: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
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
  notesInput: {
    minHeight: 112,
    color: tokens.text,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  characterCount: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  feedbackText: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '800',
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
    gap: 4,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  errorText: {
    color: tokens.danger,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  errorMessage: {
    color: tokens.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
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
  skeletonContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 142,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonOption: {
    height: 88,
    borderRadius: 24,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 154,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
