import { useCallback, useEffect, useMemo, useState } from 'react';
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
  useDailyCheckInOffline,
  type DailyCheckInSubmit,
} from '../features/daily-check-in';
import type { RootStackParamList } from '../navigation/app-navigator';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import { isTemporaryDailyCheckInSyncError } from '../features/daily-check-in/offline/daily-check-in-sync-machine';
import { classifySyncError } from '../features/daily-check-in/offline/daily-check-in-sync-service';

export type DailyCheckInScreenProps = {
  onSubmit?: DailyCheckInSubmit;
};

type DailyCheckInRoute = RouteProp<RootStackParamList, 'DailyCheckIn'>;

export function DailyCheckInScreen({ onSubmit }: DailyCheckInScreenProps = {}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<DailyCheckInRoute>();
  const initialValues = route.params?.initialValues;
  const { status: authStatus } = useAuth();
  const [isDirty, setIsDirty] = useState(Boolean(initialValues));
  const dailyCheckIn = useDailyCheckIn();
  const analytics = useDailyCheckInAnalytics();
  const entryPoint = route.params?.entryPoint ?? 'other';
  const syncApi = useMemo(
    () => ({
      submitDailyCheckIn: apiClient.progress.submitDailyCheckIn,
      getTodayDailyCheckIn: apiClient.progress.getTodayDailyCheckIn,
      getTodayRecovery: apiClient.recovery.getTodayRecovery,
    }),
    [],
  );
  const offline = useDailyCheckInOffline({
    api: syncApi,
    authStatus,
    onSynced: dailyCheckIn.refresh,
  });
  const { clearDraft, pending } = offline;

  useEffect(() => {
    if (!dailyCheckIn.isLoading && !dailyCheckIn.dailyCheckIn && !pending) {
      void clearDraft();
    }
  }, [clearDraft, dailyCheckIn.dailyCheckIn, dailyCheckIn.isLoading, pending]);

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

      await offline.enqueue(values);

      if (onSubmit) {
        try {
          await onSubmit(values);
          await offline.clearAfterSuccess();
          analytics.submitSucceeded(mode, attemptNumber);
          return;
        } catch (error) {
          analytics.submitFailed(mode, attemptNumber, 'unknown');
          throw error;
        }
      }

      try {
        await dailyCheckIn.submit(values);
        await offline.clearAfterSuccess();
        analytics.submitSucceeded(mode, attemptNumber);
      } catch (error) {
        const mappedError = mapDailyCheckInError(error);
        const category = mapDailyCheckInAnalyticsError(mappedError.code);

        if (isTemporaryDailyCheckInSyncError(classifySyncError(error))) {
          analytics.submitFailed(mode, attemptNumber, category);
          return 'queued';
        }

        await offline.markFailed(category);
        analytics.submitFailed(mode, attemptNumber, category);
        throw error;
      }
    },
    [
      analytics,
      dailyCheckIn.error?.code,
      dailyCheckIn.mode,
      dailyCheckIn.submit,
      offline,
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

  const effectiveInitialValues =
    offline.pending?.payload ??
    (dailyCheckIn.dailyCheckIn
      ? dailyCheckIn.initialValues
      : (offline.draft?.values ?? initialValues));

  if (dailyCheckIn.isLoading || offline.isHydrating) {
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
      initialValues={effectiveInitialValues}
      mode={dailyCheckIn.mode}
      onClose={confirmExit}
      onDone={() => navigation.goBack()}
      onDirtyChange={setIsDirty}
      analytics={analytics}
      analyticsErrorCategory={
        offline.errorCategory ??
        (dailyCheckIn.error
          ? mapDailyCheckInAnalyticsError(dailyCheckIn.error.code)
          : 'unknown')
      }
      entryPoint={entryPoint}
      offlineState={offline.state}
      onDiscardPending={() => void offline.discard('pending')}
      onDraftChange={offline.saveDraft}
      onSyncPending={() => void offline.sync('manual')}
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
