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
import { useAuth } from '../../../auth/auth-provider';
import { getSessionOwnerKey } from '../../../storage/session-owner-storage';
import {
  getRecoveryCacheAge,
  recoveryCache,
  type RecoveryCache,
} from '../cache/recovery-cache';
import {
  buildRecoveryScreenState,
  isRecoverableRecoveryNetworkError,
  mapRecoveryExperienceError,
  type RecoveryCurrentResource,
  type RecoveryHistoryResource,
} from '../models/recovery-screen-state-mapper';
import type { RecoveryScreenState } from '../models/recovery-screen-state';

export type RecoveryExperienceApi = {
  getCurrentRecoveryExperience: () => Promise<GetCurrentRecoveryExperienceResponse>;
  getRecoveryExperienceHistory: (input?: {
    days?: number;
  }) => Promise<GetRecoveryExperienceHistoryResponse>;
};

export type UseRecoveryExperienceResult = {
  screenState: RecoveryScreenState;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  retryHistory: () => Promise<void>;
};

type RecoveryExperienceOwnerKeyProvider = () => Promise<string | null>;

type LoadOptions = {
  current: boolean;
  history: boolean;
  preserveContent: boolean;
};

const defaultApi: RecoveryExperienceApi = {
  getCurrentRecoveryExperience: () =>
    apiClient.recovery.getCurrentRecoveryExperience(),
  getRecoveryExperienceHistory: (input) =>
    apiClient.recovery.getRecoveryExperienceHistory(input),
};

export function useRecoveryExperience(
  injectedApi: RecoveryExperienceApi = defaultApi,
  injectedCache: RecoveryCache = recoveryCache,
  ownerKeyProvider: RecoveryExperienceOwnerKeyProvider = getSessionOwnerKey,
): UseRecoveryExperienceResult {
  const { status: authStatus } = useAuth();
  const [current, setCurrent] = useState<RecoveryCurrentResource>({
    status: 'loading',
  });
  const [history, setHistory] = useState<RecoveryHistoryResource>({
    status: 'loading',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const operationRef = useRef<Promise<void> | null>(null);
  const sessionGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    sessionGenerationRef.current += 1;
    operationRef.current = null;
    if (authStatus !== 'authenticated') {
      setCurrent({ status: 'loading' });
      setHistory({ status: 'loading' });
    }
  }, [authStatus]);

  const load = useCallback(
    (options: LoadOptions): Promise<void> => {
      if (operationRef.current) {
        return operationRef.current;
      }

      if (authStatus !== 'authenticated') return Promise.resolve();

      const sessionGeneration = sessionGenerationRef.current;

      if (!options.preserveContent) {
        if (options.current) setCurrent({ status: 'loading' });
        if (options.history) setHistory({ status: 'loading' });
      }
      if (options.preserveContent) {
        setIsRefreshing(true);
      }

      const operation = Promise.all([
        options.current
          ? loadCurrent(
              injectedApi,
              injectedCache,
              ownerKeyProvider,
              mountedRef,
              sessionGenerationRef,
              sessionGeneration,
              setCurrent,
            )
          : Promise.resolve(),
        options.history
          ? loadHistory(
              injectedApi,
              injectedCache,
              ownerKeyProvider,
              mountedRef,
              sessionGenerationRef,
              sessionGeneration,
              setHistory,
            )
          : Promise.resolve(),
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
    [authStatus, injectedApi, injectedCache, ownerKeyProvider],
  );

  useEffect(() => {
    void load({ current: true, history: true, preserveContent: false });
  }, [authStatus, load]);

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
  injectedCache: RecoveryCache,
  ownerKeyProvider: RecoveryExperienceOwnerKeyProvider,
  mountedRef: { current: boolean },
  sessionGenerationRef: { current: number },
  sessionGeneration: number,
  setCurrent: Dispatch<SetStateAction<RecoveryCurrentResource>>,
) {
  const ownerKey = await ownerKeyProvider();
  try {
    const response = await injectedApi.getCurrentRecoveryExperience();
    if (
      mountedRef.current &&
      sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)
    ) {
      if (ownerKey) await injectedCache.writeCurrent(ownerKey, response);
      if (sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)) {
        setCurrent({ status: 'success', response, dataSource: 'network' });
      }
    }
  } catch (error) {
    if (
      mountedRef.current &&
      sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)
    ) {
      if (ownerKey && isRecoverableRecoveryNetworkError(error)) {
        const cached = await injectedCache.read(ownerKey);
        if (cached?.current) {
          const cacheAge = getRecoveryCacheAge(cached.savedAt);
          if (cacheAge !== 'expired') {
            setCurrent({
              status: 'success',
              response: cached.current,
              dataSource: 'cache',
              cacheSavedAt: cached.savedAt,
              cacheAge,
            });
            return;
          }
        }
      }
      setCurrent((previous) => {
        const message = mapRecoveryExperienceError(error);

        if (previous.status === 'success' && previous.response.recovery) {
          return { ...previous, errorMessage: message };
        }

        return {
          status: 'error',
          message: isRecoverableRecoveryNetworkError(error)
            ? 'You’re offline. Reconnect to load your Recovery.'
            : message,
          isRetrying: false,
        };
      });
    }
  }
}

async function loadHistory(
  injectedApi: RecoveryExperienceApi,
  injectedCache: RecoveryCache,
  ownerKeyProvider: RecoveryExperienceOwnerKeyProvider,
  mountedRef: { current: boolean },
  sessionGenerationRef: { current: number },
  sessionGeneration: number,
  setHistory: Dispatch<SetStateAction<RecoveryHistoryResource>>,
) {
  const ownerKey = await ownerKeyProvider();
  try {
    const response = await injectedApi.getRecoveryExperienceHistory({
      days: 7,
    });
    if (
      mountedRef.current &&
      sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)
    ) {
      if (ownerKey) await injectedCache.writeHistory(ownerKey, response);
      if (sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)) {
        setHistory({ status: 'success', response, dataSource: 'network' });
      }
    }
  } catch (error) {
    if (
      mountedRef.current &&
      sessionGenerationIsCurrent(sessionGenerationRef, sessionGeneration)
    ) {
      if (ownerKey && isRecoverableRecoveryNetworkError(error)) {
        const cached = await injectedCache.read(ownerKey);
        if (cached?.history) {
          const cacheAge = getRecoveryCacheAge(
            cached.historySavedAt ?? cached.savedAt,
          );
          if (cacheAge !== 'expired') {
            setHistory({
              status: 'success',
              response: cached.history,
              dataSource: 'cache',
              cacheSavedAt: cached.historySavedAt ?? cached.savedAt,
              cacheAge,
            });
            return;
          }
        }
      }
      setHistory({
        status: 'error',
        message: isRecoverableRecoveryNetworkError(error)
          ? 'You’re offline. Recovery history is unavailable.'
          : mapRecoveryExperienceError(error),
      });
    }
  }
}

function sessionGenerationIsCurrent(
  sessionGenerationRef: { current: number },
  sessionGeneration: number,
): boolean {
  return sessionGenerationRef.current === sessionGeneration;
}
