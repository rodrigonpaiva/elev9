import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SubmitDailyCheckInRequest } from '@elev9/types';

import {
  DailyCheckInFlow,
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
  const mode = route.params?.mode ?? 'create';
  const initialValues = route.params?.initialValues;
  const [isDirty, setIsDirty] = useState(Boolean(initialValues));
  const submit = useCallback<DailyCheckInSubmit>(
    async (values: SubmitDailyCheckInRequest) => {
      if (onSubmit) {
        await onSubmit(values);
        return;
      }

      throw new Error(
        'Daily Check-in is ready for the Prompt 5 API integration.',
      );
    },
    [onSubmit],
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

  return (
    <DailyCheckInFlow
      initialValues={initialValues}
      mode={mode}
      onClose={confirmExit}
      onDone={() => navigation.goBack()}
      onDirtyChange={setIsDirty}
      onSubmit={submit}
    />
  );
}
