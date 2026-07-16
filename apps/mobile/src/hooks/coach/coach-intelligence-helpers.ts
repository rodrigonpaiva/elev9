import { ApiClientError } from '@elev9/api-client';
import type {
  CoachExplanation as SharedCoachExplanation,
  CoachIntelligenceAggregate,
} from '@elev9/types';

import type {
  CoachExplanation,
  CoachUnifiedCoachIntelligence,
} from './coach-intelligence';

export function shouldFallbackToLegacyCoachIntelligence(
  error: ApiClientError,
): boolean {
  if (error.code === 'COACH_INTELLIGENCE_FEATURE_DISABLED') {
    return true;
  }

  if (error.code === 'NETWORK_ERROR') {
    return true;
  }

  if (error.code === 'NOT_FOUND') {
    return true;
  }

  return error.status >= 500 && error.status < 600;
}

export function mapCoachIntelligenceAggregateToLegacyIntelligence(
  aggregate: CoachIntelligenceAggregate,
): CoachUnifiedCoachIntelligence {
  return {
    primaryExpert: aggregate.ownership.primaryExpert,
    participatingExperts: aggregate.ownership.participatingExperts,
    summary: aggregate.insight.summary,
    keyFindings: aggregate.insight.keyFindings,
    recommendations: aggregate.insight.recommendations,
    risks: aggregate.insight.risks,
    confidence: aggregate.insight.confidence,
    conflicts: aggregate.insight.conflicts,
    supportingExperts: aggregate.ownership.supportingExperts,
    metadata: {
      source: 'legacy',
      generatedAt: aggregate.header.generatedAt,
      updatedAt: aggregate.header.generatedAt,
      executionDurationMs:
        aggregate.explainability.metadata.durationMs ?? 0,
    },
    currentFocus: aggregate.insight.currentFocus,
    currentRisk: aggregate.insight.currentRisk,
    topRecommendation: aggregate.insight.topRecommendation,
    supportingEvidenceSummary:
      aggregate.explainability.summary || aggregate.insight.summary,
    evidence: aggregate.evidence,
  };
}

export function mapAggregateExplainability(
  aggregate: CoachIntelligenceAggregate,
): CoachExplanation {
  return aggregate.explainability as SharedCoachExplanation as CoachExplanation;
}

export function isCoachIntelligenceAggregate(
  value: unknown,
): value is CoachIntelligenceAggregate {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CoachIntelligenceAggregate>;

  return Boolean(
    candidate.header &&
      candidate.ownership &&
      candidate.insight &&
      candidate.explainability &&
      candidate.availability &&
      candidate.freshness &&
      candidate.sections &&
      candidate.metadata &&
      Array.isArray(candidate.evidence) &&
      Array.isArray(candidate.warnings),
  );
}
