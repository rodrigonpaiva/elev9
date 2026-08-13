import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RecoveryExperienceInsightAction } from '@elev9/types';

import { productAnalytics } from '../../../analytics/product-analytics';
import { useRecoveryExperience } from '../hooks/use-recovery-experience';
import { RecoveryScreen } from './recovery-screen';
import type { RootStackParamList } from '../../../navigation/app-navigator';

export function RecoveryScreenContainer() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recovery = useRecoveryExperience();
  const hasFocused = useRef(false);

  useEffect(() => {
    productAnalytics.track('recovery_screen_viewed', { entryPoint: 'unknown' });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }

      void recovery.refresh();
    }, [recovery.refresh]),
  );

  const openDailyCheckIn = useCallback(() => {
    productAnalytics.track('recovery_check_in_cta_selected', {
      entryPoint: 'recovery',
    });
    navigation.navigate('DailyCheckIn', { entryPoint: 'other' });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    productAnalytics.track('recovery_refresh_requested', {
      trigger: 'pull_to_refresh',
    });
    return recovery.refresh();
  }, [recovery.refresh]);

  const handleRetry = useCallback(() => {
    productAnalytics.track('recovery_retry_requested', {
      resource: 'current_and_history',
    });
    return recovery.retry();
  }, [recovery.retry]);

  const handleRetryHistory = useCallback(() => {
    productAnalytics.track('recovery_history_retry_requested', {
      resource: 'history',
    });
    return recovery.retryHistory();
  }, [recovery.retryHistory]);

  const handleInsightAction = useCallback(
    (action: RecoveryExperienceInsightAction) => {
      if (action === 'complete_check_in') {
        openDailyCheckIn();
      }
    },
    [openDailyCheckIn],
  );

  return (
    <RecoveryScreen
      onBack={() => navigation.goBack()}
      onCompleteCheckIn={openDailyCheckIn}
      onInsightAction={handleInsightAction}
      onRefresh={() => void handleRefresh()}
      onRetry={() => void handleRetry()}
      onRetryHistory={() => void handleRetryHistory()}
      state={recovery.screenState}
    />
  );
}
