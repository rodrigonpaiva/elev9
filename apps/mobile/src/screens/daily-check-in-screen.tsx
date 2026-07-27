import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SubmitDailyCheckInRequest } from '@elev9/types';
import { Button, Card, colors, Screen, Text } from '@elev9/ui';

import {
  DailyCheckInFlow,
  useDailyCheckIn,
  useDailyCheckInAnalytics,
  mapDailyCheckInError,
  mapDailyCheckInAnalyticsError,
  type DailyCheckInSubmit,
} from '../features/daily-check-in';
import type { RootStackParamList } from '../navigation/app-navigator';

export type DailyCheckInScreenProps = {
  onSubmit?: DailyCheckInSubmit;
};

type DailyCheckInRoute = RouteProp<RootStackParamList, 'DailyCheckIn'>;

export function DailyCheckInScreen({ onSubmit }: DailyCheckInScreenProps = {}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<DailyCheckInRoute>();
  const initialValues = route.params?.initialValues;
  const [isDirty, setIsDirty] = useState(Boolean(initialValues));
  const dailyCheckIn = useDailyCheckIn();
  const analytics = useDailyCheckInAnalytics();
  const entryPoint = route.params?.entryPoint ?? 'other';

  useEffect(() => {
    if (dailyCheckIn.isLoading || dailyCheckIn.error) {
      return;
    }

    analytics.start(dailyCheckIn.mode, entryPoint);
  }, [
    analytics,
    dailyCheckIn.error,
    dailyCheckIn.isLoading,
    dailyCheckIn.mode,
    entryPoint,
  ]);

  const submit = useCallback<DailyCheckInSubmit>(
    async (values: SubmitDailyCheckInRequest) => {
      const mode = dailyCheckIn.mode;
      const attemptNumber = analytics.submitStarted(mode);

      if (onSubmit) {
        try {
          await onSubmit(values);
          analytics.submitSucceeded(mode, attemptNumber);
          return;
        } catch (error) {
          analytics.submitFailed(mode, attemptNumber, 'unknown');
          throw error;
        }
      }

      try {
        await dailyCheckIn.submit(values);
        analytics.submitSucceeded(mode, attemptNumber);
      } catch (error) {
        const mappedError = mapDailyCheckInError(error);
        analytics.submitFailed(
          mode,
          attemptNumber,
          mapDailyCheckInAnalyticsError(mappedError.code),
        );
        throw error;
      }
    },
    [
      analytics,
      dailyCheckIn.error?.code,
      dailyCheckIn.mode,
      dailyCheckIn.submit,
      onSubmit,
    ],
  );

  const confirmExit = useCallback(() => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      'Leave check-in?',
      'Your answers will stay here while this screen is open, but they will not be saved yet.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [isDirty, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      Alert.alert('Leave check-in?', 'Your answers will not be saved yet.', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });

    return unsubscribe;
  }, [isDirty, navigation]);

  if (dailyCheckIn.isLoading && !dailyCheckIn.dailyCheckIn) {
    return <DailyCheckInLoading />;
  }

  if (dailyCheckIn.error && !dailyCheckIn.dailyCheckIn) {
    return (
      <DailyCheckInLoadError
        errorMessage={dailyCheckIn.error.message}
        onRetry={() => void dailyCheckIn.retry()}
      />
    );
  }

  return (
    <DailyCheckInFlow
      initialValues={dailyCheckIn.initialValues}
      mode={dailyCheckIn.mode}
      onClose={confirmExit}
      onDone={() => navigation.goBack()}
      onDirtyChange={setIsDirty}
      analytics={analytics}
      analyticsErrorCategory={
        dailyCheckIn.error
          ? mapDailyCheckInAnalyticsError(dailyCheckIn.error.code)
          : 'unknown'
      }
      entryPoint={entryPoint}
      onSubmit={submit}
    />
  );
}

function DailyCheckInLoading() {
  return (
    <Screen contentStyle={styles.stateContent}>
      <View
        accessibilityLabel="Loading today's check-in"
        style={styles.stateCard}
      >
        <ActivityIndicator
          accessibilityLabel="Daily check-in loading"
          color={colors.primary}
        />
        <Text accessibilityLiveRegion="polite" style={styles.stateText}>
          Checking in with your Coach...
        </Text>
      </View>
    </Screen>
  );
}

function DailyCheckInLoadError({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}) {
  return (
    <Screen contentStyle={styles.stateContent}>
      <Card style={styles.errorCard}>
        <Text accessibilityRole="header" variant="title">
          Check-in unavailable
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.stateText}>
          {errorMessage}
        </Text>
        <Button label="Try again" onPress={onRetry} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateContent: {
    justifyContent: 'center',
  },
  stateCard: {
    alignItems: 'center',
    gap: 14,
  },
  errorCard: {
    gap: 16,
  },
  stateText: {
    color: colors.mutedText,
  },
});
