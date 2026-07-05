import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiClientError } from '@elev9/api-client';
import { Button, Card, colors, Screen, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import type { RootStackParamList } from '../navigation/app-navigator';
import {
  getHomeResolverErrorMessage,
  getNutritionPlanState,
  getNutritionProfileState,
  getLocalDateKey,
  resolveHomeResolverDestination,
  shouldShowDailyBriefingToday as shouldShowDailyBriefingTodayHelper,
} from './home-resolver-helpers';

const DAILY_BRIEFING_LAST_SHOWN_KEY = 'elev9.dailyBriefing.lastShownDate';

export function HomeResolverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void resolveNextScreen();
  }, []);

  async function resolveNextScreen() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.dashboard.getHome();
      const dashboard = response.dashboard;

      if (!dashboard.user?.name) {
        navigation.replace('CreateProfile');
        return;
      }

      if (!dashboard.fitnessProfile) {
        navigation.replace('CreateFitnessProfile');
        return;
      }

      if (!dashboard.trainingPlan) {
        navigation.replace('CreateTrainingPlan', {
          fitnessProfileId: dashboard.fitnessProfile.id,
          goal: dashboard.fitnessProfile.goal,
          activityLevel: dashboard.fitnessProfile.activityLevel,
        });
        return;
      }

      const nutritionState = await resolveNutritionState();
      const destination = resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile: dashboard.fitnessProfile,
        trainingPlan: dashboard.trainingPlan,
        nutritionProfileState: nutritionState.profileState,
        nutritionPlanState: nutritionState.planState,
        nutritionGoal: nutritionState.nutritionGoal,
        shouldShowDailyBriefingToday: await shouldShowDailyBriefingTodayHelper(
          await AsyncStorage.getItem(DAILY_BRIEFING_LAST_SHOWN_KEY),
          getLocalDateKey(new Date()),
        ),
      });

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
        await signOut();
        return;
      }

      setErrorMessage(getHomeResolverErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function resolveNutritionState(): Promise<{
    profileState: 'exists' | 'missing' | 'unknown';
    planState: 'exists' | 'missing' | 'unknown';
    nutritionGoal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
  }> {
    const [profileResult, planResult] = await Promise.allSettled([
      apiClient.nutrition.getNutritionProfile(),
      apiClient.nutrition.getCurrentNutritionPlan(),
    ]);

    const nutritionProfileState = getNutritionProfileState(profileResult);
    const nutritionPlanState = getNutritionPlanState(planResult);
    const nutritionProfile =
      profileResult.status === 'fulfilled'
        ? profileResult.value.nutritionProfile
        : null;

    return {
      profileState: nutritionProfileState,
      planState: nutritionPlanState,
      nutritionGoal: nutritionProfile?.goal ?? null,
    };
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
