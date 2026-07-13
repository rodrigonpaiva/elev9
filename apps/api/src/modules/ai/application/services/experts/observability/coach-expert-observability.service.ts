import { Injectable } from '@nestjs/common';

import type { AgentPolicyEvaluation } from '../../policies/agent-policy.types';
import type { CoachExpertCompositionResult } from '../composition/coach-expert-composition.types';
import type { CoachPersonaGuidance } from '../../persona/coach-persona-engine.types';
import type { CoachExplanation } from '../../explainability/coach-explainability.types';
import type { CoachExpertResult } from '../coach-expert.types';
import type { CoachExpertContribution } from '../coach-expert.types';
import type {
  CoachExpertConflictSummary,
  CoachExpertContributionSummary,
  CoachExpertExecutionStatus,
  CoachExpertExecutionSummary,
  CoachExpertHealthSummary,
  CoachExpertLatencySummary,
  CoachExpertMetrics,
  CoachExpertObservabilityCompleteInput,
  CoachExpertObservabilityStartInput,
  CoachExpertTrace,
  CoachExpertTraceCandidateSnapshot,
  CoachExpertTraceStatus,
} from './coach-expert-observability.types';
import { CoachExpertRetentionPolicy } from './coach-expert-observability.policy';

type StoredCoachExpertTrace = CoachExpertTrace & {
  createdAtMs: number;
  updatedAtMs: number;
  candidateExpertSnapshots: readonly CoachExpertTraceCandidateSnapshot[];
};

const EMPTY_CONTRIBUTION_SUMMARY: CoachExpertContributionSummary =
  Object.freeze({
    recommendations: 0,
    risks: 0,
    findings: 0,
    alerts: 0,
    strengths: 0,
    weaknesses: 0,
    confidence: 'UNKNOWN',
    metadata: Object.freeze({
      source: 'empty',
    }),
  });

const EMPTY_LATENCY_SUMMARY: CoachExpertLatencySummary = Object.freeze({
  routing: 0,
  execution: 0,
  composition: 0,
  persona: 0,
  explainability: 0,
  promptAssembly: 0,
  total: 0,
});

@Injectable()
export class CoachExpertObservabilityService {
  private readonly traces = new Map<string, StoredCoachExpertTrace>();
  private readonly retentionPolicy = new CoachExpertRetentionPolicy();

