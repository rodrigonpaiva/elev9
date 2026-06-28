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

      if (await shouldShowDailyBriefingToday()) {
        await markDailyBriefingShownToday();
        navigation.replace('CoachDailyBriefing');
        return;
      }

      navigation.replace('MainTabs');
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'USER_PROFILE_NOT_FOUND'
      ) {
        navigation.replace('CreateProfile');
        return;
      }

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
        setErrorMessage('Unable to set up your training space.');
      }
    } finally {
      setIsLoading(false);
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

async function shouldShowDailyBriefingToday(): Promise<boolean> {
  const todayKey = getLocalDateKey(new Date());
  const lastShownDate = await AsyncStorage.getItem(
    DAILY_BRIEFING_LAST_SHOWN_KEY,
  );

  return lastShownDate !== todayKey;
}

async function markDailyBriefingShownToday(): Promise<void> {
  await AsyncStorage.setItem(
    DAILY_BRIEFING_LAST_SHOWN_KEY,
    getLocalDateKey(new Date()),
  );
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
