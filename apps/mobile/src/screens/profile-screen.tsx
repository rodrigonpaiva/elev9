import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type { DashboardHomeResponse } from '@elev9/types';
import {
  Badge,
  Button,
  Card,
  colors,
  formatGenericEnumLabel,
  formatGoalType,
  Screen,
  SectionHeader,
  Text,
} from '@elev9/ui';

import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import type { RootStackParamList } from '../navigation/app-navigator';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut, status } = useAuth();
  const [dashboard, setDashboard] = useState<
    DashboardHomeResponse['dashboard'] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const response = await apiClient.dashboard.getHome();
        setDashboard(response.dashboard);
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
          setErrorMessage('Unable to load your profile.');
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
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  const handleOpenTrainingHistory = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'history' });
  }, [navigation]);

  const handleOpenTrainingAnalytics = useCallback(() => {
    navigation.navigate('TrainingAnalytics');
  }, [navigation]);

  const handleOpenNutritionOverview = useCallback(() => {
    navigation.navigate('NutritionOverview');
  }, [navigation]);

  const handleOpenNutritionPlan = useCallback(() => {
    navigation.navigate('NutritionPlan');
  }, [navigation]);

  const handleOpenNutritionHistory = useCallback(() => {
    navigation.navigate('NutritionHistory');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('AskCoach');
  }, [navigation]);

  const handleOpenCoachMemory = useCallback(() => {
    navigation.navigate('CoachMemoryTimeline');
  }, [navigation]);

  const handleOpenCoachWeeklyReview = useCallback(() => {
    navigation.navigate('CoachWeeklyReview');
  }, [navigation]);

  const handleOpenCoachNotifications = useCallback(() => {
    navigation.navigate('CoachNotifications');
  }, [navigation]);

  const handleOpenGoalGuidance = useCallback(() => {
    navigation.navigate('CoachGoalGuidance');
  }, [navigation]);

  const trainingPlanStatus = resolveTrainingPlanStatus(dashboard);

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View
        style={[
          styles.stack,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={styles.heroCard}>
          <Badge variant="primary" label="Profile" />
          <Text variant="headline" style={styles.title}>
            {dashboard?.user.name ?? 'Elev9 User'}
          </Text>
          <Text style={styles.subtitle}>
            Your training profile, plan status, and account controls.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">Profile unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              label="Retry"
              onPress={() => void load()}
              style={styles.fullButton}
            />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <SectionHeader
                title="Account"
                subtitle="Basic details for your current training space."
              />
              <InfoRow
                label="Name"
                value={dashboard?.user.name ?? 'Not available'}
              />
              <InfoRow
                label="Session"
                value={status === 'authenticated' ? 'Signed in' : 'Signed out'}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Fitness Profile"
                subtitle="Your current goal and training rhythm."
              />
              <InfoRow
                label="Goal"
                value={
                  dashboard?.fitnessProfile?.goal
                    ? formatGoalType(dashboard.fitnessProfile.goal)
                    : 'Not set'
                }
              />
              <InfoRow
                label="Training level"
                value={
                  dashboard?.fitnessProfile?.activityLevel
                    ? formatGenericEnumLabel(
                        dashboard.fitnessProfile.activityLevel,
                      )
                    : 'Not set'
                }
              />
              <Button
                label="Goal Guidance"
                onPress={handleOpenGoalGuidance}
                variant="ghost"
                style={styles.fullButton}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Training Plan"
                subtitle="Your current plan and today&apos;s readiness."
              />
              <InfoRow label="Plan status" value={trainingPlanStatus.status} />
              <InfoRow
                label="Today&apos;s session"
                value={trainingPlanStatus.todayWorkout}
              />
              <InfoRow
                label="This week"
                value={`${dashboard?.progressSummary.workoutsCompleted ?? 0} workouts`}
              />
              <Button
                label="View Training History"
                onPress={handleOpenTrainingHistory}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="View Training Analytics"
                onPress={handleOpenTrainingAnalytics}
                variant="ghost"
                style={styles.fullButton}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Nutrition"
                subtitle="Review today&apos;s nutrition plan and coaching focus."
              />
              <Button
                label="Nutrition Overview"
                onPress={handleOpenNutritionOverview}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="Nutrition Plan"
                onPress={handleOpenNutritionPlan}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="Nutrition History"
                onPress={handleOpenNutritionHistory}
                variant="ghost"
                style={styles.fullButton}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Coach"
                subtitle="Ask about training, nutrition, recovery, and your current plan."
              />
              <Button
                label="Ask Coach"
                onPress={handleOpenCoach}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="Coach Memory"
                onPress={handleOpenCoachMemory}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="Coach Weekly Review"
                onPress={handleOpenCoachWeeklyReview}
                variant="ghost"
                style={styles.fullButton}
              />
              <Button
                label="Coach Notifications"
                onPress={handleOpenCoachNotifications}
                variant="ghost"
                style={styles.fullButton}
              />
            </Card>

            <Card style={styles.card}>
              <SectionHeader
                title="Device Access"
                subtitle="Refresh your details or sign out from this device."
              />
              <View style={styles.actions}>
                <Button
                  label="Refresh Profile"
                  onPress={() => void load({ refresh: true })}
                  variant="secondary"
                  style={styles.fullButton}
                />
                <Button
                  label="Logout"
                  onPress={() => void handleSignOut()}
                  loading={isSigningOut}
                  variant="danger"
                  style={styles.fullButton}
                />
              </View>
            </Card>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function resolveTrainingPlanStatus(
  dashboard: DashboardHomeResponse['dashboard'] | null,
) {
  if (!dashboard?.trainingPlan) {
    return {
      status: 'No plan yet',
      todayWorkout: 'No session yet',
    };
  }

  if (!dashboard.trainingPlan.todayWorkout) {
    return {
      status: 'Plan active',
      todayWorkout: 'Rest day today',
    };
  }

  return {
    status: 'Plan active',
    todayWorkout: dashboard.trainingPlan.todayWorkout.title,
  };
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  stack: {
    gap: 18,
  },
  heroCard: {
    gap: 10,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  loadingState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  feedbackCard: {
    gap: 14,
  },
  errorText: {
    color: colors.danger,
  },
  card: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  label: {
    flex: 1,
    color: colors.mutedText,
    fontWeight: '600',
  },
  value: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  actions: {
    gap: 12,
  },
  fullButton: {
    width: '100%',
  },
});