  startTrace(input: CoachExpertObservabilityStartInput): CoachExpertTrace {
    const now = Date.now();
    this.pruneRetentionState(now);

    const candidateExpertSnapshots = input.candidateExperts.map((expert) =>
      this.freezeValue({
        expertId: expert.id,
        displayName: expert.displayName,
        enabled: expert.enabled,
        estimatedLatencyMs: expert.estimatedLatencyMs,
        priority: expert.priority,
      }),
    );
    const candidateExpertIds = candidateExpertSnapshots.map(
      (expert) => expert.expertId,
    );
    const blockedExpertIds = this.uniqueValues([
      ...input.routingDecision.blockedExperts.map((expert) => expert.id),
      ...input.routingDecision.metadata.blockedExpertIds,
      ...input.policyEvaluation.decision.metadata.blockedExpertIds,
    ]);
    const skippedExpertIds = this.uniqueValues([
      ...input.routingDecision.skippedExperts.map((expert) => expert.id),
      ...input.routingDecision.metadata.skippedExpertIds,
    ]);
    const routedExpertIds = this.uniqueValues(
      input.routingDecision.orderedExperts.map((expert) => expert.id),
    );
    const primaryExpert = input.routingDecision.primaryExpert?.id;
    const participatingExperts = this.uniqueValues(
      input.routingDecision.orderedExperts
        .map((expert) => expert.id)
        .filter((expertId) => !blockedExpertIds.includes(expertId)),
    );
    const supportingExperts = participatingExperts.filter(
      (expertId) => expertId !== primaryExpert,
    );

    const trace = this.buildTrace({
      traceId: input.requestId,
      requestId: input.requestId,
      conversationId: input.conversationId,
      intent: input.intent,
      selectedDomains: input.selectedDomains,
      candidateExpertIds,
      routedExpertIds,
      executedExpertIds: [],
      skippedExpertIds,
      blockedExpertIds,
      failedExpertIds: [],
      primaryExpert,
      participatingExperts,
      supportingExperts,
      executionSummaries: [],
      contributionSummary: EMPTY_CONTRIBUTION_SUMMARY,
      latencySummary: this.freezeValue({
        ...EMPTY_LATENCY_SUMMARY,
        routing: input.runtimeMetadata.routingDurationMs ?? 0,
        total: input.runtimeMetadata.totalDurationMs ?? 0,
      }),
      conflicts: [],
      metrics: this.buildMetrics({
        totalExperts: candidateExpertIds.length,
        selectedExperts: routedExpertIds.length,
        executedExperts: 0,
        skippedExperts: skippedExpertIds.length,
        blockedExperts: blockedExpertIds.length,
        failedExperts: 0,
        averageLatency: 0,
        totalLatency: 0,
        primaryExpert,
        compositionDuration: input.runtimeMetadata.compositionDurationMs ?? 0,
        personaDuration: input.runtimeMetadata.personaDurationMs ?? 0,
        explainabilityDuration:
          input.runtimeMetadata.explainabilityDurationMs ?? 0,
      }),
      status: 'RUNNING',
      metadata: this.freezeValue({
        requestId: input.requestId,
        conversationId: input.conversationId,
        intent: input.intent,
        selectedDomains: [...input.selectedDomains],
        routeConfidence: input.routingDecision.confidence,
        policyApproved: input.policyEvaluation.decision.approved,
        policyBlocked: input.policyEvaluation.decision.blocked,
        policyFallbackRequired:
          input.policyEvaluation.decision.fallbackRequired,
        runtimeCompleteness:
          input.policyEvaluation.decision.approved && routedExpertIds.length > 0
            ? 'FULL'
            : 'PARTIAL',
        candidateExpertCount: candidateExpertIds.length,
        routedExpertCount: routedExpertIds.length,
        blockedExpertCount: blockedExpertIds.length,
        skippedExpertCount: skippedExpertIds.length,
        blockedRecommendationCount: 0,
      }),
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });

    this.traces.set(input.requestId, {
      ...trace,
      createdAtMs: now,
      updatedAtMs: now,
      candidateExpertSnapshots,
    });

    return this.freezeTrace(trace);
  }

  completeTrace(
    input: CoachExpertObservabilityCompleteInput,
  ): CoachExpertTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(input.requestId);

    if (!current) {
      return undefined;
    }

