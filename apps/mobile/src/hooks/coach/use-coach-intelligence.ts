import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiClientError } from '@elev9/api-client';
import type { CoachIntelligenceAggregate } from '@elev9/types';

import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-provider';
import {
  buildCoachExplanation,
  buildCoachIntelligence,
  buildCoachPersonaGuidance,
  type CoachExplanation,
  type CoachPersonaProfile,
  type CoachUnifiedCoachIntelligence,
} from './coach-intelligence';
import {
  isCoachIntelligenceAggregate,
  mapAggregateExplainability,
  mapCoachIntelligenceAggregateToLegacyIntelligence,
  shouldFallbackToLegacyCoachIntelligence,
} from './coach-intelligence-helpers';

export type CoachIntelligenceMode =
  | 'loading'
  | 'canonical'
  | 'fallback'
  | 'disabled'
  | 'error';

export type CoachIntelligenceInput = Parameters<typeof buildCoachIntelligence>[0];

export type UseCoachIntelligenceResult = {
  aggregate: CoachIntelligenceAggregate | null;
  intelligence: CoachUnifiedCoachIntelligence | null;
  persona: CoachPersonaProfile | null;
  explanation: CoachExplanation | null;
  availability: CoachIntelligenceAggregate['availability'] | null;
  freshness: CoachIntelligenceAggregate['freshness'] | null;
  warnings: CoachIntelligenceAggregate['warnings'];
  mode: CoachIntelligenceMode;
  isFallbackUsed: boolean;
  isFeatureDisabled: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

const FEATURE_FLAG_ENABLED =
  process.env.EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED === 'true';

export function useCoachIntelligence(
  input: CoachIntelligenceInput | null,
): UseCoachIntelligenceResult {
  const { status: authStatus, signOut } = useAuth();
  const requestIdRef = useRef(0);

  const [aggregate, setAggregate] = useState<CoachIntelligenceAggregate | null>(
    null,
  );
  const [mode, setMode] = useState<CoachIntelligenceMode>(
    FEATURE_FLAG_ENABLED ? 'loading' : 'disabled',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const legacyIntelligence = useMemo(
    () => buildCoachIntelligence(input ?? { coachDecision: null, currentGoal: null }),
    [input],
  );
  const canonicalIntelligence = useMemo(
    () =>
      aggregate ? mapCoachIntelligenceAggregateToLegacyIntelligence(aggregate) : null,
    [aggregate],
  );
  const resolvedIntelligence =
    mode === 'canonical'
      ? canonicalIntelligence
      : mode === 'fallback' || mode === 'disabled'
        ? legacyIntelligence
        : mode === 'error'
          ? canonicalIntelligence
          : null;
  const persona = useMemo(() => {
    if (!resolvedIntelligence) {
      return null;
    }

    return buildCoachPersonaGuidance({
      intelligence: resolvedIntelligence,
      personalizationSnapshot: input?.personalizationSnapshot ?? null,
      currentGoal: input?.currentGoal ?? null,
    });
  }, [input?.currentGoal, input?.personalizationSnapshot, resolvedIntelligence]);
  const explanation = useMemo(() => {
    if (!resolvedIntelligence) {
      return null;
    }

    if (mode === 'canonical' && aggregate) {
      return mapAggregateExplainability(aggregate);
    }

    return buildCoachExplanation({
      intelligence: resolvedIntelligence,
      persona,
    });
  }, [aggregate, mode, persona, resolvedIntelligence]);

  const loadCanonicalAggregate = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!FEATURE_FLAG_ENABLED) {
        setMode('disabled');
        setErrorMessage(null);
        return;
      }

      if (authStatus !== 'authenticated') {
        setMode('loading');
        setErrorMessage(null);
        return;
      }

      const requestId = ++requestIdRef.current;

      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setMode((current) => (current === 'disabled' ? current : 'loading'));
        setErrorMessage(null);
      }

      try {
        const response = await apiClient.ai.getCoachIntelligence();

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!isCoachIntelligenceAggregate(response)) {
          throw new Error('Malformed coach intelligence aggregate.');
        }

        setAggregate(response);
        setMode('canonical');
        setErrorMessage(null);
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (error instanceof ApiClientError) {
          if (error.code === 'AUTH_INVALID_SESSION' || error.status === 401) {
            await signOut();
            return;
          }

          if (shouldFallbackToLegacyCoachIntelligence(error)) {
            setMode('fallback');
            setErrorMessage(null);
            return;
          }
        }

        setMode('error');
        setErrorMessage('Coach insight unavailable.');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [authStatus, signOut],
  );

  useEffect(() => {
    void loadCanonicalAggregate();
  }, [loadCanonicalAggregate]);

  const availability = aggregate?.availability ?? null;
  const freshness = aggregate?.freshness ?? null;
  const warnings = aggregate?.warnings ?? [];
  const isFeatureDisabled = !FEATURE_FLAG_ENABLED;
  const isFallbackUsed = Boolean(
    aggregate?.metadata.fallbackUsed ||
      aggregate?.availability.fallbackUsed ||
      mode === 'fallback',
  );
  const isLoading =
    (FEATURE_FLAG_ENABLED && mode === 'loading') ||
    (!FEATURE_FLAG_ENABLED && legacyIntelligence === null) ||
    (mode === 'fallback' && legacyIntelligence === null) ||
    (mode === 'error' && resolvedIntelligence === null && aggregate === null);

  return {
    aggregate,
    intelligence: resolvedIntelligence,
    persona,
    explanation,
    availability,
    freshness,
    warnings,
    mode,
    isFallbackUsed,
    isFeatureDisabled,
    isLoading,
    isRefreshing,
    errorMessage: resolvedIntelligence ? null : errorMessage,
    refresh: async () => {
      await loadCanonicalAggregate({ refresh: true });
    },
    retry: async () => {
      await loadCanonicalAggregate({ refresh: true });
    },
  };
}
