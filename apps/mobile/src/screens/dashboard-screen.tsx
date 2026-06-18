import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  CoachDecisionPriority,
  RecoverySnapshot,
  TodayNutrition,
  TodayWorkout,
  TrainingPlanResponse,
} from '@elev9/types';
import { Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import {
  CoachInsightCard,
  type CoachInsightBadgeLabel,
} from '../components/dashboard/coach-insight-card';
import { RecoveryReadinessCard } from '../components/dashboard/recovery-readiness-card';
import {
  TodaysWorkoutCard,
  type RecoveryStatus,
} from '../components/dashboard/todays-workout-card';
import { TodaysNutritionCard } from '../components/dashboard/todays-nutrition-card';
import type { RootStackParamList } from '../navigation/app-navigator';

type DashboardScreenProps = {
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
  onOpenTrainingPlan?: () => void;
  showLogout?: boolean;
};

type DashboardState = 'loading' | 'ready' | 'error' | 'empty';
type CoachActionTarget = 'workout' | 'coach' | 'check_in';

const USER_NAME = 'Rodrigo';

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
  onOpenProfile,
  onOpenTrainingPlan,
}: DashboardScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dashboardState, setDashboardState] =
    useState<DashboardState>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState<
    TrainingPlanResponse['trainingPlan'] | null
  >(null);
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(true);
  const [workoutErrorMessage, setWorkoutErrorMessage] = useState<
    string | null
  >(null);
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<RecoverySnapshot | null>(null);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(true);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState<
    string | null
  >(null);
  const [todayNutrition, setTodayNutrition] = useState<TodayNutrition | null>(
    null,
  );
  const [isNutritionLoading, setIsNutritionLoading] = useState(true);
  const [nutritionErrorMessage, setNutritionErrorMessage] = useState<
    string | null
  >(null);
  const [coachDecision, setCoachDecision] = useState<CoachDecision | null>(
    null,
  );
  const [isCoachLoading, setIsCoachLoading] = useState(true);
  const [coachErrorMessage, setCoachErrorMessage] = useState<string | null>(
    null,
  );
  const entrance = useRef(new Animated.Value(0)).current;

  const motivationalMessage = useMemo(() => {
    const index = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);

    return MOTIVATIONAL_MESSAGES[index];
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDashboardState('ready');
    }, 450);

    return () => clearTimeout(timeout);
  }, []);

  const loadDashboard = useCallback(async (options?: { refresh?: boolean }) => {
    if (!options?.refresh) {
      setIsWorkoutLoading(true);
    }

    setWorkoutErrorMessage(null);

    try {
      const response = await apiClient.training.getCurrentPlan();
      setTrainingPlan(response.trainingPlan);
    } catch (error) {
      setTrainingPlan(null);

      if (
        error instanceof ApiClientError &&
        error.code === 'TRAINING_PLAN_NOT_FOUND'
      ) {
        return;
      }

      setWorkoutErrorMessage('Workout unavailable.');
    } finally {
      setIsWorkoutLoading(false);
    }
  }, []);

  const loadNutrition = useCallback(async (options?: { refresh?: boolean }) => {
    if (!options?.refresh) {
      setIsNutritionLoading(true);
    }

    setNutritionErrorMessage(null);

    try {
      const response = await apiClient.nutrition.getTodayNutrition();
      setTodayNutrition(response.todayNutrition ?? null);
    } catch (error) {
      setTodayNutrition(null);

      if (
        error instanceof ApiClientError &&
        (error.code === 'NUTRITION_PLAN_NOT_FOUND' ||
          error.code === 'TODAY_NUTRITION_DAY_NOT_FOUND')
      ) {
        return;
      }

      setNutritionErrorMessage('Nutrition data unavailable.');
    } finally {
      setIsNutritionLoading(false);
    }
  }, []);

  const loadRecovery = useCallback(async (options?: { refresh?: boolean }) => {
    if (!options?.refresh) {
      setIsRecoveryLoading(true);
    }

    setRecoveryErrorMessage(null);

    try {
      const response = await apiClient.recovery.getTodayRecovery();
      setRecoverySnapshot(response.recoverySnapshot ?? null);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'USER_PROFILE_NOT_FOUND'
      ) {
        setRecoverySnapshot(null);
        return;
      }

      setRecoveryErrorMessage('Try again in a moment.');
    } finally {
      setIsRecoveryLoading(false);
    }
  }, []);

  const loadCoachInsight = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!options?.refresh) {
        setIsCoachLoading(true);
      }

      setCoachErrorMessage(null);

      try {
        const response = await apiClient.ai.getTodayCoachDecision();
        setCoachDecision(response.coachDecision ?? null);
      } catch (error) {
        setCoachDecision(null);

        if (
          error instanceof ApiClientError &&
          error.code === 'USER_PROFILE_NOT_FOUND'
        ) {
          return;
        }

        setCoachErrorMessage('Coach insight unavailable.');
      } finally {
        setIsCoachLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void Promise.all([
      loadCoachInsight(),
      loadDashboard(),
      loadRecovery(),
      loadNutrition(),
    ]);
  }, [loadCoachInsight, loadDashboard, loadNutrition, loadRecovery]);

  useEffect(() => {
    if (dashboardState !== 'ready') {
      return;
    }

    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [dashboardState, entrance]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    await Promise.all([
      loadCoachInsight({ refresh: true }),
      loadDashboard({ refresh: true }),
      loadRecovery({ refresh: true }),
      loadNutrition({ refresh: true }),
      wait(1000),
    ]);

    setDashboardState('ready');
    setIsRefreshing(false);
  }, [loadCoachInsight, loadDashboard, loadNutrition, loadRecovery]);

  const todaysWorkout = useMemo(
    () => resolveTodaysWorkout(trainingPlan),
    [trainingPlan],
  );
  const recoveryStatus = useMemo(
    () => resolveRecoveryStatus(recoverySnapshot),
    [recoverySnapshot],
  );
  const coachInsightDisplay = useMemo(
    () => resolveCoachInsightDisplay(coachDecision, todaysWorkout),
    [coachDecision, todaysWorkout],
  );

  const handleStartWorkout = useCallback(() => {
    if (!trainingPlan || !todaysWorkout) {
      return;
    }

    navigation.navigate('Workout', {
      trainingPlanId: trainingPlan.id,
      workout: todaysWorkout,
    });
  }, [navigation, todaysWorkout, trainingPlan]);

  const handleViewPlan = useCallback(() => {
    onOpenTrainingPlan?.();
  }, [onOpenTrainingPlan]);

  const handleCreateNutritionProfile = useCallback(() => {
    onOpenProfile?.();
  }, [onOpenProfile]);

  const handleCoachCta = useCallback(() => {
    switch (coachInsightDisplay.target) {
      case 'workout':
        handleStartWorkout();
        return;
      case 'check_in':
        navigation.navigate('DailyCheckInHistory');
        return;
      case 'coach':
      default:
        navigation.navigate('CoachChat');
    }
  }, [coachInsightDisplay.target, handleStartWorkout, navigation]);

  if (dashboardState === 'loading') {
    return (
      <DashboardStateView
        state="loading"
        message="Preparing your dashboard..."
      />
    );
  }

  if (dashboardState === 'error') {
    return (
      <DashboardStateView
        state="error"
        message="We couldn't load your dashboard."
      />
    );
  }

  if (dashboardState === 'empty') {
    return (
      <DashboardStateView
        state="empty"
        message="Your personalized coaching experience will appear here."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
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
          <DashboardHeader onOpenProfile={onOpenProfile} />

          <WelcomeSection motivationalMessage={motivationalMessage} />

          <DailyFocusCard focus={DAILY_FOCUS} />

          <View style={styles.cardStack}>
            <CoachInsightCard
              badgeLabel={coachInsightDisplay.badgeLabel}
              coachDecision={coachDecision}
              ctaLabel={coachInsightDisplay.ctaLabel}
              errorMessage={coachErrorMessage}
              isLoading={isCoachLoading}
              onPressCta={handleCoachCta}
              onRetry={() => void loadCoachInsight()}
              recommendedAction={coachInsightDisplay.recommendedAction}
            />
            <RecoveryReadinessCard
              errorMessage={recoveryErrorMessage}
              isLoading={isRecoveryLoading}
              onRetry={() => void loadRecovery()}
              recoverySnapshot={recoverySnapshot}
            />
            <TodaysWorkoutCard
              errorMessage={workoutErrorMessage}
              isLoading={isWorkoutLoading}
              onRetry={() => void loadDashboard()}
              onStartWorkout={handleStartWorkout}
              onViewPlan={handleViewPlan}
              recoveryStatus={recoveryStatus}
              workout={todaysWorkout}
            />
            <TodaysNutritionCard
              errorMessage={nutritionErrorMessage}
              isLoading={isNutritionLoading}
              onCreateNutritionProfile={handleCreateNutritionProfile}
              onRetry={() => void loadNutrition()}
              todayNutrition={todayNutrition}
              workout={todaysWorkout}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardHeader({ onOpenProfile }: { onOpenProfile?: () => void }) {
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
          {USER_NAME.charAt(0)}
        </Text>
      </Pressable>
    </View>
  );
}

function WelcomeSection({
  motivationalMessage,
}: {
  motivationalMessage: string;
}) {
  return (
    <View
      accessibilityLabel={`${getGreeting()}, ${USER_NAME}. ${motivationalMessage}`}
      style={styles.welcomeSection}
    >
      <Text style={styles.headline}>
        {getGreeting()}, {USER_NAME}
      </Text>
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

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function resolveRecoveryStatus(
  recoverySnapshot: RecoverySnapshot | null,
): RecoveryStatus | null {
  if (!recoverySnapshot) {
    return null;
  }

  if (recoverySnapshot.readinessScore >= 80) {
    return 'ready';
  }

  if (recoverySnapshot.readinessScore >= 60) {
    return 'moderate';
  }

  return 'recovery_needed';
}

function resolveTodaysWorkout(
  trainingPlan: TrainingPlanResponse['trainingPlan'] | null,
): TodayWorkout | null {
  if (!trainingPlan) {
    return null;
  }

  const todayIndex = getUtcDayIndex(new Date());
  const matchingDay = trainingPlan.weeklySchedule.find(
    (day) => day.dayIndex === todayIndex,
  );

  if (!matchingDay) {
    return null;
  }

  return {
    dayIndex: matchingDay.dayIndex,
    title: matchingDay.title,
    focus: matchingDay.focus,
    format: matchingDay.format,
    intensity: matchingDay.intensity,
    exercises: matchingDay.exercises,
  };
}

function getUtcDayIndex(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function resolveCoachInsightDisplay(
  coachDecision: CoachDecision | null,
  workout: TodayWorkout | null,
): {
  badgeLabel: CoachInsightBadgeLabel;
  recommendedAction: string;
  ctaLabel: string;
  target: CoachActionTarget;
} {
  if (!coachDecision) {
    return {
      badgeLabel: 'Insight',
      recommendedAction: 'Open Coach',
      ctaLabel: 'Open Coach',
      target: 'coach',
    };
  }

  const fallbackAction = getCoachRecommendedAction(
    coachDecision.priority,
    workout,
  );
  const primaryAction = coachDecision.actionItems
    .find((action) => action.trim().length > 0)
    ?.trim();
  const recommendedAction = primaryAction ?? fallbackAction;
  const target = getCoachActionTarget(coachDecision.priority, workout);

  return {
    badgeLabel: getCoachBadgeLabel(coachDecision.priority),
    recommendedAction,
    ctaLabel: getCoachCtaLabel(target),
    target,
  };
}

function getCoachBadgeLabel(
  priority: CoachDecisionPriority,
): CoachInsightBadgeLabel {
  switch (priority) {
    case 'recovery':
      return 'Recovery Focus';
    case 'training':
    case 'consistency':
      return 'Performance Focus';
    case 'nutrition':
      return 'Recommendation';
    case 'motivation':
    default:
      return 'Insight';
  }
}

function getCoachRecommendedAction(
  priority: CoachDecisionPriority,
  workout: TodayWorkout | null,
): string {
  switch (priority) {
    case 'recovery':
      return 'Prioritize Sleep';
    case 'nutrition':
      return 'View Nutrition';
    case 'training':
      return workout ? "Start Today's Workout" : 'Open Coach';
    case 'consistency':
      return workout ? "Start Today's Workout" : 'Complete Daily Check-In';
    case 'motivation':
    default:
      return 'Open Coach';
  }
}

function getCoachActionTarget(
  priority: CoachDecisionPriority,
  workout: TodayWorkout | null,
): CoachActionTarget {
  if (
    workout &&
    (priority === 'training' ||
      priority === 'consistency' ||
      priority === 'motivation')
  ) {
    return 'workout';
  }

  if (priority === 'recovery') {
    return 'check_in';
  }

  return 'coach';
}

function getCoachCtaLabel(target: CoachActionTarget): string {
  switch (target) {
    case 'workout':
      return 'Start Workout';
    case 'check_in':
      return 'Complete Check-In';
    case 'coach':
    default:
      return 'Open Coach';
  }
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
