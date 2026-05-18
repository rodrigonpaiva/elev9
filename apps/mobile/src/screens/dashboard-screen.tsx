import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from '@elev9/ui';
import type {
  CreateDailyCheckInRequest,
  DashboardHomeDebugResponse,
  DashboardHomeResponse,
  TodayWorkout,
} from '@elev9/types';

import { apiClient, mobileApiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import type { RootStackParamList } from '../navigation/app-navigator';

type DashboardScreenProps = {
  onOpenHistory?: () => void;
  showLogout?: boolean;
};

const DEFAULT_DAILY_CHECK_IN: CreateDailyCheckInRequest = {
  energyLevel: 3,
  sleepQuality: 3,
  muscleSoreness: 3,
  motivationLevel: 3,
};

export function DashboardScreen({
  onOpenHistory,
  showLogout = false,
}: DashboardScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();
  const [dashboard, setDashboard] = useState<
    DashboardHomeResponse['dashboard'] | null
  >(null);
  const [dashboardDebug, setDashboardDebug] =
    useState<DashboardHomeDebugResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [dailyCheckInForm, setDailyCheckInForm] =
    useState<CreateDailyCheckInRequest>(DEFAULT_DAILY_CHECK_IN);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      setDashboardDebug(null);

      try {
        const [response, progressSummary, debugResponse] = await Promise.all([
          apiClient.dashboard.getHome(),
          apiClient.progress.getSummary('week'),
          mobileApiClient.dashboard.getHomeDebug().catch(() => null),
        ]);

        setDashboard(response.dashboard);
        setDashboardDebug(debugResponse);
        setCurrentStreak(progressSummary.summary.currentStreak);
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.code === 'AUTH_INVALID_SESSION'
        ) {
          await signOut();
          return;
        }

        if (error instanceof ApiClientError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Unable to load dashboard.');
        }
      } finally {
        if (options?.refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [signOut],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  const updateDailyCheckInValue = useCallback(
    (field: keyof CreateDailyCheckInRequest, value: number) => {
      setDailyCheckInForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const submitDailyCheckIn = useCallback(async () => {
    setIsSubmittingCheckIn(true);
    setErrorMessage(null);

    try {
      await mobileApiClient.progress.createDailyCheckIn(dailyCheckInForm);
      await loadDashboard({ refresh: true });
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'AUTH_INVALID_SESSION'
      ) {
        await signOut();
        return;
      }

      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to save daily check-in.');
      }
    } finally {
      setIsSubmittingCheckIn(false);
    }
  }, [dailyCheckInForm, loadDashboard, signOut]);

  if (isLoading) {
    return (
      <Screen contentStyle={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </Screen>
    );
  }

  if (!dashboard) {
    return (
      <Screen contentStyle={styles.emptyScreen}>
        <Card style={styles.sectionCard}>
          <Text variant="title">Dashboard unavailable</Text>
          <Text style={styles.mutedText}>
            {errorMessage ?? 'Unable to load your home dashboard.'}
          </Text>
        </Card>
        <Button
          label="Retry"
          onPress={() => void loadDashboard()}
          style={styles.fullButton}
        />
        <Button
          label="Logout"
          onPress={() => void signOut()}
          variant="secondary"
          style={styles.fullButton}
        />
      </Screen>
    );
  }

  const trainingPlan = dashboard.trainingPlan;
  const todayWorkout = trainingPlan?.todayWorkout;

  return (
    <Screen
      contentStyle={styles.scrollContent}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDashboard({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 0)]}
      >
        <Card style={styles.heroCard}>
          <Badge variant="primary" label="Elev9 Home" />
          <Text variant="headline" style={styles.heroTitle}>
            Welcome, {dashboard.user.name}
          </Text>
          <Text style={styles.heroSubtitle}>
            Stay consistent with today&apos;s plan and your weekly momentum.
          </Text>
          <View style={styles.streakBanner}>
            <Text style={styles.streakBannerLabel}>🔥 Current streak</Text>
            <Text style={styles.streakBannerValue}>
              {currentStreak === 0
                ? 'Start your first streak today'
                : `${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
            </Text>
          </View>
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 1)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Weekly Progress"
            subtitle="A quick view of your recent training output."
          />
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Weekly workouts</Text>
              <Text style={styles.metricHighlight}>
                {dashboard.progressSummary.workoutsCompleted}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total minutes</Text>
              <Text style={styles.metricHighlight}>
                {dashboard.progressSummary.totalDurationMinutes}
              </Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, styles.metricCardAccent]}>
              <Text style={styles.metricLabel}>🔥 Streak</Text>
              <Text style={styles.metricHighlight}>
                {currentStreak} day{currentStreak === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Last workout</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.progressSummary.lastWorkoutDate
                  ? formatDashboardDate(
                      dashboard.progressSummary.lastWorkoutDate,
                    )
                  : 'No activity yet'}
              </Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Fitness goal</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.fitnessProfile?.goal ?? 'Not created yet'}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 2)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Recovery Status"
            subtitle="A simple signal for today's training intensity."
          />
          <View style={styles.metricsGrid}>
            <View
              style={[
                styles.metricCard,
                recoveryCardStyleMap[dashboard.recovery.fatigueLevel],
              ]}
            >
              <Text style={styles.metricLabel}>Fatigue</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.recovery.fatigueLevel}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Recommended intensity</Text>
              <Text style={styles.metricSecondary}>
                {dashboard.recovery.recommendedIntensity}
              </Text>
            </View>
          </View>
          <View style={styles.recoveryTrendRow}>
            <Text style={styles.metricLabel}>Recovery trend</Text>
            <Text
              style={[
                styles.recoveryTrendValue,
                recoveryTrendStyleMap[dashboard.recovery.recoveryTrend],
              ]}
            >
              {formatRecoveryTrend(dashboard.recovery.recoveryTrend)}
            </Text>
          </View>
          {dashboard.recovery.latestCheckIn ? (
            <View style={styles.recoverySnapshot}>
              <Text style={styles.metricLabel}>Latest check-in</Text>
              <Text style={styles.metricValue}>
                Energy {dashboard.recovery.latestCheckIn.energyLevel} • Sleep{' '}
                {dashboard.recovery.latestCheckIn.sleepQuality} • Soreness{' '}
                {dashboard.recovery.latestCheckIn.muscleSoreness} • Motivation{' '}
                {dashboard.recovery.latestCheckIn.motivationLevel}
              </Text>
              <Text style={styles.recoveryTimestamp}>
                Updated{' '}
                {formatDateTime(dashboard.recovery.latestCheckIn.createdAt)}
              </Text>
              <Button
                label="View recovery history"
                onPress={() => navigation.navigate('DailyCheckInHistory')}
                variant="secondary"
                style={styles.historyButton}
              />
            </View>
          ) : (
            <View style={styles.fallbackBox}>
              <Text style={styles.metricValue}>No check-in yet</Text>
              <Text style={styles.fallbackText}>
                Save today's recovery signals to personalize this dashboard.
              </Text>
              <Button
                label="View recovery history"
                onPress={() => navigation.navigate('DailyCheckInHistory')}
                variant="secondary"
                style={styles.historyButton}
              />
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 3)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Nutrition Guidance"
            subtitle="A simple adaptive signal based on recovery and routine."
          />
          <View
            style={[
              styles.metricCard,
              nutritionGuidanceCardStyleMap[
                dashboard.nutritionGuidance.priority
              ],
            ]}
          >
            <View style={styles.workoutHeader}>
              <Text style={styles.metricLabel}>Priority</Text>
              <Badge
                label={formatNutritionGuidancePriority(
                  dashboard.nutritionGuidance.priority,
                )}
                variant="muted"
              />
            </View>
            <Text style={styles.metricSecondary}>
              {dashboard.nutritionGuidance.message}
            </Text>
            <View style={styles.nutritionSignalsGroup}>
              <Text style={styles.metricLabel}>Why this guidance?</Text>
              {dashboard.nutritionGuidance.signals.map((signal) => (
                <Text key={signal} style={styles.metricValue}>
                  • {formatNutritionGuidanceSignal(signal)}
                </Text>
              ))}
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 4)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Adaptive Signals"
            subtitle="Deterministic signals behind today's dashboard decisions."
          />
          {dashboardDebug ? (
            <View style={styles.metricCard}>
              <View style={styles.nutritionSignalsGroup}>
                <Text style={styles.metricLabel}>Recovery signals</Text>
                {dashboardDebug.recovery.recoverySignals.map((signal) => (
                  <Text key={`recovery-${signal}`} style={styles.metricValue}>
                    • {formatNutritionGuidanceSignal(signal)}
                  </Text>
                ))}
              </View>
              <View style={styles.nutritionSignalsGroup}>
                <Text style={styles.metricLabel}>Nutrition signals</Text>
                {dashboardDebug.nutrition.signals.map((signal) => (
                  <Text key={`nutrition-${signal}`} style={styles.metricValue}>
                    • {formatNutritionGuidanceSignal(signal)}
                  </Text>
                ))}
              </View>
              <Text style={styles.recoveryTimestamp}>
                Generated {formatDateTime(dashboardDebug.generatedAt)}
              </Text>
            </View>
          ) : (
            <View style={styles.fallbackBox}>
              <Text style={styles.metricValue}>
                Adaptive signals unavailable
              </Text>
              <Text style={styles.fallbackText}>
                The internal debug snapshot could not be loaded.
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 5)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Daily Check-in"
            subtitle="Track how you feel before today's session."
          />
          <RatingField
            label="Energy"
            value={dailyCheckInForm.energyLevel}
            onChange={(value) => updateDailyCheckInValue('energyLevel', value)}
          />
          <RatingField
            label="Sleep"
            value={dailyCheckInForm.sleepQuality}
            onChange={(value) => updateDailyCheckInValue('sleepQuality', value)}
          />
          <RatingField
            label="Soreness"
            value={dailyCheckInForm.muscleSoreness}
            onChange={(value) =>
              updateDailyCheckInValue('muscleSoreness', value)
            }
          />
          <RatingField
            label="Motivation"
            value={dailyCheckInForm.motivationLevel}
            onChange={(value) =>
              updateDailyCheckInValue('motivationLevel', value)
            }
          />
          <Button
            label="Save Daily Check-in"
            onPress={() => void submitDailyCheckIn()}
            loading={isSubmittingCheckIn}
            style={styles.fullButton}
          />
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 6)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Today's Workout"
            subtitle={
              trainingPlan && todayWorkout
                ? 'Ready when you are.'
                : 'No workout is scheduled for today.'
            }
          />
          {trainingPlan && todayWorkout ? (
            <Pressable
              onPress={() =>
                navigation.navigate('Workout', {
                  trainingPlanId: trainingPlan.id,
                  workout: todayWorkout as TodayWorkout,
                })
              }
              style={styles.workoutPressable}
            >
              <View style={styles.workoutContent}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutTitle}>{todayWorkout.title}</Text>
                  <Badge label={todayWorkout.intensity} variant="muted" />
                </View>
                <Text style={styles.metricValue}>
                  Focus: {todayWorkout.focus}
                </Text>
                <Text style={styles.metricValue}>
                  Format: {todayWorkout.format}
                </Text>
                <Text style={styles.metricValue}>
                  Exercises: {todayWorkout.exercises.length}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.fallbackBox}>
              <Text style={styles.metricValue}>No training today</Text>
              <Text style={styles.fallbackText}>
                Your current plan does not include a session for today.
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View
        style={[styles.animatedSection, animatedStyle(entrance, 7)]}
      >
        <Card style={styles.sectionCard}>
          <SectionHeader
            title="Quick Actions"
            subtitle="Jump into the most useful parts of the app."
          />
          <View style={styles.actionsGroup}>
            <Button
              label="Coach Chat"
              onPress={() => navigation.navigate('CoachChat')}
              variant="secondary"
              style={styles.fullButton}
            />
            <Button
              label="Start Workout"
              onPress={() =>
                trainingPlan && todayWorkout
                  ? navigation.navigate('Workout', {
                      trainingPlanId: trainingPlan.id,
                      workout: todayWorkout as TodayWorkout,
                    })
                  : undefined
              }
              disabled={!trainingPlan || !todayWorkout}
              style={styles.fullButton}
            />
            <Button
              label="View History"
              onPress={() => onOpenHistory?.()}
              variant="secondary"
              style={styles.fullButton}
            />
            <Button
              label="Refresh Dashboard"
              onPress={() => void loadDashboard({ refresh: true })}
              variant="secondary"
              style={styles.fullButton}
            />
          </View>
        </Card>
      </Animated.View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {showLogout ? (
        <Button
          label="Logout"
          onPress={() => void signOut()}
          variant="secondary"
          style={styles.fullButton}
        />
      ) : null}
    </Screen>
  );
}

type RatingFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function RatingField({ label, value, onChange }: RatingFieldProps) {
  return (
    <View style={styles.ratingField}>
      <View style={styles.ratingHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricSecondary}>{value}/5</Text>
      </View>
      <View style={styles.ratingScale}>
        {[1, 2, 3, 4, 5].map((option) => {
          const isActive = option === value;

          return (
            <Pressable
              key={`${label}-${option}`}
              onPress={() => onChange(option)}
              style={[
                styles.ratingButton,
                isActive ? styles.ratingButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.ratingButtonText,
                  isActive ? styles.ratingButtonTextActive : null,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  emptyScreen: {
    justifyContent: 'center',
    gap: 16,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 32,
  },
  animatedSection: {
    width: '100%',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    gap: 10,
  },
  heroTitle: {
    color: colors.text,
  },
  heroSubtitle: {
    color: colors.mutedText,
  },
  streakBanner: {
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    padding: 14,
  },
  streakBannerLabel: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  streakBannerValue: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  sectionCard: {
    gap: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0b1220',
    padding: 14,
  },
  metricCardAccent: {
    borderColor: colors.primary,
  },
  metricCardDanger: {
    borderColor: colors.danger,
  },
  metricCardCalm: {
    borderColor: colors.accent,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.mutedText,
  },
  metricValue: {
    color: colors.text,
  },
  metricHighlight: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  metricSecondary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  workoutPressable: {
    borderRadius: 18,
  },
  workoutContent: {
    gap: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fallbackBox: {
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#0b1220',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackText: {
    color: colors.mutedText,
  },
  recoverySnapshot: {
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0b1220',
    padding: 16,
  },
  recoveryTrendRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recoveryTrendValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  recoveryTimestamp: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  historyButton: {
    marginTop: 6,
  },
  ratingField: {
    gap: 10,
    paddingVertical: 4,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingScale: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0b1220',
  },
  ratingButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  ratingButtonText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  ratingButtonTextActive: {
    color: colors.primaryText,
  },
  error: {
    color: '#fca5a5',
  },
  mutedText: {
    color: colors.mutedText,
  },
  actionsGroup: {
    gap: 12,
  },
  nutritionSignalsGroup: {
    gap: 6,
    marginTop: 4,
  },
  fullButton: {
    width: '100%',
  },
});

const recoveryCardStyleMap: Record<
  DashboardHomeResponse['dashboard']['recovery']['fatigueLevel'],
  object
> = {
  HIGH: styles.metricCardDanger,
  MODERATE: styles.metricCardAccent,
  LOW: styles.metricCardCalm,
};

const recoveryTrendStyleMap: Record<
  DashboardHomeResponse['dashboard']['recovery']['recoveryTrend'],
  object
> = {
  improving: {
    color: '#86efac',
  },
  stable: {
    color: colors.text,
  },
  needs_recovery: {
    color: '#fdba74',
  },
};

const nutritionGuidanceCardStyleMap: Record<
  DashboardHomeResponse['dashboard']['nutritionGuidance']['priority'],
  object
> = {
  recovery: styles.metricCardDanger,
  consistency: styles.metricCardAccent,
  performance: styles.metricCardCalm,
};

function animatedStyle(value: Animated.Value, index: number) {
  return {
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [18 + index * 6, 0],
        }),
      },
    ],
  };
}

function formatNutritionGuidancePriority(
  value: DashboardHomeResponse['dashboard']['nutritionGuidance']['priority'],
): string {
  switch (value) {
    case 'recovery':
      return 'Recovery';
    case 'performance':
      return 'Performance';
    case 'consistency':
    default:
      return 'Consistency';
  }
}

function formatNutritionGuidanceSignal(signal: string): string {
  return signal
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDashboardDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatRecoveryTrend(
  value: DashboardHomeResponse['dashboard']['recovery']['recoveryTrend'],
): string {
  switch (value) {
    case 'improving':
      return 'Improving';
    case 'needs_recovery':
      return 'Needs recovery';
    case 'stable':
    default:
      return 'Stable';
  }
}
