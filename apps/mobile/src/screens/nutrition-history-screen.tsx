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
  NutritionPlan,
  NutritionRecommendation,
  TodayNutrition,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type NutritionHistoryState = {
  nutritionPlan: NutritionPlan | null;
  todayNutrition: TodayNutrition | null;
  recommendations: NutritionRecommendation[];
};

type TimelineStatus = 'Completed' | 'Next' | 'Planned' | 'Replaced';
type BadgeVariant = 'primary' | 'muted' | 'danger';

type TimelineItem = {
  id: string;
  meal: Meal;
  date: string;
  dateLabel: string;
  status: TimelineStatus;
  badgeVariant: BadgeVariant;
  coachNote: string;
  accessibilityLabel: string;
};

type HistoryModel = {
  streakTitle: string;
  streakSubtitle: string;
  summary: Array<{
    label: string;
    value: string;
  }>;
  timeline: TimelineItem[];
  monthlyInsight: string;
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
  skeletonSoft: '#f7f9fc',
} as const;

export function NutritionHistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<NutritionHistoryState>({
    nutritionPlan: null,
    recommendations: [],
    todayNutrition: null,
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

    const [planResult, todayResult, recommendationsResult] =
      await Promise.allSettled([
        apiClient.nutrition.getCurrentNutritionPlan(),
        apiClient.nutrition.getTodayNutrition(),
        apiClient.nutrition.getNutritionRecommendations({ limit: 3 }),
      ]);

    const nutritionPlan =
      planResult.status === 'fulfilled' ? planResult.value.nutritionPlan : null;
    const todayNutrition =
      todayResult.status === 'fulfilled'
        ? todayResult.value.todayNutrition
        : null;
    const recommendations =
      recommendationsResult.status === 'fulfilled'
        ? recommendationsResult.value.recommendations
        : [];

    if (
      planResult.status === 'rejected' &&
      !isNutritionEmptyState(planResult.reason)
    ) {
      setErrorMessage(getHistoryErrorMessage(planResult.reason));
    }

    setState({
      nutritionPlan,
      recommendations,
      todayNutrition,
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      trackNutritionHistoryEvent('nutrition_history_opened');
      void load();
    }, [load]),
  );

  const model = useMemo(
    () =>
      state.nutritionPlan || state.todayNutrition
        ? buildHistoryModel(state)
        : null,
    [state],
  );

  const handleOpenMeal = useCallback(
    (mealId: string) => {
      trackNutritionHistoryEvent('nutrition_entry_selected', { mealId });
      navigation.navigate('MealDetail', { mealId });
    },
    [navigation],
  );

  const handleTodaysMeals = useCallback(() => {
    navigation.navigate('TodaysMeals');
  }, [navigation]);

  const handleNutritionPlan = useCallback(() => {
    navigation.navigate('NutritionPlan');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleRecommendations = useCallback(() => {
    navigation.navigate('NutritionRecommendations');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: TimelineItem }) => (
      <TimelineCard item={item} onPress={handleOpenMeal} />
    ),
    [handleOpenMeal],
  );

  if (isLoading) {
    return <NutritionHistorySkeleton />;
  }

  if (errorMessage) {
    return (
      <NutritionHistoryStateView
        title="Unable to load nutrition history."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (!model || model.timeline.length === 0) {
    return (
      <NutritionHistoryStateView
        title="No nutrition history yet."
        message="Log your meals to start building your nutrition journey."
        actionLabel="View Today's Meals"
        onAction={handleTodaysMeals}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={model.timeline}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={TimelineSeparator}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
        ListHeaderComponent={<HistoryHeader model={model} />}
        ListFooterComponent={
          <HistoryFooter
            monthlyInsight={model.monthlyInsight}
            onNutritionPlan={handleNutritionPlan}
            onOpenCoach={handleOpenCoach}
            onRecommendations={handleRecommendations}
            onTodaysMeals={handleTodaysMeals}
          />
        }
        onEndReached={() =>
          trackNutritionHistoryEvent('nutrition_timeline_scrolled')
        }
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const HistoryHeader = memo(function HistoryHeader({
  model,
}: {
  model: HistoryModel;
}) {
  return (
    <View style={styles.header}>
      <View
        accessibilityLabel={`${model.streakTitle}. ${model.streakSubtitle}`}
        style={styles.hero}
      >
        <Text style={styles.eyebrow}>NUTRITION HISTORY</Text>
        <Text style={styles.heroTitle}>{model.streakTitle}</Text>
        <Text style={styles.heroMessage}>{model.streakSubtitle}</Text>
      </View>

      <View style={styles.metricGrid}>
        {model.summary.map((metric) => (
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

      <Text style={styles.sectionLabel}>NUTRITION TIMELINE</Text>
    </View>
  );
});

const TimelineCard = memo(function TimelineCard({
  item,
  onPress,
}: {
  item: TimelineItem;
  onPress: (mealId: string) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPress(item.meal.id)}
      style={({ pressed }) => [
        styles.timelineCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.timelineTopRow}>
        <Text style={styles.timelineDate}>{item.dateLabel}</Text>
        <Badge label={item.status} variant={item.badgeVariant} />
      </View>
      <Text style={styles.mealTitle}>{item.meal.title}</Text>
      <Text numberOfLines={1} style={styles.coachPreview}>
        {item.coachNote}
      </Text>
    </Pressable>
  );
});

function TimelineSeparator() {
  return <View style={styles.timelineSeparator} />;
}

const HistoryFooter = memo(function HistoryFooter({
  monthlyInsight,
  onNutritionPlan,
  onOpenCoach,
  onRecommendations,
  onTodaysMeals,
}: {
  monthlyInsight: string;
  onTodaysMeals: () => void;
  onNutritionPlan: () => void;
  onOpenCoach: () => void;
  onRecommendations: () => void;
}) {
  return (
    <View style={styles.footer}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>MONTHLY INSIGHT</Text>
        <Text style={styles.insightText}>{monthlyInsight}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actions}>
          <Button
            label="Today's Meals"
            onPress={onTodaysMeals}
            variant="ghost"
          />
          <Button
            label="Nutrition Plan"
            onPress={onNutritionPlan}
            variant="ghost"
          />
          <Button
            label="Recommendations"
            onPress={onRecommendations}
            variant="ghost"
          />
          <Button label="Open Coach" onPress={onOpenCoach} variant="ghost" />
        </View>
      </View>
    </View>
  );
});

function NutritionHistorySkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading nutrition history"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.metricGrid}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
        </View>
        <View style={styles.skeletonTimeline} />
        <View style={styles.skeletonTimeline} />
        <View style={styles.skeletonTimeline} />
      </View>
    </SafeAreaView>
  );
}

function NutritionHistoryStateView({
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

function buildHistoryModel(state: NutritionHistoryState): HistoryModel {
  const timeline = buildTimeline(state);
  const completedCount = timeline.filter(
    (item) => item.status === 'Completed',
  ).length;
  const skippedCount = 0;
  const completionRate =
    timeline.length > 0
      ? Math.round((completedCount / timeline.length) * 100)
      : 0;
  const adherence = Math.round(
    state.todayNutrition?.progress.adherencePercentage ?? completionRate,
  );

  return {
    streakTitle:
      completedCount > 0
        ? `${completedCount} Consecutive Meals Logged`
        : `${adherence}% On Track`,
    streakSubtitle: 'Consistency drives long-term results.',
    summary: [
      { label: 'Meals Logged', value: String(completedCount) },
      { label: 'Completion Rate', value: `${completionRate}%` },
      { label: 'Skipped Meals', value: String(skippedCount) },
      { label: 'Average Adherence', value: `${adherence}%` },
    ],
    timeline,
    monthlyInsight: getMonthlyInsight(state, completionRate),
  };
}

function buildTimeline(state: NutritionHistoryState): TimelineItem[] {
  const todayNutrition = state.todayNutrition;
  const todayItems = todayNutrition
    ? todayNutrition.meals.map((meal) =>
        buildTimelineItem({
          date: todayNutrition.date,
          meal,
          status: getTodayMealStatus(meal, todayNutrition),
        }),
      )
    : [];
  const replacementItems =
    state.nutritionPlan?.days.flatMap((day) =>
      day.meals
        .filter((meal) => meal.status === 'replaced')
        .map((meal) =>
          buildTimelineItem({
            date: day.date,
            meal,
            status: 'Replaced',
          }),
        ),
    ) ?? [];
  const combined = [...todayItems, ...replacementItems];
  const unique = new Map<string, TimelineItem>();

  combined.forEach((item) => {
    unique.set(item.id, item);
  });

  return [...unique.values()].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
}

function buildTimelineItem(input: {
  date: string;
  meal: Meal;
  status: TimelineStatus;
}): TimelineItem {
  return {
    id: `${input.date}-${input.meal.id}`,
    meal: input.meal,
    date: input.date,
    dateLabel: formatTimelineDate(input.date),
    status: input.status,
    badgeVariant: getBadgeVariant(input.status),
    coachNote: getCoachNote(input.status, input.meal),
    accessibilityLabel: `${input.meal.title} ${input.status.toLowerCase()} ${formatTimelineDate(
      input.date,
    )}. ${getCoachNote(input.status, input.meal)}`,
  };
}

function getTodayMealStatus(
  meal: Meal,
  nutrition: TodayNutrition,
): TimelineStatus {
  if (meal.status === 'replaced') {
    return 'Replaced';
  }

  if (nutrition.nextMeal?.id === meal.id) {
    return 'Next';
  }

  const nextMealIndex = nutrition.nextMeal
    ? nutrition.meals.findIndex((item) => item.id === nutrition.nextMeal?.id)
    : -1;
  const mealIndex = nutrition.meals.findIndex((item) => item.id === meal.id);

  if (nextMealIndex === -1 || (mealIndex >= 0 && mealIndex < nextMealIndex)) {
    return 'Completed';
  }

  return 'Planned';
}

function getBadgeVariant(status: TimelineStatus): BadgeVariant {
  switch (status) {
    case 'Completed':
    case 'Next':
      return 'primary';
    case 'Planned':
    case 'Replaced':
      return 'muted';
  }
}

function getCoachNote(status: TimelineStatus, meal: Meal): string {
  switch (status) {
    case 'Completed':
      return 'Protein target achieved.';
    case 'Next':
      return 'This meal is the next consistency opportunity.';
    case 'Replaced':
      return 'Your plan adapted around real life.';
    case 'Planned':
      return `${formatMealType(meal.type)} is still planned.`;
  }
}

function getMonthlyInsight(
  state: NutritionHistoryState,
  completionRate: number,
): string {
  const recommendation = state.recommendations
    .flatMap((item) => [item.message, ...item.recommendations])
    .find((item) => item.trim().length > 0);

  if (recommendation) {
    return recommendation.trim();
  }

  if (completionRate >= 80) {
    return 'Meal consistency increased this month.';
  }

  if (
    state.todayNutrition &&
    state.todayNutrition.progress.consumedProteinGrams <
      state.todayNutrition.progress.targetProteinGrams
  ) {
    return 'Protein adherence can improve with your next logged meal.';
  }

  return 'Log a few more meals to reveal your nutrition trend.';
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

function formatTimelineDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function trackNutritionHistoryEvent(
  _event:
    | 'nutrition_history_opened'
    | 'nutrition_timeline_scrolled'
    | 'nutrition_entry_selected',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}

function isNutritionEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'NUTRITION_PROFILE_NOT_FOUND',
      'NUTRITION_PLAN_NOT_FOUND',
      'TODAY_NUTRITION_DAY_NOT_FOUND',
    ].includes(error.code)
  );
}

function getHistoryErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load nutrition history.';
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
  header: {
    gap: 22,
    marginBottom: 18,
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
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  timelineCard: {
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  timelineDate: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  mealTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  coachPreview: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  timelineSeparator: {
    height: 14,
  },
  footer: {
    gap: 18,
    paddingTop: 24,
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
  skeletonMetric: {
    width: '48%',
    height: 92,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonTimeline: {
    height: 124,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
