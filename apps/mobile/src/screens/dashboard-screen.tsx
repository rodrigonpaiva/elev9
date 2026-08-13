import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '@elev9/ui';
import type { NutritionAction } from '@elev9/types';

import { productAnalytics } from '../analytics/product-analytics';
import { CoachInsightCard } from '../components/dashboard/coach-insight-card';
import { RecoveryReadinessCard } from '../components/dashboard/recovery-readiness-card';
import { TodaysWorkoutCard } from '../components/dashboard/todays-workout-card';
import { TodaysNutritionCard } from '../components/dashboard/todays-nutrition-card';
import { WeeklyProgressCard } from '../components/dashboard/weekly-progress-card';
import { getCoachFirstName } from '../hooks/coach';
import { useDashboard } from '../hooks/use-dashboard';
import type { UseDashboardResult } from '../hooks/use-dashboard';
import type { RootStackParamList } from '../navigation/app-navigator';
import {
  getDailyCheckInAnalyticsCompletionState,
  getDailyCheckInCtaLabel,
} from './dashboard-daily-check-in-helpers';

type DashboardScreenProps = {
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
  onOpenTrainingPlan?: () => void;
  showLogout?: boolean;
};

type DashboardState = 'loading' | 'error';

function getNutritionAnalyticsDestination(
  action: NutritionAction,
):
  | 'nutrition_profile'
  | 'nutrition_plan'
  | 'today_meals'
  | 'log_meal'
  | 'hydration'
  | 'none'
  | 'unavailable' {
  switch (action.type) {
    case 'open_profile':
      return 'nutrition_profile';
    case 'create_plan':
      return 'nutrition_plan';
    case 'open_today_meals':
      return 'today_meals';
    case 'log_meal':
      return 'log_meal';
    case 'open_hydration':
      return 'hydration';
    case 'none':
      return 'none';
    default:
      return 'unavailable';
  }
}

const MOTIVATIONAL_MESSAGES = [
  "Let's build momentum today.",
  'Consistency beats intensity.',
  'Small actions create big results.',
] as const;

const DAILY_FOCUS = 'Complete your workout and hit your protein target.';

const dashboardTokens = {
  background: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  card: '#ffffff',
  surface: '#f8fafc',
  accent: '#111827',
} as const;

