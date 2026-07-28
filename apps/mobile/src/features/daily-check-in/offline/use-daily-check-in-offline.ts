import { AppState, type AppStateStatus } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SubmitDailyCheckInRequest } from '@elev9/types';

import { productAnalytics } from '../../../analytics/product-analytics';
import {
  DailyCheckInSyncService,
  type DailyCheckInSyncApi,
  type DailyCheckInSyncResult,
  type DailyCheckInSyncTrigger,
} from './daily-check-in-sync-service';
import {
  dailyCheckInStorage,
  type DailyCheckInStorage,
} from './daily-check-in-storage';
import type {
  DailyCheckInDraft,
  DailyCheckInOfflineState,
  PendingDailyCheckInSubmission,
} from './daily-check-in-storage.types';

export type UseDailyCheckInOfflineOptions = {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  api: DailyCheckInSyncApi;
  onSynced?: () => Promise<void>;
  storage?: DailyCheckInStorage;
};

export type UseDailyCheckInOfflineResult = {
  isHydrating: boolean;
  draft: DailyCheckInDraft | null;
  pending: PendingDailyCheckInSubmission | null;
  state: DailyCheckInOfflineState;
  errorCategory: PendingDailyCheckInSubmission['lastErrorCategory'] | null;
  saveDraft: (values: Partial<SubmitDailyCheckInRequest>) => void;
  enqueue: (payload: SubmitDailyCheckInRequest) => Promise<void>;
  sync: (trigger: DailyCheckInSyncTrigger) => Promise<DailyCheckInSyncResult>;
  discard: (source?: 'draft' | 'pending') => Promise<void>;
  clearAfterSuccess: () => Promise<void>;
  clearDraft: () => Promise<void>;
  markFailed: (
    category: PendingDailyCheckInSubmission['lastErrorCategory'],
  ) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useDailyCheckInOffline({
  authStatus,
  api,
  onSynced,
  storage = dailyCheckInStorage,
}: UseDailyCheckInOfflineOptions): UseDailyCheckInOfflineResult {
  const serviceRef = useRef<DailyCheckInSyncService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DailyCheckInSyncService(api, storage);
  }

  const [isHydrating, setIsHydrating] = useState(true);
  const [draft, setDraft] = useState<DailyCheckInDraft | null>(null);
  const [pending, setPending] = useState<PendingDailyCheckInSubmission | null>(
    null,
  );
  const [state, setState] = useState<DailyCheckInOfflineState>('idle');
  const [errorCategory, setErrorCategory] = useState<
    PendingDailyCheckInSubmission['lastErrorCategory'] | null
  >(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const initialSyncAttemptedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      return;
    }

    const [nextDraft, nextPending] = await Promise.all([
      storage.getDraft(),
      storage.getPending(),
    ]);

    if (!mountedRef.current) {
      return;
    }

    setDraft(nextDraft);
    setPending(nextPending);
    setErrorCategory(nextPending?.lastErrorCategory ?? null);
    setState(
      nextPending
        ? nextPending.status === 'failed'
          ? 'failed'
          : 'queued'
        : nextDraft
          ? 'draft'
          : 'idle',
    );

    if (nextPending) {
      productAnalytics.track('daily_check_in_draft_restored', {
        source: 'pending',
      });
    } else if (nextDraft) {
      productAnalytics.track('daily_check_in_draft_restored', {
        source: 'draft',
      });
    }
  }, [authStatus, storage]);

  useEffect(() => {
    mountedRef.current = true;
    if (authStatus === 'authenticated') {
      setIsHydrating(true);
      void refresh()
        .then(() => {
          if (mountedRef.current) {
            setIsHydrating(false);
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setIsHydrating(false);
            setState('failed');
          }
        });
    } else if (authStatus === 'unauthenticated') {
      setIsHydrating(false);
      setDraft(null);
      setPending(null);
      setState('idle');
    }

    return () => {
      mountedRef.current = false;
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [authStatus, refresh]);

  const saveDraft = useCallback(
    (values: Partial<SubmitDailyCheckInRequest>) => {
      setDraft({ version: 1, values, savedAt: new Date().toISOString() });
      setState((current) =>
        current === 'queued' || current === 'syncing' ? current : 'draft',
      );

      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }

      draftTimerRef.current = setTimeout(() => {
        void storage.saveDraft(values).catch(() => undefined);
      }, 150);
    },
    [storage],
  );

  const enqueue = useCallback(async (payload: SubmitDailyCheckInRequest) => {
    initialSyncAttemptedRef.current = true;
    const nextPending = await serviceRef.current!.enqueue(payload);
    if (!mountedRef.current) {
      return;
    }

    setDraft(null);
    setPending(nextPending);
    setErrorCategory(null);
    setState('queued');
    productAnalytics.track('daily_check_in_queued', { trigger: 'manual' });
  }, []);

  const sync = useCallback(
    async (trigger: DailyCheckInSyncTrigger) => {
      const currentPending = await storage.getPending();
      if (currentPending) {
        productAnalytics.track('daily_check_in_sync_started', {
          trigger,
          attemptNumber: currentPending.attemptCount + 1,
        });
      }

      if (mountedRef.current) {
        setState((current) => (current === 'draft' ? current : 'syncing'));
      }

      const result = await serviceRef.current!.sync(trigger);
      if (!mountedRef.current) {
        return result;
      }

      if (result.state === 'synced') {
        setPending(null);
        setDraft(null);
        setErrorCategory(null);
        setState('synced');
        productAnalytics.track('daily_check_in_sync_succeeded', {
          trigger,
          attemptNumber: currentPending?.attemptCount
            ? currentPending.attemptCount + 1
            : 1,
        });
        await onSynced?.();
      } else if (result.state === 'failed') {
        const latestPending = await storage.getPending();
        setPending(latestPending);
        setErrorCategory(result.errorCategory ?? 'unknown');
        setState('failed');
        productAnalytics.track('daily_check_in_sync_failed', {
          trigger,
          attemptNumber: latestPending?.attemptCount ?? 1,
          errorCategory: result.errorCategory ?? 'unknown',
        });
      } else if (result.state === 'queued') {
        const latestPending = await storage.getPending();
        setPending(latestPending);
        setErrorCategory(result.errorCategory ?? null);
        setState('queued');
        productAnalytics.track('daily_check_in_sync_failed', {
          trigger,
          attemptNumber: latestPending?.attemptCount ?? 1,
          errorCategory: result.errorCategory ?? 'unknown',
        });
      }

      return result;
    },
    [onSynced, storage],
  );

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void sync('foreground').catch(() => undefined);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [authStatus, sync]);

  useEffect(() => {
    if (
      authStatus === 'authenticated' &&
      !isHydrating &&
      pending?.status === 'pending' &&
      !initialSyncAttemptedRef.current
    ) {
      initialSyncAttemptedRef.current = true;
      void sync('initial_load').catch(() => undefined);
    }
    if (authStatus !== 'authenticated') {
      initialSyncAttemptedRef.current = false;
    }
  }, [authStatus, isHydrating, pending?.status, sync]);

  const discard = useCallback(
    async (source: 'draft' | 'pending' = pending ? 'pending' : 'draft') => {
      await serviceRef.current!.discard();
      setDraft(null);
      setPending(null);
      setErrorCategory(null);
      setState('idle');
      productAnalytics.track('daily_check_in_pending_discarded', { source });
    },
    [pending],
  );

  const clearAfterSuccess = useCallback(async () => {
    await storage.clearAll();
    setDraft(null);
    setPending(null);
    setErrorCategory(null);
    setState('synced');
  }, [storage]);

  const clearDraft = useCallback(async () => {
    await storage.clearDraft();
    setDraft(null);
    setState((current) => (current === 'draft' ? 'idle' : current));
  }, [storage]);

  const markFailed = useCallback(
    async (category: PendingDailyCheckInSubmission['lastErrorCategory']) => {
      await storage.markPendingFailed(category);
      if (mountedRef.current) {
        setPending((current) =>
          current
            ? { ...current, status: 'failed', lastErrorCategory: category }
            : current,
        );
        setErrorCategory(category ?? 'unknown');
        setState('failed');
      }
    },
    [storage],
  );

  return {
    isHydrating,
    draft,
    pending,
    state,
    errorCategory,
    saveDraft,
    enqueue,
    sync,
    discard,
    clearAfterSuccess,
    clearDraft,
    markFailed,
    refresh,
  };
}
