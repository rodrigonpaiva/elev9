import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
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
  Meal,
  NutritionDay,
  NutritionPlan,
  NutritionRecommendation,
  TodayNutrition,
} from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type DayStatus = 'completed' | 'active' | 'planned';
type MealStatusLabel = 'Completed' | 'Next' | 'Planned' | 'Replaced';
type BadgeVariant = 'primary' | 'muted' | 'danger';

type NutritionPlanState = {
  nutritionPlan: NutritionPlan | null;
  todayNutrition: TodayNutrition | null;
  recommendations: NutritionRecommendation[];
};

type DayItem = {
  day: NutritionDay;
  label: string;
  status: DayStatus;
  accessibilityLabel: string;
};

type MealItem = {
  meal: Meal;
  status: MealStatusLabel;
  badgeVariant: BadgeVariant;
};

type PlanModel = {
  subtitle: string;
  selectedDay: NutritionDay;
  selectedDayLabel: string;
  days: DayItem[];
  meals: MealItem[];
  targets: Array<{
    label: string;
    value: string;
  }>;
  weeklyFocus: string;
  coachGuidance: string;
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

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
  skeletonSoft: '#f7f9fc',
} as const;

export function NutritionPlanScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<NutritionPlanState>({
    nutritionPlan: null,
    recommendations: [],
    todayNutrition: null,
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { refresh?: boolean }) => {
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
        planResult.status === 'fulfilled'
          ? planResult.value.nutritionPlan
          : null;
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
        setErrorMessage(getPlanErrorMessage(planResult.reason));
      }

      setState({
        nutritionPlan,
        recommendations,
        todayNutrition,
      });

      if (!selectedDate && nutritionPlan) {
        setSelectedDate(getInitialSelectedDate(nutritionPlan, todayNutrition));
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [selectedDate],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const model = useMemo(
    () =>
      state.nutritionPlan
        ? buildPlanModel({
            nutritionPlan: state.nutritionPlan,
            recommendations: state.recommendations,
            selectedDate,
            todayNutrition: state.todayNutrition,
          })
        : null,
    [
      selectedDate,
      state.nutritionPlan,
      state.recommendations,
      state.todayNutrition,
    ],
  );

  const handleSelectDay = useCallback((date: string) => {
    setSelectedDate(date);
    trackNutritionPlanEvent('nutrition_day_changed', { date });
  }, []);

  const handleOpenMeal = useCallback(
    (mealId: string) => {
      trackNutritionPlanEvent('meal_selected', { mealId });
      navigation.navigate('MealDetail', { mealId });
    },
    [navigation],
  );

  const handleOpenTodaysMeals = useCallback(() => {
    navigation.navigate('TodaysMeals');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleRecommendations = useCallback(() => {
    navigation.navigate('NutritionRecommendations');
  }, [navigation]);

  const handleNutritionHistory = useCallback(() => {
    navigation.navigate('NutritionHistory');
  }, [navigation]);

  const handleEditProfile = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'profile' });
  }, [navigation]);

  const handleCreateNutritionProfile = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'profile' });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      trackNutritionPlanEvent('nutrition_plan_opened');
    }, []),
  );

  if (isLoading) {
    return <NutritionPlanSkeleton />;
  }

  if (errorMessage) {
    return (
      <NutritionPlanStateView
        title="Unable to load nutrition plan."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (!model) {
    return (
      <NutritionPlanStateView
        title="No nutrition plan available."
        message="Complete your nutrition profile to generate your personalized weekly plan."
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
        <WeeklyHero subtitle={model.subtitle} />
        <WeeklyCalendar
          days={model.days}
          onSelectDay={handleSelectDay}
          selectedDate={model.selectedDay.date}
        />
        <SelectedDayMeals
          dayLabel={model.selectedDayLabel}
          meals={model.meals}
          onOpenMeal={handleOpenMeal}
        />
        <DailyTargets targets={model.targets} />
        <FocusCard label="WEEKLY FOCUS" text={model.weeklyFocus} />
        <FocusCard label="COACH GUIDANCE" text={model.coachGuidance} />
        <QuickActions
          onEditProfile={handleEditProfile}
          onNutritionHistory={handleNutritionHistory}
          onOpenCoach={handleOpenCoach}
          onRecommendations={handleRecommendations}
          onOpenTodaysMeals={handleOpenTodaysMeals}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const WeeklyHero = memo(function WeeklyHero({
  subtitle,
}: {
  subtitle: string;
}) {
  return (
    <View
      accessibilityLabel={`Nutrition Plan. ${subtitle}`}
      style={styles.hero}
    >
      <Text style={styles.heroTitle}>Nutrition Plan</Text>
      <Text style={styles.heroMessage}>{subtitle}</Text>
    </View>
  );
});

const WeeklyCalendar = memo(function WeeklyCalendar({
  days,
  onSelectDay,
  selectedDate,
}: {
  days: DayItem[];
  selectedDate: string;
  onSelectDay: (date: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>THIS WEEK</Text>
      <FlatList
        data={days}
        horizontal
        keyExtractor={(item) => item.day.date}
        renderItem={({ item }) => (
          <DayButton
            item={item}
            isSelected={item.day.date === selectedDate}
            onPress={onSelectDay}
          />
        )}
        contentContainerStyle={styles.calendarContent}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

const DayButton = memo(function DayButton({
  isSelected,
  item,
  onPress,
}: {
  item: DayItem;
  isSelected: boolean;
  onPress: (date: string) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(item.day.date)}
      style={({ pressed }) => [
        styles.dayButton,
        isSelected ? styles.dayButtonSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[styles.dayLabel, isSelected ? styles.dayLabelSelected : null]}
      >
        {item.label}
      </Text>
      <Text
        style={[styles.dayMeals, isSelected ? styles.dayLabelSelected : null]}
      >
        {item.day.meals.length}
      </Text>
      <View
        style={[
          styles.dayIndicator,
          item.status === 'completed' ? styles.dayIndicatorCompleted : null,
          item.status === 'active' ? styles.dayIndicatorActive : null,
        ]}
      />
    </Pressable>
  );
});

const SelectedDayMeals = memo(function SelectedDayMeals({
  dayLabel,
  meals,
  onOpenMeal,
}: {
  dayLabel: string;
  meals: MealItem[];
  onOpenMeal: (mealId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{dayLabel.toUpperCase()} MEALS</Text>
      <View style={styles.mealList}>
        {meals.map((item) => (
          <MealCard key={item.meal.id} item={item} onOpenMeal={onOpenMeal} />
        ))}
      </View>
    </View>
  );
});

const MealCard = memo(function MealCard({
  item,
  onOpenMeal,
}: {
  item: MealItem;
  onOpenMeal: (mealId: string) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.meal.title}. ${item.status}. ${Math.round(
        item.meal.estimatedMacros.calories,
      )} calories. ${Math.round(item.meal.estimatedMacros.proteinGrams)} grams protein.`}
      accessibilityRole="button"
      onPress={() => onOpenMeal(item.meal.id)}
      style={({ pressed }) => [
        styles.mealCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleGroup}>
          <Text style={styles.mealType}>{formatMealType(item.meal.type)}</Text>
          <Text style={styles.mealTitle}>{item.meal.title}</Text>
        </View>
        <Badge label={item.status} variant={item.badgeVariant} />
      </View>
      <Text numberOfLines={2} style={styles.mealDescription}>
        {item.meal.description}
      </Text>
      <View style={styles.summaryRow}>
        <MacroPill
          label={`${Math.round(item.meal.estimatedMacros.calories)} kcal`}
        />
        <MacroPill
          label={`${Math.round(item.meal.estimatedMacros.proteinGrams)}g protein`}
        />
      </View>
    </Pressable>
  );
});

const DailyTargets = memo(function DailyTargets({
  targets,
}: {
  targets: PlanModel['targets'];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>DAILY TARGETS</Text>
      <View style={styles.metricGrid}>
        {targets.map((target) => (
          <View key={target.label} style={styles.metricCard}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {target.value}
            </Text>
            <Text style={styles.metricLabel}>{target.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const FocusCard = memo(function FocusCard({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <View accessibilityLabel={`${label}. ${text}`} style={styles.card}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.focusText}>{text}</Text>
    </View>
  );
});

const QuickActions = memo(function QuickActions({
  onEditProfile,
  onNutritionHistory,
  onOpenCoach,
  onRecommendations,
  onOpenTodaysMeals,
}: {
  onOpenTodaysMeals: () => void;
  onNutritionHistory: () => void;
  onOpenCoach: () => void;
  onRecommendations: () => void;
  onEditProfile: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={styles.actions}>
        <Button
          label="Today's Meals"
          onPress={onOpenTodaysMeals}
          variant="ghost"
        />
        <Button
          label="History"
          onPress={onNutritionHistory}
          variant="ghost"
          accessibilityLabel="Open nutrition history"
        />
        <Button
          label="Recommendations"
          onPress={onRecommendations}
          variant="ghost"
        />
        <Button
          label="Edit Nutrition Profile"
          onPress={onEditProfile}
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

function NutritionPlanSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading nutrition plan"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonCalendar} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCardSmall} />
      </View>
    </SafeAreaView>
  );
}

function NutritionPlanStateView({
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

function buildPlanModel(input: {
  nutritionPlan: NutritionPlan;
  todayNutrition: TodayNutrition | null;
  recommendations: NutritionRecommendation[];
  selectedDate: string | null;
}): PlanModel | null {
  const selectedDay =
    input.nutritionPlan.days.find((day) => day.date === input.selectedDate) ??
    input.nutritionPlan.days.find(
      (day) => day.date === input.todayNutrition?.date,
    ) ??
    input.nutritionPlan.days[0];

  if (!selectedDay) {
    return null;
  }

  const selectedMeals = selectedDay.meals.map((meal) =>
    buildMealItem(meal, selectedDay.date, input.todayNutrition),
  );
  const dayLabel = getDayLabel(selectedDay.date);

  return {
    subtitle: getHeroSubtitle(input.nutritionPlan, input.recommendations),
    selectedDay,
    selectedDayLabel: dayLabel,
    days: input.nutritionPlan.days.map((day) =>
      buildDayItem(day, input.todayNutrition),
    ),
    meals: selectedMeals,
    targets: [
      {
        label: 'Calories',
        value: `${Math.round(selectedDay.dailyMacroTargets.calories)} kcal`,
      },
      {
        label: 'Protein',
        value: `${Math.round(selectedDay.dailyMacroTargets.proteinGrams)}g`,
      },
      {
        label: 'Carbs',
        value: `${Math.round(selectedDay.dailyMacroTargets.carbsGrams)}g`,
      },
      {
        label: 'Fat',
        value: `${Math.round(selectedDay.dailyMacroTargets.fatGrams)}g`,
      },
    ],
    weeklyFocus: getWeeklyFocus(input.recommendations, input.todayNutrition),
    coachGuidance: getCoachGuidance(
      input.nutritionPlan,
      selectedDay,
      input.todayNutrition,
    ),
  };
}

function buildDayItem(
  day: NutritionDay,
  todayNutrition: TodayNutrition | null,
): DayItem {
  const isToday = day.date === todayNutrition?.date;
  const status = getDayStatus(day, todayNutrition);
  const label = getShortDayLabel(day.date);

  return {
    day,
    label,
    status,
    accessibilityLabel: `${label}. ${isToday ? 'Today. ' : ''}${day.meals.length} meals planned. ${status}.`,
  };
}

function buildMealItem(
  meal: Meal,
  dayDate: string,
  todayNutrition: TodayNutrition | null,
): MealItem {
  const status = getMealStatus(meal, dayDate, todayNutrition);

  return {
    meal,
    status,
    badgeVariant: getBadgeVariant(status),
  };
}

function getDayStatus(
  day: NutritionDay,
  todayNutrition: TodayNutrition | null,
): DayStatus {
  if (day.date === todayNutrition?.date) {
    return 'active';
  }

  const today = todayNutrition?.date ?? new Date().toISOString().slice(0, 10);

  return day.date < today ? 'completed' : 'planned';
}

function getMealStatus(
  meal: Meal,
  dayDate: string,
  todayNutrition: TodayNutrition | null,
): MealStatusLabel {
  if (meal.status === 'replaced') {
    return 'Replaced';
  }

  const todayDate =
    todayNutrition?.date ?? new Date().toISOString().slice(0, 10);

  if (dayDate !== todayDate) {
    return dayDate < todayDate ? 'Completed' : 'Planned';
  }

  if (todayNutrition?.nextMeal?.id === meal.id) {
    return 'Next';
  }

  const nextMealIndex = todayNutrition?.nextMeal
    ? todayNutrition.meals.findIndex(
        (item) => item.id === todayNutrition.nextMeal?.id,
      )
    : -1;
  const mealIndex =
    todayNutrition?.meals.findIndex((item) => item.id === meal.id) ?? -1;

  if (nextMealIndex === -1 || (mealIndex >= 0 && mealIndex < nextMealIndex)) {
    return 'Completed';
  }

  return 'Planned';
}

function getBadgeVariant(status: MealStatusLabel): BadgeVariant {
  switch (status) {
    case 'Completed':
    case 'Next':
      return 'primary';
    case 'Planned':
    case 'Replaced':
      return 'muted';
  }
}

function getInitialSelectedDate(
  nutritionPlan: NutritionPlan,
  todayNutrition: TodayNutrition | null,
): string {
  return (
    nutritionPlan.days.find((day) => day.date === todayNutrition?.date)?.date ??
    nutritionPlan.days[0]?.date ??
    new Date().toISOString().slice(0, 10)
  );
}

function getHeroSubtitle(
  nutritionPlan: NutritionPlan,
  recommendations: NutritionRecommendation[],
): string {
  const recommendationMessage = recommendations.find((item) =>
    item.message.trim(),
  )?.message;

  if (recommendationMessage) {
    return recommendationMessage.trim();
  }

  switch (nutritionPlan.macroTargets.calories > 2400 ? 'muscle' : 'balanced') {
    case 'muscle':
      return 'Your nutrition is aligned with muscle growth.';
    case 'balanced':
    default:
      return 'Balanced nutrition for your current goal.';
  }
}

function getWeeklyFocus(
  recommendations: NutritionRecommendation[],
  todayNutrition: TodayNutrition | null,
): string {
  const recommendation = recommendations
    .flatMap((item) => item.recommendations)
    .find((item) => item.trim().length > 0);

  if (recommendation) {
    return recommendation.trim();
  }

  if (
    todayNutrition &&
    todayNutrition.progress.consumedProteinGrams <
      todayNutrition.progress.targetProteinGrams
  ) {
    return 'Focus on protein consistency this week.';
  }

  return 'Prioritize recovery meals after strength sessions.';
}

function getCoachGuidance(
  nutritionPlan: NutritionPlan,
  selectedDay: NutritionDay,
  todayNutrition: TodayNutrition | null,
): string {
  if (selectedDay.date === todayNutrition?.date && todayNutrition.nextMeal) {
    return `${todayNutrition.nextMeal.title} is the next useful step in today's plan.`;
  }

  if (nutritionPlan.days.length >= 7) {
    return 'Your current nutrition plan matches a full weekly rhythm.';
  }

  return 'Your plan is structured to keep nutrition consistent across the week.';
}

function getShortDayLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  return dayLabels[date.getUTCDay()];
}

function getDayLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date);
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

function trackNutritionPlanEvent(
  _event:
    | 'nutrition_plan_opened'
    | 'nutrition_day_changed'
    | 'meal_selected'
    | 'nutrition_week_reviewed',
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

function getPlanErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load nutrition plan.';
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
  calendarContent: {
    gap: 10,
    paddingRight: 4,
  },
  dayButton: {
    width: 70,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingVertical: 12,
  },
  dayButtonSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.selectedSurface,
  },
  dayLabel: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  dayLabelSelected: {
    color: tokens.text,
  },
  dayMeals: {
    color: tokens.tertiaryText,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  dayIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.border,
  },
  dayIndicatorCompleted: {
    backgroundColor: tokens.success,
  },
  dayIndicatorActive: {
    backgroundColor: tokens.selectedBorder,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  mealList: {
    gap: 12,
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  mealDescription: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryPill: {
    borderRadius: 999,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  summaryValue: {
    color: tokens.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
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
  focusText: {
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
  skeletonCalendar: {
    height: 86,
    borderRadius: 24,
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