export function DashboardScreen({
  onOpenHistory,
  onOpenProfile,
  onOpenTrainingPlan,
}: DashboardScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dashboard = useDashboard();
  const entrance = useRef(new Animated.Value(0)).current;
  const hasFocused = useRef(false);
  const lastTrackedCheckInCtaState = useRef<'pending' | 'completed' | null>(
    null,
  );
  const nutritionCardExposureTracked = useRef(false);
  const nutritionLoadResultKey = useRef<string | null>(null);
  const firstName = getCoachFirstName(dashboard.userName);

  const motivationalMessage = useMemo(() => {
    const index = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);

    return MOTIVATIONAL_MESSAGES[index];
  }, []);

  useEffect(() => {
    if (dashboard.isLoading) {
      return;
    }

    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [dashboard.isLoading, entrance]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }

      void dashboard.refresh();
    }, [dashboard.refresh]),
  );

  useEffect(() => {
    if (dashboard.isLoading || dashboard.error) {
      return;
    }

    const completionState = getDailyCheckInAnalyticsCompletionState(dashboard);

    if (!completionState) {
      return;
    }

    if (lastTrackedCheckInCtaState.current === completionState) {
      return;
    }

    lastTrackedCheckInCtaState.current = completionState;
    productAnalytics.track('daily_check_in_cta_viewed', {
      completionState,
      entryPoint: 'dashboard',
    });
  }, [
    dashboard.coach.actionTarget,
    dashboard.dailyCheckIn.completedToday,
    dashboard.error,
    dashboard.isLoading,
  ]);

  useEffect(() => {
    if (dashboard.nutrition.isLoading) {
      return;
    }

    const availability =
      dashboard.nutrition.data?.availability ?? 'not_available';
    const freshness = dashboard.nutrition.data?.freshness ?? 'unknown';
    const outcome = dashboard.nutrition.errorMessage ? 'failure' : 'success';
    const resultKey = `${outcome}:${availability}:${freshness}`;

    if (nutritionLoadResultKey.current !== resultKey) {
      nutritionLoadResultKey.current = resultKey;
      productAnalytics.track('nutrition_dashboard_load_result', {
        outcome,
        availability,
        freshness,
        source: 'canonical_read_model',
        ...(dashboard.nutrition.errorMessage
          ? { safeErrorCode: 'NUTRITION_LOAD_FAILED' as const }
          : {}),
      });
    }

    if (!nutritionCardExposureTracked.current) {
      nutritionCardExposureTracked.current = true;
      productAnalytics.track('nutrition_dashboard_card_viewed', {
        screen: 'dashboard',
        component: 'nutrition_card',
        availability,
        freshness,
        source: 'canonical_read_model',
      });
    }
  }, [
    dashboard.nutrition.data,
    dashboard.nutrition.errorMessage,
    dashboard.nutrition.isLoading,
  ]);

  const handleStartWorkout = useCallback(() => {
    if (!dashboard.workout.data || !dashboard.workout.todaysWorkout) {
      return;
    }

    navigation.navigate('WorkoutOverview', {
      trainingPlanId: dashboard.workout.data.id,
      workout: dashboard.workout.todaysWorkout,
    });
  }, [dashboard.workout.data, dashboard.workout.todaysWorkout, navigation]);

  const handleViewPlan = useCallback(() => {
    onOpenTrainingPlan?.();
  }, [onOpenTrainingPlan]);

  const handleNutritionAction = useCallback(
    (action: NutritionAction) => {
      const destination = getNutritionAnalyticsDestination(action);
      const outcome =
        destination === 'unavailable' ? 'unavailable' : 'accepted';
      productAnalytics.track('nutrition_dashboard_action_selected', {
        actionType: action.type,
        navigationDestination: destination,
        outcome,
      });

      switch (action.type) {
        case 'open_profile':
          navigation.navigate('CreateNutritionProfile');
          return;
        case 'create_plan':
          navigation.navigate('NutritionPlan');
          return;
        case 'open_today_meals':
          navigation.navigate('TodaysMeals');
          return;
        case 'log_meal':
          if (action.mealId) {
            navigation.navigate('LogMeal', { mealId: action.mealId });
          } else {
            navigation.navigate('TodaysMeals');
          }
          return;
        case 'open_hydration':
        case 'none':
        default:
          return;
      }
    },
    [navigation],
  );

  const handleNutritionRetry = useCallback(() => {
    const previousOutcome = dashboard.nutrition.errorMessage
      ? 'failure'
      : dashboard.nutrition.data?.availability === 'processing_failed'
        ? 'processing_failed'
        : 'not_available';
    productAnalytics.track('nutrition_dashboard_retry_selected', {
      source: 'dashboard_nutrition_card',
      previousOutcome,
    });
    void dashboard.nutrition.retry();
  }, [
    dashboard.nutrition.data?.availability,
    dashboard.nutrition.errorMessage,
    dashboard.nutrition.retry,
  ]);

  const handleOpenNutritionRecommendations = useCallback(() => {
    navigation.navigate('NutritionRecommendations');
  }, [navigation]);

  const handleViewAnalytics = useCallback(() => {
    navigation.navigate('TrainingAnalytics');
  }, [navigation]);

  const handleOpenWeeklyReview = useCallback(() => {
    navigation.navigate('CoachWeeklyReview');
  }, [navigation]);

  const handleOpenDailyBriefing = useCallback(() => {
    navigation.navigate('CoachDailyBriefing');
  }, [navigation]);

  const handleOpenRecovery = useCallback(() => {
    productAnalytics.track('recovery_dashboard_cta_selected', {
      entryPoint: 'dashboard',
    });
    navigation.navigate('Recovery');
  }, [navigation]);

  const handleCoachCta = useCallback(() => {
    switch (dashboard.coach.actionTarget) {
      case 'workout':
        handleStartWorkout();
        return;
      case 'check_in':
        productAnalytics.track('daily_check_in_cta_selected', {
          completionState: dashboard.dailyCheckIn.completedToday
            ? 'completed'
            : 'pending',
          entryPoint: 'dashboard',
        });
        navigation.navigate('DailyCheckIn', {
          entryPoint: 'dashboard',
          mode: dashboard.dailyCheckIn.completedToday ? 'edit' : 'create',
        });
        return;
      case 'nutrition':
        handleOpenNutritionRecommendations();
        return;
      case 'coach':
      default:
        navigation.navigate('AskCoach');
    }
  }, [
    dashboard.coach.actionTarget,
    dashboard.dailyCheckIn.completedToday,
    handleOpenNutritionRecommendations,
    handleStartWorkout,
    navigation,
  ]);

  if (dashboard.isLoading) {
    return (
      <DashboardStateView
        state="loading"
        message="Preparing your dashboard..."
      />
    );
  }

  if (dashboard.error) {
    return <DashboardStateView state="error" message={dashboard.error} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefreshing}
            onRefresh={() => void dashboard.refresh()}
            tintColor={dashboardTokens.accent}
          />
        }
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <DashboardHeader
            firstName={firstName}
            onOpenProfile={onOpenProfile}
          />

          <WelcomeSection
            firstName={firstName}
            motivationalMessage={motivationalMessage}
          />

          <DailyFocusCard
            focus={dashboard.coach.recommendedAction || DAILY_FOCUS}
          />
          <DailyBriefingButton onPress={handleOpenDailyBriefing} />

          <DashboardCards
            dashboard={dashboard}
            onCoachCta={handleCoachCta}
            onNutritionAction={handleNutritionAction}
            onNutritionRetry={handleNutritionRetry}
            onOpenHistory={onOpenHistory}
            onOpenRecovery={handleOpenRecovery}
            onOpenWeeklyReview={handleOpenWeeklyReview}
            onStartWorkout={handleStartWorkout}
            onViewAnalytics={handleViewAnalytics}
            onViewPlan={handleViewPlan}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardCards({
  dashboard,
  onCoachCta,
  onNutritionAction,
  onNutritionRetry,
  onOpenHistory,
  onOpenRecovery,
  onOpenWeeklyReview,
  onStartWorkout,
  onViewAnalytics,
  onViewPlan,
}: {
  dashboard: UseDashboardResult;
  onCoachCta: () => void;
  onNutritionAction: (action: NutritionAction) => void;
  onNutritionRetry: () => void;
  onOpenHistory?: () => void;
  onOpenRecovery: () => void;
  onOpenWeeklyReview: () => void;
  onStartWorkout: () => void;
  onViewAnalytics: () => void;
  onViewPlan: () => void;
}) {
  return (
    <View style={styles.cardStack}>
      <CoachInsightCard
        badgeLabel={dashboard.coach.badgeLabel}
        coachDecision={dashboard.coach.data}
        ctaLabel={getDailyCheckInCtaLabel(dashboard)}
        confidenceLevel={dashboard.coach.intelligence?.confidence.level ?? null}
        errorMessage={dashboard.coach.errorMessage}
        isLoading={dashboard.coach.isLoading}
        onPressCta={onCoachCta}
        onRetry={() => void dashboard.coach.retry()}
        riskLevel={dashboard.coach.intelligence?.currentRisk?.level ?? null}
        recommendedAction={dashboard.coach.recommendedAction}
        supportingEvidenceSummary={dashboard.coach.supportingEvidenceSummary}
      />
      <RecoveryReadinessCard
        errorMessage={dashboard.recoveryExperience.errorMessage}
        isLoading={dashboard.recoveryExperience.isLoading}
        onRetry={() => void dashboard.recoveryExperience.retry()}
        onOpenRecovery={onOpenRecovery}
        recoveryExperience={dashboard.recoveryExperience.data}
      />
      <TodaysWorkoutCard
        errorMessage={dashboard.workout.errorMessage}
        isLoading={dashboard.workout.isLoading}
        onRetry={() => void dashboard.workout.retry()}
        onStartWorkout={onStartWorkout}
        onViewPlan={onViewPlan}
        recoveryStatus={dashboard.recovery.status}
        workout={dashboard.workout.todaysWorkout}
      />
      <TodaysNutritionCard
        errorMessage={dashboard.nutrition.errorMessage}
        isLoading={dashboard.nutrition.isLoading}
        onAction={onNutritionAction}
        onRetry={onNutritionRetry}
        todayNutrition={dashboard.nutrition.data}
      />
      <WeeklyProgressCard
        errorMessage={dashboard.progress.errorMessage}
        isLoading={dashboard.progress.isLoading}
        onRetry={() => void dashboard.progress.retry()}
        onOpenWeeklyReview={onOpenWeeklyReview}
        onViewAnalytics={onViewAnalytics}
        onViewHistory={onOpenHistory}
        plannedWorkouts={dashboard.workout.plannedWorkoutCount}
        progressSummary={dashboard.progress.data}
        recoveryScore={dashboard.recovery.data?.readinessScore}
      />
    </View>
  );
}