    const composition = input.composition;
    const primaryExpert =
      composition?.primaryExpert?.id ?? current.primaryExpert;
    const candidateExpertMap = new Map(
      current.candidateExpertSnapshots.map((expert) => [
        expert.expertId,
        expert,
      ]),
    );
    const resultMap = new Map(
      input.expertResults.map((result) => [result.expertId, result]),
    );
    const contributionByExpert = this.groupContributions(
      input.expertContributions,
    );
    const compositionParticipating = composition?.participatingExperts ?? [];
    const blockedExpertIds = this.uniqueValues([
      ...current.blockedExpertIds,
      ...(composition?.metadata.blockedExpertIds ?? []),
    ]);
    const skippedExpertIds = this.uniqueValues(current.skippedExpertIds);
    const routedExpertIds = current.routedExpertIds;
    const candidateExpertIds = current.candidateExpertIds;
    const executionSummaries = this.buildExecutionSummaries({
      candidateExpertIds,
      routedExpertIds,
      blockedExpertIds,
      skippedExpertIds,
      primaryExpert,
      candidateExpertMap,
      resultMap,
      contributionByExpert,
      compositionParticipating,
      explanation: input.explanation,
    });
    const executedExpertIds = executionSummaries
      .filter((summary) => summary.executed)
      .map((summary) => summary.expertId);
    const failedExpertIds = executionSummaries
      .filter((summary) => summary.executionStatus === 'FAILED')
      .map((summary) => summary.expertId);
    const contributionSummary = this.buildContributionSummary({
      composition,
      explanation: input.explanation,
    });
    const conflicts = this.buildConflictSummaries({
      composition,
      explanation: input.explanation,
      blockedExpertIds,
    });
    const latencySummary = this.freezeValue({
      routing:
        input.runtimeMetadata.routingDurationMs ??
        current.latencySummary.routing,
      execution: input.runtimeMetadata.executionDurationMs ?? 0,
      composition:
        input.runtimeMetadata.compositionDurationMs ??
        current.metrics.compositionDuration,
      persona:
        input.runtimeMetadata.personaDurationMs ??
        current.metrics.personaDuration,
      explainability:
        input.runtimeMetadata.explainabilityDurationMs ??
        current.metrics.explainabilityDuration,
      promptAssembly: input.runtimeMetadata.promptAssemblyDurationMs ?? 0,
      total:
        input.runtimeMetadata.totalDurationMs ??
        [
          input.runtimeMetadata.routingDurationMs ??
            current.latencySummary.routing,
          input.runtimeMetadata.executionDurationMs ?? 0,
          input.runtimeMetadata.compositionDurationMs ??
            current.metrics.compositionDuration,
          input.runtimeMetadata.personaDurationMs ??
            current.metrics.personaDuration,
          input.runtimeMetadata.explainabilityDurationMs ??
            current.metrics.explainabilityDuration,
          input.runtimeMetadata.promptAssemblyDurationMs ?? 0,
        ].reduce((sum, value) => sum + value, 0),
    } satisfies CoachExpertLatencySummary);
    const selectedExperts = routedExpertIds.length;
    const totalLatency = executionSummaries.reduce(
      (sum, summary) => sum + summary.duration,
      0,
    );
    const averageLatency =
      executedExpertIds.length > 0
        ? totalLatency / executedExpertIds.length
        : 0;
    const highestRiskExpert = this.resolveHighestRiskExpert(executionSummaries);
    const highestConfidenceExpert =
      this.resolveHighestConfidenceExpert(executionSummaries);
    const updatedMetadata = this.freezeValue({
      ...current.metadata,
      routingDurationMs:
        input.runtimeMetadata.routingDurationMs ??
        current.latencySummary.routing,
      executionDurationMs: input.runtimeMetadata.executionDurationMs ?? 0,
      compositionDurationMs:
        input.runtimeMetadata.compositionDurationMs ??
        current.metrics.compositionDuration,
      personaDurationMs:
        input.runtimeMetadata.personaDurationMs ??
        current.metrics.personaDuration,
      explainabilityDurationMs:
        input.runtimeMetadata.explainabilityDurationMs ??
        current.metrics.explainabilityDuration,
      promptAssemblyDurationMs:
        input.runtimeMetadata.promptAssemblyDurationMs ?? 0,
      routeConfidence:
        composition?.metadata.routeConfidence ??
        current.metadata.routeConfidence,
      policyApproved:
        composition?.metadata.policyApproved ?? current.metadata.policyApproved,
      policyBlocked:
        composition?.metadata.policyBlocked ?? current.metadata.policyBlocked,
      policyFallbackRequired:
        composition?.metadata.policyFallbackRequired ??
        current.metadata.policyFallbackRequired,
      participatingExpertCount: executionSummaries.filter(
        (summary) => summary.selected,
      ).length,
      executedExpertCount: executedExpertIds.length,
      failedExpertCount: failedExpertIds.length,
      recommendationCount: contributionSummary.recommendations,
      riskCount: contributionSummary.risks,
      conflictCount: conflicts.length,
      evidenceCount: input.explanation?.evidence.length ?? 0,
      missingEvidenceCount: input.explanation?.missingEvidence.length ?? 0,
      personaTone: input.personaGuidance?.tone,
      personaFocus: input.personaGuidance?.focus,
      personaVerbosity: input.personaGuidance?.verbosity,
      promptAssemblyDurationMs:
        input.runtimeMetadata.promptAssemblyDurationMs ?? 0,
    });

