import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DailyCheckIn,
  GetTodayDailyCheckInResponse,
  RecoverySnapshot,
  SubmitDailyCheckInRequest,
  SubmitDailyCheckInResponse,
} from '@elev9/types';

import { apiClient } from '../../../api/client';
import { useAuth } from '../../../auth/auth-provider';
import {
  mapDailyCheckInError,
  resolveDailyCheckInMode,
  type DailyCheckInUiError,
} from '../models/daily-check-in-integration';
import type { DailyCheckInMode } from '../models/daily-check-in-form-state';

export type UseDailyCheckInResult = {
  isLoading: boolean;
  isSubmitting: boolean;
  error: DailyCheckInUiError | null;
  mode: DailyCheckInMode;
  initialValues?: SubmitDailyCheckInRequest;
  dailyCheckIn: DailyCheckIn | null;
  recoverySnapshot: RecoverySnapshot | null;
  submit: (
    values: SubmitDailyCheckInRequest,
  ) => Promise<SubmitDailyCheckInResponse>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useDailyCheckIn(): UseDailyCheckInResult {
  const { status: authStatus, signOut } = useAuth();
  const requestIdRef = useRef(0);
  const submissionPromiseRef = useRef<
    Promise<SubmitDailyCheckInResponse> | undefined
  >();
  const mountedRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<DailyCheckInUiError | null>(null);
  const [todayState, setTodayState] =
    useState<GetTodayDailyCheckInResponse | null>(null);
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<RecoverySnapshot | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.progress.getTodayDailyCheckIn();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setTodayState(response);
    } catch (caughtError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const mappedError = mapDailyCheckInError(caughtError);
      setError(mappedError);

      if (mappedError.code === 'SESSION_EXPIRED') {
        await signOut();
      }

      if (__DEV__) {
        console.warn('[DailyCheckIn] today load failed', mappedError.code);
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [authStatus, signOut]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    (values: SubmitDailyCheckInRequest) => {
      if (submissionPromiseRef.current) {
        return submissionPromiseRef.current;
      }

      const request = (async () => {
        setIsSubmitting(true);
        setError(null);

        try {
          const response = await apiClient.progress.submitDailyCheckIn(values);

          if (mountedRef.current) {
            setTodayState({
              completedToday: true,
              dailyCheckIn: response.dailyCheckIn,
            });
            setRecoverySnapshot(
              (await apiClient.recovery.getTodayRecovery()).recoverySnapshot ??
                null,
            );
          }

          return response;
        } catch (caughtError) {
          const mappedError = mapDailyCheckInError(caughtError);

          if (mountedRef.current) {
            setError(mappedError);
          }

          if (mappedError.code === 'SESSION_EXPIRED') {
            await signOut();
          }

          if (__DEV__) {
            console.warn('[DailyCheckIn] submit failed', mappedError.code);
          }

          throw new Error(mappedError.message);
        } finally {
          if (mountedRef.current) {
            setIsSubmitting(false);
          }
          submissionPromiseRef.current = undefined;
        }
      })();

      submissionPromiseRef.current = request;

      return request;
    },
    [signOut],
  );

  const dailyCheckIn = todayState?.dailyCheckIn ?? null;

  return {
    isLoading,
    isSubmitting,
    error,
    mode: dailyCheckIn ? 'edit' : 'create',
    initialValues: dailyCheckIn ? toSubmitValues(dailyCheckIn) : undefined,
    dailyCheckIn,
    recoverySnapshot,
    submit,
    retry: refresh,
    refresh,
  };
}

function toSubmitValues(dailyCheckIn: DailyCheckIn): SubmitDailyCheckInRequest {
  return {
    energyLevel: dailyCheckIn.energyLevel,
    sleepQuality: dailyCheckIn.sleepQuality,
    muscleSoreness: dailyCheckIn.muscleSoreness,
    motivationLevel: dailyCheckIn.motivationLevel,
  };
}