function DashboardHeader({
  firstName,
  onOpenProfile,
}: {
  firstName: string | null;
  onOpenProfile?: () => void;
}) {
  const avatarInitial = firstName ? firstName.charAt(0).toUpperCase() : 'E';

  return (
    <View style={styles.header}>
      <Text accessibilityRole="text" style={styles.dateText}>
        {formatCurrentDate()}
      </Text>
      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onOpenProfile}
        style={({ pressed }) => [
          styles.avatarButton,
          pressed ? styles.avatarButtonPressed : null,
        ]}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.avatarInitial}
        >
          {avatarInitial}
        </Text>
      </Pressable>
    </View>
  );
}

function WelcomeSection({
  firstName,
  motivationalMessage,
}: {
  firstName: string | null;
  motivationalMessage: string;
}) {
  const greeting = firstName ? `${getGreeting()}, ${firstName}` : getGreeting();

  return (
    <View
      accessibilityLabel={`${greeting}. ${motivationalMessage}`}
      style={styles.welcomeSection}
    >
      <Text style={styles.headline}>{greeting}</Text>
      <Text style={styles.motivationalText}>{motivationalMessage}</Text>
    </View>
  );
}

function DailyFocusCard({ focus }: { focus: string }) {
  return (
    <View
      accessibilityLabel={`Today's focus. ${focus}`}
      style={styles.focusCard}
    >
      <Text style={styles.focusLabel}>TODAY&apos;S FOCUS</Text>
      <Text style={styles.focusText}>{focus}</Text>
    </View>
  );
}

function DailyBriefingButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Daily Briefing"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.briefingButton,
        pressed ? styles.briefingButtonPressed : null,
      ]}
    >
      <Text style={styles.briefingButtonText}>Daily Briefing</Text>
    </Pressable>
  );
}

function DashboardStateView({
  message,
  state,
}: {
  message: string;
  state: DashboardState;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={message} style={styles.stateContent}>
        {state === 'loading' ? (
          <ActivityIndicator
            accessibilityLabel="Dashboard loading"
            color={dashboardTokens.accent}
          />
        ) : null}
        <Text style={styles.stateMessage}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning';
  }

  if (hour < 18) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dashboardTokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 34,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateText: {
    color: dashboardTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dashboardTokens.border,
    backgroundColor: dashboardTokens.surface,
  },
  avatarButtonPressed: {
    opacity: 0.72,
  },
  avatarInitial: {
    color: dashboardTokens.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  welcomeSection: {
    gap: 10,
    paddingTop: 12,
  },
  headline: {
    color: dashboardTokens.text,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
  },
  motivationalText: {
    color: dashboardTokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '400',
  },
  focusCard: {
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: dashboardTokens.border,
    backgroundColor: dashboardTokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  focusLabel: {
    color: dashboardTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  focusText: {
    color: dashboardTokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  briefingButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dashboardTokens.border,
    backgroundColor: dashboardTokens.surface,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  briefingButtonPressed: {
    opacity: 0.72,
  },
  briefingButtonText: {
    color: dashboardTokens.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  cardStack: {
    gap: 28,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  stateMessage: {
    color: dashboardTokens.secondaryText,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
});