    const next = this.updateStoredTrace(current, {
      primaryExpert,
      participatingExperts: Object.freeze(
        executionSummaries
          .filter(
            (summary) =>
              summary.selected &&
              summary.executionStatus !== 'BLOCKED' &&
              summary.executionStatus !== 'SKIPPED' &&
              summary.executionStatus !== 'NOT_SELECTED',
          )
          .map((summary) => summary.expertId),
      ),
      supportingExperts: Object.freeze(
        executionSummaries
          .filter(
            (summary) =>
              summary.selected &&
              summary.expertId !== primaryExpert &&
              summary.executionStatus !== 'BLOCKED' &&
              summary.executionStatus !== 'SKIPPED' &&
              summary.executionStatus !== 'NOT_SELECTED',
          )
          .map((summary) => summary.expertId),
      ),
      executionSummaries: Object.freeze(executionSummaries),
      contributionSummary,
      latencySummary,
      conflicts: Object.freeze(conflicts),
      blockedExpertIds,
      skippedExpertIds,
      failedExpertIds,
      executedExpertIds,
      metrics: this.buildMetrics({
        totalExperts: candidateExpertIds.length,
        selectedExperts,
        executedExperts: executedExpertIds.length,
        skippedExperts: skippedExpertIds.length,
        blockedExperts: blockedExpertIds.length,
        failedExperts: failedExpertIds.length,
        averageLatency,
        totalLatency,
        primaryExpert,
        compositionDuration:
          input.runtimeMetadata.compositionDurationMs ??
          current.metrics.compositionDuration,
        personaDuration:
          input.runtimeMetadata.personaDurationMs ??
          current.metrics.personaDuration,
        explainabilityDuration:
          input.runtimeMetadata.explainabilityDurationMs ??
          current.metrics.explainabilityDuration,
        highestRiskExpert,
        highestConfidenceExpert,
      }),
      status: 'COMPLETED',
      metadata: updatedMetadata,
      updatedAt: new Date(now).toISOString(),
    });

    this.traces.set(input.requestId, {
      ...next,
      createdAtMs: current.createdAtMs,
      updatedAtMs: now,
      candidateExpertSnapshots: current.candidateExpertSnapshots,
    });

