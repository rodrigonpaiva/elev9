import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';

import { apiClient } from '../../../api/client';
import {
  buildRecoveryScreenState,
  mapRecoveryExperienceError,
  type RecoveryCurrentResource,
  type RecoveryHistoryResource,
} from '../models/recovery-screen-state-mapper';
import type { RecoveryScreenState } from '../models/recovery-screen-state';

export type RecoveryExperienceApi = {
  getCurrentRecoveryExperience: () => Promise<GetCurrentRecoveryExperienceResponse>;
  getRecoveryExperienceHistory: (input?: { days?: number }) => Promise<GetRecoveryExperienceHistoryResponse>;
};

export type UseRecoveryExperienceResult = {
  screenState: RecoveryScreenState;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  retryHistory: () => Promise<void>;
};

type LoadOptions = {
  current: boolean;
  history: boolean;
  preserveContent: boolean;
};

const defaultApi: RecoveryExperienceApi = {
  getCurrentRecoveryExperience: () => apiClient.recovery.getCurrentRecoveryExperience(),
  getRecoveryExperienceHistory: (input) =>
    apiClient.recovery.getRecoveryExperienceHistory(input),
};

export function useRecoveryExperience(
  injectedApi: RecoveryExperienceApi = defaultApi,
): UseRecoveryExperienceResult {
  const [current, setCurrent] = useState<RecoveryCurrentResource>({ status: 'loading' });
  const [history, setHistory] = useState<RecoveryHistoryResource>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const operationRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    (options: LoadOptions): Promise<void> => {
      if (operationRef.current) {
        return operationRef.current;
      }

      if (!options.preserveContent) {
        if (options.current) setCurrent({ status: 'loading' });
        if (options.history) setHistory({ status: 'loading' });
      }
      if (options.preserveContent) {
        setIsRefreshing(true);
      }

      const operation = Promise.all([
        options.current ? loadCurrent(injectedApi, mountedRef, setCurrent) : Promise.resolve(),
        options.history ? loadHistory(injectedApi, mountedRef, setHistory) : Promise.resolve(),
      ])
        .then(() => undefined)
        .finally(() => {
          if (mountedRef.current) {
            setIsRefreshing(false);
          }
          operationRef.current = null;
        });

      operationRef.current = operation;
      return operation;
    },
    [injectedApi],
  );

  useEffect(() => {
    void load({ current: true, history: true, preserveContent: false });
  }, [load]);

  const refresh = useCallback(
    () => load({ current: true, history: true, preserveContent: true }),
    [load],
  );
  const retry = useCallback(
    () => load({ current: true, history: true, preserveContent: false }),
    [load],
  );
  const retryHistory = useCallback(
    () => load({ current: false, history: true, preserveContent: false }),
    [load],
  );

  const screenState = useMemo(
    () => buildRecoveryScreenState({ current, history, isRefreshing }),
    [current, history, isRefreshing],
  );

  return { screenState, refresh, retry, retryHistory };
}

async function loadCurrent(
  injectedApi: RecoveryExperienceApi,
  mountedRef: { current: boolean },
  setCurrent: Dispatch<SetStateAction<RecoveryCurrentResource>>,
) {
  try {
    const response = await injectedApi.getCurrentRecoveryExperience();
    if (mountedRef.current) {
      setCurrent({ status: 'success', response });
    }
  } catch (error) {
    if (mountedRef.current) {
      setCurrent((previous) => {
        const message = mapRecoveryExperienceError(error);

        if (previous.status === 'success' && previous.response.recovery) {
          return { ...previous, errorMessage: message };
        }

        return { status: 'error', message, isRetrying: false };
      });
    }
  }
}

async function loadHistory(
  injectedApi: RecoveryExperienceApi,
  mountedRef: { current: boolean },
  setHistory: Dispatch<SetStateAction<RecoveryHistoryResource>>,
) {
  try {
    const response = await injectedApi.getRecoveryExperienceHistory({ days: 7 });
    if (mountedRef.current) {
      setHistory({ status: 'success', response });
    }
  } catch (error) {
    if (mountedRef.current) {
      setHistory({ status: 'error', message: mapRecoveryExperienceError(error) });
    }
  }
}
