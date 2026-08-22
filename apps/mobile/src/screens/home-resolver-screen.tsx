import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiClientError } from '@elev9/api-client';
import { Button, Card, colors, Screen, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import {
  getOnboardingErrorCategory,
  onboardingAnalytics,
  trackOnboardingEvent,
  type OnboardingAnalyticsStage,
} from '../analytics/onboarding-analytics';
import type { RootStackParamList } from '../navigation/app-navigator';
import {
  getHomeResolverErrorMessage,
  getLocalDateKey,
  resolveHomeResolverDestination,
  shouldShowDailyBriefingToday as shouldShowDailyBriefingTodayHelper,
} from './home-resolver-helpers';
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
} from '../storage/onboarding-progress-storage';
import { ensureSessionOwnerKey } from '../storage/session-owner-storage';

const DAILY_BRIEFING_LAST_SHOWN_KEY = 'elev9.dailyBriefing.lastShownDate';

export function HomeResolverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const onboardingActive = useRef(false);
  const lastStage = useRef<OnboardingAnalyticsStage>('home');

  useEffect(() => {
    void (async () => {
      await restoreProgressContext();
      await resolveNextScreen();
    })();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        onboardingActive.current &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        trackOnboardingEvent('onboarding_abandoned', {
          stage: lastStage.current,
        });
      }
    });

    return () => subscription.remove();
  }, []);

  async function restoreProgressContext(): Promise<void> {
    const ownerKey = await ensureSessionOwnerKey();
    const mode = onboardingAnalytics.getContext()?.mode ?? 'real';
    const progress = await loadOnboardingProgress(ownerKey, mode);
    if (!progress) return;

    onboardingAnalytics.resume({
      flowSessionId: progress.flowSessionId,
      mode: progress.mode,
    });
    trackOnboardingEvent(
      'onboarding_resumed',
      {
        resumeReason: 'app_reopened',
      },
      mode,
    );
  }

  async function resolveNextScreen() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.dashboard.getHome();
      const dashboard = response.dashboard;

      if (!dashboard.user?.name) {
        startOnboardingStage('profile');
        navigation.replace('CreateProfile');
        return;
      }

      if (!dashboard.fitnessProfile) {
        startOnboardingStage('fitness_profile');
        navigation.replace('CreateFitnessProfile');
        return;
      }

      if (!dashboard.trainingPlan) {
        startOnboardingStage('training_plan');
        navigation.replace('CreateTrainingPlan', {
          fitnessProfileId: dashboard.fitnessProfile.id,
          goal: dashboard.fitnessProfile.goal,
          activityLevel: dashboard.fitnessProfile.activityLevel,
        });
        return;
      }

      const destination = resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile: dashboard.fitnessProfile,
        trainingPlan: dashboard.trainingPlan,
        nutritionProfileState: 'unknown',
        nutritionPlanState: 'unknown',
        shouldShowDailyBriefingToday: await shouldShowDailyBriefingTodayHelper(
          await AsyncStorage.getItem(DAILY_BRIEFING_LAST_SHOWN_KEY),
          getLocalDateKey(new Date()),
        ),
      });

      if (
        onboardingAnalytics.getContext() &&
        !onboardingAnalytics.hasEmitted('home_reached')
      ) {
        trackOnboardingEvent('home_reached');
        if (onboardingAnalytics.getContext()?.mode === 'real') {
          trackOnboardingEvent('onboarding_completed');
        }
        await clearOnboardingProgress();
        onboardingActive.current = false;
      }

      if (destination.screen === 'CoachDailyBriefing') {
        await markDailyBriefingShownToday();
      }

      navigation.replace(
        destination.screen,
        'params' in destination ? destination.params : undefined,
      );
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'AUTH_INVALID_SESSION'
      ) {
        trackOnboardingEvent('session_expired_during_onboarding', {
          stage: lastStage.current,
        });
        await signOut({ preserveOnboardingProgress: true });
        return;
      }

      if (onboardingAnalytics.getContext()) {
        trackOnboardingEvent('onboarding_error', {
          stage: lastStage.current,
          errorCategory: getOnboardingErrorCategory(error),
        });
      }
      setErrorMessage(getHomeResolverErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function startOnboardingStage(stage: OnboardingAnalyticsStage): void {
    const wasStarted = onboardingAnalytics.hasEmitted('onboarding_started');
    const context = onboardingAnalytics.ensureContext('real');
    lastStage.current = stage;
    onboardingActive.current = true;
    void ensureSessionOwnerKey().then((ownerKey) =>
      saveOnboardingProgress({
        ownerKey,
        mode: context.mode,
        stage:
          stage === 'fitness_profile'
            ? 'fitness_profile'
            : stage === 'training_plan'
              ? 'training_plan'
              : 'profile',
        flowSessionId: context.flowSessionId,
      }),
    );

    if (!wasStarted) {
      trackOnboardingEvent('onboarding_started');
    } else if (!onboardingAnalytics.hasEmitted('onboarding_resumed')) {
      trackOnboardingEvent('onboarding_resumed', {
        resumeReason: 'partial_state',
      });
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>
            Setting up your training space...
          </Text>
        </View>
      ) : (
        <Card style={styles.card}>
          <Text variant="title">Unable to continue</Text>
          <Text style={styles.errorText}>
            {errorMessage ?? 'Unable to set up your training space.'}
          </Text>
          <Button
            label="Retry"
            onPress={() => void resolveNextScreen()}
            style={styles.fullButton}
          />
          <Button
            label="Logout"
            onPress={() => void signOut()}
            variant="secondary"
            style={styles.fullButton}
          />
        </Card>
      )}
    </Screen>
  );
}

async function markDailyBriefingShownToday(): Promise<void> {
  await AsyncStorage.setItem(
    DAILY_BRIEFING_LAST_SHOWN_KEY,
    getLocalDateKey(new Date()),
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  card: {
    gap: 14,
  },
  errorText: {
    color: '#fca5a5',
  },
  fullButton: {
    width: '100%',
  },
});