    return this.freezeTrace(next);
  }

  getTrace(traceId: string): CoachExpertTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const trace = this.traces.get(traceId);

    return trace ? this.freezeTrace(trace) : undefined;
  }

  listTraces(): readonly CoachExpertTrace[] {
    const now = Date.now();
    this.pruneRetentionState(now);

    return Object.freeze(
      [...this.traces.values()]
        .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
        .map((trace) => this.freezeTrace(trace)),
    );
  }

  private buildExecutionSummaries(input: {
    candidateExpertIds: readonly string[];
    routedExpertIds: readonly string[];
    blockedExpertIds: readonly string[];
    skippedExpertIds: readonly string[];
    primaryExpert?: string;
    candidateExpertMap: ReadonlyMap<string, CoachExpertTraceCandidateSnapshot>;
    resultMap: ReadonlyMap<string, CoachExpertResult>;
    contributionByExpert: ReadonlyMap<
      string,
      readonly CoachExpertContribution[]
    >;
    compositionParticipating: readonly CoachExpertCompositionResult['participatingExperts'];
    explanation?: CoachExplanation;
  }): readonly CoachExpertExecutionSummary[] {
    const allExpertIds = this.uniqueValues([
      ...input.candidateExpertIds,
      ...input.routedExpertIds,
      ...input.blockedExpertIds,
      ...input.skippedExpertIds,
      ...input.resultMap.keys(),
    ]);

    return allExpertIds.map((expertId) => {
      const snapshot = input.candidateExpertMap.get(expertId);
      const selected = input.routedExpertIds.includes(expertId);
      const blocked = input.blockedExpertIds.includes(expertId);
      const skipped = input.skippedExpertIds.includes(expertId);
      const result = input.resultMap.get(expertId);
      const compositionSummary = input.compositionParticipating.find(
        (summary) => summary.expertId === expertId,
      );
      const contributionCount =
        input.contributionByExpert.get(expertId)?.length ?? 0;
      const recommendationCount =
        compositionSummary?.recommendationCodes.length ??
        this.readArrayLength(result?.metadata?.recommendations);
      const riskCount =
        compositionSummary?.riskLevels.length ??
        this.readArrayLength(result?.metadata?.risks);
      const confidence =
        compositionSummary?.confidence ??
        this.readConfidence(result?.metadata?.confidence);
      const conflicts = this.countConflicts(input.explanation, expertId);
      const missingEvidence = this.countMissingEvidence(
        input.explanation,
        expertId,
      );
      const duration = this.resolveDuration(result, selected, blocked, skipped);
      const executionStatus = this.resolveExecutionStatus({
        selected,
        blocked,
        skipped,
        result,
      });
      const health = this.resolveHealthSummary({
        expertId,
        executionStatus,
        duration,
        blocked,
        skipped,
        result,
        snapshot,
        contributionCount,
        recommendationCount,
        riskCount,
        conflicts,
        missingEvidence,
      });

      return this.freezeValue({
        expertId,
        expertName: snapshot?.displayName ?? expertId,
        executionStatus,
        selected,
        executed: executionStatus === 'EXECUTED',
        duration,
        contributionCount,
        recommendationCount,
        riskCount,
        confidence,
        conflicts,
        missingEvidence,
        timestamp: new Date().toISOString(),
        health,
        metadata: {
          expertId,
          selected,
          blocked,
          skipped,
          primaryExpert: input.primaryExpert,
          resultSummary: result?.summary,
        },
      });
    });
  }

  private buildContributionSummary(input: {
    composition?: CoachExpertCompositionResult;
    explanation?: CoachExplanation;
  }): CoachExpertContributionSummary {
    const recommendations = this.uniqueValues(
      (input.composition?.recommendations ?? []).map(
        (recommendation) => recommendation.code,
      ),
    );
    const risks = input.composition?.risks.length ?? 0;
    const findings = input.composition?.keyFindings.length ?? 0;
    const alerts = Math.max(
      input.explanation?.conflictExplanations.length ?? 0,
      input.composition?.conflicts.length ?? 0,
    );
    const strengths = this.countFindingsByPrefix(
      input.composition?.keyFindings ?? [],
      [
        'CONSISTENT_HABITS',
        'STRONG_PROGRESS',
        'HIGH_MOTIVATION',
        'RECENT_MILESTONE',
      ],
    );
    const weaknesses = this.countFindingsByPrefix(
      input.composition?.keyFindings ?? [],
      ['PLATEAU', 'NUTRITION_INCONSISTENCY', 'LOW_RECOVERY', 'INACTIVITY'],
    );

    return this.freezeValue({
      recommendations: recommendations.length,
      risks,
      findings,
      alerts,
      strengths,
      weaknesses,
      confidence: input.composition?.confidence.level ?? 'UNKNOWN',
      metadata: {
        recommendationCodes: recommendations,
        riskCount: risks,
        findingCount: findings,
        alertCount: alerts,
      },
    });
  }

  private buildConflictSummaries(input: {
    composition?: CoachExpertCompositionResult;
    explanation?: CoachExplanation;
    blockedExpertIds: readonly string[];
  }): readonly CoachExpertConflictSummary[] {
    const compositionConflicts = input.composition?.conflicts ?? [];
    const explanationConflicts = input.explanation?.conflictExplanations ?? [];

    const combined = [
      ...compositionConflicts.map((conflict) =>
        this.freezeValue({
          expertA: conflict.experts[0] ?? 'unknown',
          expertB: conflict.experts[1] ?? 'unknown',
          conflictType: conflict.type,
          resolution: conflict.resolution.strategy,
          resolved: conflict.resolution.strategy !== 'NONE',
          severity: conflict.severity,
          metadata: {
            source: 'composition',
            winnerExpertId: conflict.resolution.winnerExpertId,
          },
        }),
      ),
      ...explanationConflicts.map((conflict) =>
        this.freezeValue({
          expertA: conflict.experts[0] ?? 'unknown',
          expertB: conflict.experts[1] ?? 'unknown',
          conflictType: conflict.conflictType,
          resolution: conflict.resolution.strategy,
          resolved: true,
          severity: conflict.severity,
          metadata: {
            source: 'explainability',
            resolvedBy: conflict.resolvedBy,
          },
        }),
      ),
    ];

    return Object.freeze(
      combined.filter(
        (conflict) =>
          !input.blockedExpertIds.includes(conflict.expertA) &&
          !input.blockedExpertIds.includes(conflict.expertB),
      ),
    );
  }

  private resolveExecutionStatus(input: {
    selected: boolean;
    blocked: boolean;
    skipped: boolean;
    result?: CoachExpertResult;
  }): CoachExpertExecutionStatus {
    if (input.blocked) {
      return 'BLOCKED';
    }

    if (input.skipped) {
      return 'SKIPPED';
    }

    if (!input.selected) {
      return 'NOT_SELECTED';
    }

    if (!input.result) {
      return 'SELECTED';
    }

    if (this.isFailureResult(input.result)) {
      return 'FAILED';
    }

    return 'EXECUTED';
  }

  private resolveDuration(
    result: CoachExpertResult | undefined,
    selected: boolean,
    blocked: boolean,
    skipped: boolean,
  ): number {
    if (blocked || skipped) {
      return 0;
    }

    if (!result) {
      return selected ? 0 : 0;
    }

    const metadataDuration = this.readNumber(result.metadata.durationMs);
    return metadataDuration ?? 0;
  }

  private resolveHealthSummary(input: {
    expertId: string;
    executionStatus: CoachExpertExecutionStatus;
    duration: number;
    blocked: boolean;
    skipped: boolean;
    result?: CoachExpertResult;
    snapshot?: CoachExpertTraceCandidateSnapshot;
    contributionCount: number;
    recommendationCount: number;
    riskCount: number;
    conflicts: number;
    missingEvidence: number;
  }): CoachExpertHealthSummary {
    const disabled = input.blocked || input.snapshot?.enabled === false;
    const failing = input.executionStatus === 'FAILED';
    const degraded =
      !disabled &&
      !failing &&
      (input.skipped ||
        input.duration > (input.snapshot?.estimatedLatencyMs ?? 0) * 1.5 ||
        input.contributionCount === 0 ||
        input.riskCount > 0 ||
        input.conflicts > 0 ||
        input.missingEvidence > 0);

    return this.freezeValue({
      expertId: input.expertId,
      healthy: !disabled && !failing && !degraded,
      degraded,
      failing,
      disabled,
      metadata: {
        executionStatus: input.executionStatus,
        duration: input.duration,
        estimatedLatencyMs: input.snapshot?.estimatedLatencyMs ?? 0,
        contributionCount: input.contributionCount,
        recommendationCount: input.recommendationCount,
        riskCount: input.riskCount,
        conflicts: input.conflicts,
        missingEvidence: input.missingEvidence,
      },
    });
  }

  private resolveHighestRiskExpert(
    executionSummaries: readonly CoachExpertExecutionSummary[],
  ): string | undefined {
    let highest: { score: number; expertId: string } | undefined;

    for (const summary of executionSummaries) {
      const score = this.buildRiskScore(summary);
      if (!highest || score > highest.score) {
        highest = { score, expertId: summary.expertId };
      }
    }

    return highest?.expertId;
  }

  private resolveHighestConfidenceExpert(
    executionSummaries: readonly CoachExpertExecutionSummary[],
  ): string | undefined {
    let highest: { score: number; expertId: string } | undefined;

    for (const summary of executionSummaries) {
      const score = this.buildConfidenceScore(summary);
      if (!highest || score > highest.score) {
        highest = { score, expertId: summary.expertId };
      }
    }

    return highest?.expertId;
  }

  private buildRiskScore(summary: CoachExpertExecutionSummary): number {
    if (summary.executionStatus === 'FAILED') {
      return 1000;
    }

    if (summary.executionStatus === 'BLOCKED') {
      return 900;
    }

    if (summary.executionStatus === 'SKIPPED') {
      return 500;
    }

    return (
      summary.riskCount * 50 +
      summary.conflicts * 25 +
      summary.missingEvidence * 10 +
      summary.contributionCount
    );
  }

  private buildConfidenceScore(summary: CoachExpertExecutionSummary): number {
    const confidenceScore = this.confidenceToScore(summary.confidence);
    return (
      confidenceScore * 100 +
      summary.contributionCount * 10 +
      summary.recommendationCount * 5 +
      Math.max(0, 20 - summary.missingEvidence * 2)
    );
  }

  private confidenceToScore(
    confidence: CoachExpertExecutionSummary['confidence'],
  ): number {
    switch (confidence) {
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
      case 'UNKNOWN':
      default:
        return 0;
    }
  }

  private countConflicts(
    explanation: CoachExplanation | undefined,
    expertId: string,
  ): number {
    if (!explanation) {
      return 0;
    }

    return explanation.conflictExplanations.filter((conflict) =>
      conflict.experts.includes(expertId),
    ).length;
  }

  private countMissingEvidence(
    explanation: CoachExplanation | undefined,
    expertId: string,
  ): number {
    if (!explanation) {
      return 0;
    }

    return explanation.missingEvidence.filter((entry) => {
      const metadataExpertId = this.readString(entry.metadata.expertId);
      return metadataExpertId === expertId;
    }).length;
  }

  private countFindingsByPrefix(
    findings: readonly string[],
    prefixes: readonly string[],
  ): number {
    return findings.filter((finding) =>
      prefixes.some((prefix) => finding.startsWith(prefix)),
    ).length;
  }

  private groupContributions(
    contributions: readonly CoachExpertContribution[],
  ): ReadonlyMap<string, readonly CoachExpertContribution[]> {
    const grouped = new Map<string, CoachExpertContribution[]>();

    for (const contribution of contributions) {
      const list = grouped.get(contribution.expertId) ?? [];
      list.push(contribution);
      grouped.set(contribution.expertId, list);
    }

    return new Map(
      [...grouped.entries()].map(([expertId, items]) => [
        expertId,
        Object.freeze(items.map((item) => this.freezeValue(item))),
      ]),
    );
  }

  private buildMetrics(input: {
    totalExperts: number;
    selectedExperts: number;
    executedExperts: number;
    skippedExperts: number;
    blockedExperts: number;
    failedExperts: number;
    averageLatency: number;
    totalLatency: number;
    primaryExpert?: string;
    compositionDuration: number;
    personaDuration: number;
    explainabilityDuration: number;
    highestRiskExpert?: string;
    highestConfidenceExpert?: string;
  }): CoachExpertMetrics {
    return this.freezeValue({
      totalExperts: input.totalExperts,
      selectedExperts: input.selectedExperts,
      executedExperts: input.executedExperts,
      skippedExperts: input.skippedExperts,
      blockedExperts: input.blockedExperts,
      failedExperts: input.failedExperts,
      averageLatency: input.averageLatency,
      totalLatency: input.totalLatency,
      highestRiskExpert: input.highestRiskExpert,
      highestConfidenceExpert: input.highestConfidenceExpert,
      primaryExpert: input.primaryExpert,
      compositionDuration: input.compositionDuration,
      personaDuration: input.personaDuration,
      explainabilityDuration: input.explainabilityDuration,
    });
  }

  private buildTrace(input: CoachExpertTrace): CoachExpertTrace {
    return this.freezeValue(input);
  }

  private updateStoredTrace(
    current: StoredCoachExpertTrace,
    next: Partial<CoachExpertTrace>,
  ): CoachExpertTrace {
    return this.buildTrace({
      ...current,
      ...next,
      metadata: {
        ...current.metadata,
        ...(next.metadata ?? {}),
      },
      createdAt: current.createdAt,
      updatedAt: next.updatedAt ?? current.updatedAt,
    } as CoachExpertTrace);
  }

  private pruneRetentionState(now: number): void {
    this.retentionPolicy.prune(this.traces, now);
  }

  private freezeTrace(trace: CoachExpertTrace): CoachExpertTrace {
    return this.freezeValue({
      ...trace,
      selectedDomains: Object.freeze([...trace.selectedDomains]),
      candidateExpertIds: Object.freeze([...trace.candidateExpertIds]),
      routedExpertIds: Object.freeze([...trace.routedExpertIds]),
      executedExpertIds: Object.freeze([...trace.executedExpertIds]),
      skippedExpertIds: Object.freeze([...trace.skippedExpertIds]),
      blockedExpertIds: Object.freeze([...trace.blockedExpertIds]),
      failedExpertIds: Object.freeze([...trace.failedExpertIds]),
      participatingExperts: Object.freeze([...trace.participatingExperts]),
      supportingExperts: Object.freeze([...trace.supportingExperts]),
      executionSummaries: Object.freeze([...trace.executionSummaries]),
      conflicts: Object.freeze([...trace.conflicts]),
    });
  }

  private isFailureResult(result: CoachExpertResult): boolean {
    return (
      this.readString(result.metadata.runtimeMode) === 'analysis-error-fallback'
    );
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private readArrayLength(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
  }

  private readConfidence(
    value: unknown,
  ): CoachExpertExecutionSummary['confidence'] {
    switch (this.readString(value)) {
      case 'HIGH':
      case 'MEDIUM':
      case 'LOW':
        return value as CoachExpertExecutionSummary['confidence'];
      default:
        return 'UNKNOWN';
    }
  }

  private uniqueValues(values: readonly string[]): string[] {
    return [
      ...new Set(
        values.filter((value) => typeof value === 'string' && value.trim()),
      ),
    ].map((value) => value.trim());
  }

  private freezeValue<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return Object.freeze(value.map((entry) => this.freezeValue(entry))) as T;
    }

    const clone: Record<string, unknown> = {};

    for (const key of Object.keys(value as Record<string, unknown>)) {
      const current = (value as Record<string, unknown>)[key];
      clone[key] = this.freezeValue(current);
    }

    return Object.freeze(clone) as T;
  }
}
