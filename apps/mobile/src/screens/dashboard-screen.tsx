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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '@elev9/ui';

import { CoachInsightCard } from '../components/dashboard/coach-insight-card';
import { RecoveryReadinessCard } from '../components/dashboard/recovery-readiness-card';
import { TodaysWorkoutCard } from '../components/dashboard/todays-workout-card';
import { TodaysNutritionCard } from '../components/dashboard/todays-nutrition-card';
import { WeeklyProgressCard } from '../components/dashboard/weekly-progress-card';
import { useDashboard } from '../hooks/use-dashboard';
import type { UseDashboardResult } from '../hooks/use-dashboard';
import type { RootStackParamList } from '../navigation/app-navigator';

type DashboardScreenProps = {
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
  onOpenTrainingPlan?: () => void;
  showLogout?: boolean;
};

type DashboardState = 'loading' | 'error';

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
  onOpenHistory,
  onOpenProfile,
  onOpenTrainingPlan,
}: DashboardScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dashboard = useDashboard();
  const entrance = useRef(new Animated.Value(0)).current;

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

  const handleCreateNutritionProfile = useCallback(() => {
    onOpenProfile?.();
  }, [onOpenProfile]);

  const handleViewAnalytics = useCallback(() => {
    navigation.navigate('TrainingAnalytics');
  }, [navigation]);

  const handleCoachCta = useCallback(() => {
    switch (dashboard.coach.actionTarget) {
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
  }, [dashboard.coach.actionTarget, handleStartWorkout, navigation]);

  if (dashboard.isLoading) {
    return (
      <DashboardStateView
        state="loading"
        message="Preparing your dashboard..."
      />
    );
  }

  if (dashboard.error) {
    return (
      <DashboardStateView
        state="error"
        message={dashboard.error}
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
          <DashboardHeader onOpenProfile={onOpenProfile} />

          <WelcomeSection motivationalMessage={motivationalMessage} />

          <DailyFocusCard focus={DAILY_FOCUS} />

          <DashboardCards
            dashboard={dashboard}
            onCoachCta={handleCoachCta}
            onCreateNutritionProfile={handleCreateNutritionProfile}
            onOpenHistory={onOpenHistory}
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
  onCreateNutritionProfile,
  onOpenHistory,
  onStartWorkout,
  onViewAnalytics,
  onViewPlan,
}: {
  dashboard: UseDashboardResult;
  onCoachCta: () => void;
  onCreateNutritionProfile: () => void;
  onOpenHistory?: () => void;
  onStartWorkout: () => void;
  onViewAnalytics: () => void;
  onViewPlan: () => void;
}) {
  return (
    <View style={styles.cardStack}>
      <CoachInsightCard
        badgeLabel={dashboard.coach.badgeLabel}
        coachDecision={dashboard.coach.data}
        ctaLabel={dashboard.coach.ctaLabel}
        errorMessage={dashboard.coach.errorMessage}
        isLoading={dashboard.coach.isLoading}
        onPressCta={onCoachCta}
        onRetry={() => void dashboard.coach.retry()}
        recommendedAction={dashboard.coach.recommendedAction}
      />
      <RecoveryReadinessCard
        errorMessage={dashboard.recovery.errorMessage}
        isLoading={dashboard.recovery.isLoading}
        onRetry={() => void dashboard.recovery.retry()}
        recoverySnapshot={dashboard.recovery.data}
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
        onCreateNutritionProfile={onCreateNutritionProfile}
        onRetry={() => void dashboard.nutrition.retry()}
        todayNutrition={dashboard.nutrition.data}
        workout={dashboard.workout.todaysWorkout}
      />
      <WeeklyProgressCard
        errorMessage={dashboard.progress.errorMessage}
        isLoading={dashboard.progress.isLoading}
        nutritionAdherencePercentage={
          dashboard.nutrition.data?.progress.adherencePercentage
        }
        onRetry={() => void dashboard.progress.retry()}
        onViewAnalytics={onViewAnalytics}
        onViewHistory={onOpenHistory}
        plannedWorkouts={dashboard.workout.plannedWorkoutCount}
        progressSummary={dashboard.progress.data}
        recoveryScore={dashboard.recovery.data?.readinessScore}
      />
    </View>
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
