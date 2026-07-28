import { useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RecoveryExperienceInsightAction } from '@elev9/types';

import {
  useRecoveryExperience,
} from '../hooks/use-recovery-experience';
import { RecoveryScreen } from './recovery-screen';
import type { RootStackParamList } from '../../../navigation/app-navigator';

export function RecoveryScreenContainer() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recovery = useRecoveryExperience();
  const hasFocused = useRef(false);

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
    navigation.navigate('DailyCheckIn', { entryPoint: 'other' });
  }, [navigation]);

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
      onRefresh={() => void recovery.refresh()}
      onRetry={() => void recovery.retry()}
      onRetryHistory={() => void recovery.retryHistory()}
      state={recovery.screenState}
    />
  );
}

