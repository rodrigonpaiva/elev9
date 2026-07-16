import { Injectable } from '@nestjs/common';

import type { CoachExpertMetadata } from '../coach-expert.types';
import { CoachExpertCompositionPolicy } from './coach-expert-composition.policy';
import type {
  CoachCompositionMetadata,
  CoachExpertCompositionInput,
  CoachExpertCompositionResult,
  CoachExpertContributionSummary,
  CoachUnifiedAssessment,
  CoachUnifiedConfidence,
  CoachUnifiedRecommendation,
  CoachUnifiedRisk,
  CoachUnifiedRiskLevel,
} from './coach-expert-composition.types';
import type {
  CoachExpertContribution,
} from '../coach-expert.types';
import type { CoachExpertSelection } from '../router/coach-expert-router.types';
import type { CoachExpertResult } from '../coach-expert.types';

type ExpertAnalysisRecord = Record<string, unknown> & {
  confidence?: string;
  priority?: string;
  summary?: string;
  recommendations?: readonly {
    code?: string;
    summary?: string;
    reason?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metadata?: Readonly<Record<string, unknown>>;
  }[];
  risks?: readonly {
    level?: CoachUnifiedRiskLevel;
    summary?: string;
    factors?: readonly string[];
    metadata?: Readonly<Record<string, unknown>>;
  }[];
  goalAlignment?: string;
  trainingStatus?: string;
  nutritionStatus?: string;
  recoveryStatus?: string;
  goalStatus?: string;
  habitStatus?: string;
  overallProgress?: string;
  motivationState?: string;
  trend?: Record<string, unknown>;
  momentum?: string;
  plateau?: string;
  regression?: string;
  consistency?: Record<string, unknown>;
  patterns?: readonly string[];
  riskAssessment?: {
    level?: CoachUnifiedRiskLevel;
    summary?: string;
    factors?: readonly string[];
    metadata?: Readonly<Record<string, unknown>>;
  };
};

@Injectable()
export class CoachExpertCompositionService {
  constructor(
    private readonly policy: CoachExpertCompositionPolicy = new CoachExpertCompositionPolicy(),
  ) {}

  compose(input: CoachExpertCompositionInput): CoachExpertCompositionResult {
    const startedAt = Date.now();
    const policyBlockedExpertIds = this.resolvePolicyBlockedExpertIds(input);
    const blockedExpertIds = this.uniqueValues([
      ...input.routingDecision.metadata.blockedExpertIds,
      ...policyBlockedExpertIds,
    ]);
    const participatingSelections = this.resolveParticipatingSelections(
      input,
      blockedExpertIds,
    );
    const primaryExpert = input.routingDecision.primaryExpert ?? null;
    const skippedExpertIds = this.uniqueValues([
      ...input.routingDecision.metadata.skippedExpertIds,
    ]);
    const expertConfidenceById = new Map<
      string,
      CoachUnifiedConfidence['level']
    >();
    const participatingExperts = participatingSelections.map((selection) => {
      const summary = this.buildContributionSummary({
        selection,
        input,
      });
      expertConfidenceById.set(summary.expertId, summary.confidence);
      return summary;
    });

    const recommendations = this.mergeRecommendations({
      input,
      participatingExperts,
    });
    const riskEntries = this.buildRisks({
      input,
      participatingExperts,
    });
    const unifiedRisk = this.policy.resolveUnifiedRisk(riskEntries);
    const confidence = this.policy.resolveConfidence({
      primaryExpert:
        participatingExperts.find(
          (expert) => expert.expertId === primaryExpert?.id,
        ) ?? null,
      participatingExperts,
      policyEvaluation: input.policyEvaluation,
      routingConfidence: input.routingDecision.confidence,
      runtimeCompleteness: this.resolveRuntimeCompleteness({
        input,
        participatingExperts,
      }),
      expertExecutionDurationMs:
        input.runtimeMetadata.expertExecutionDurationMs,
    });
    const conflicts = this.policy.detectConflicts({
      primaryExpertId: primaryExpert?.id,
      participatingExperts,
      recommendations,
      expertConfidenceById,
    });
    const keyFindings = this.policy.buildKeyFindings({
      participatingExperts,
      recommendations,
      risks: riskEntries,
    });
    const summary = this.policy.buildSummary({
      primaryExpertId: primaryExpert?.id,
      keyFindings,
      unifiedRisk,
      confidence,
      recommendationCodes: recommendations.map(
        (recommendation) => recommendation.code,
      ),
      conflictCount: conflicts.length,
    });
    const compositionDurationMs = Date.now() - startedAt;

    const metadata: CoachCompositionMetadata = Object.freeze({
      requestId: input.requestId,
      intent: input.intent,
      selectedDomains: Object.freeze([...input.selectedDomains]),
      primaryExpertId: primaryExpert?.id,
      participatingExpertIds: Object.freeze(
        participatingExperts.map((expert) => expert.expertId),
      ),
      supportingExpertIds: Object.freeze(
        participatingExperts
          .filter((expert) => expert.expertId !== primaryExpert?.id)
          .map((expert) => expert.expertId),
      ),
      blockedExpertIds: Object.freeze(blockedExpertIds),
      skippedExpertIds: Object.freeze(skippedExpertIds),
      routeValid: input.routingDecision.metadata.routeValid,
      routeConfidence: input.routingDecision.confidence,
      policyApproved: input.policyEvaluation.decision.approved,
      policyBlocked: input.policyEvaluation.decision.blocked,
      policyFallbackRequired: input.policyEvaluation.decision.fallbackRequired,
      candidateExpertCount: input.routingDecision.metadata.candidateExpertCount,
      participatingExpertCount: participatingExperts.length,
      recommendationCount: recommendations.length,
      riskCount: riskEntries.length,
      conflictCount: conflicts.length,
      expertResultCount: input.expertResults.length,
      expertContributionCount: input.expertContributions.length,
      compositionDurationMs,
      planningDurationMs: input.executionMetadata.planningDurationMs,
      orchestrationDurationMs: input.executionMetadata.orchestrationDurationMs,
      expertExecutionDurationMs:
        input.executionMetadata.expertExecutionDurationMs,
      executionDurationMs: input.executionMetadata.executionDurationMs,
      runtimeCompleteness: this.resolveRuntimeCompleteness({
        input,
        participatingExperts,
      }),
    });

    return Object.freeze({
      primaryExpert,
      participatingExperts: Object.freeze(participatingExperts),
      assessment: Object.freeze({
        summary,
        keyFindings: Object.freeze(keyFindings),
        metadata: Object.freeze({
          primaryExpertId: primaryExpert?.id,
          participatingExpertIds: metadata.participatingExpertIds,
          recommendationCount: recommendations.length,
          riskCount: riskEntries.length,
          conflictCount: conflicts.length,
        }),
      }) as CoachUnifiedAssessment,
      summary,
      keyFindings: Object.freeze(keyFindings),
      recommendations: Object.freeze(recommendations),
      risks: Object.freeze([unifiedRisk, ...riskEntries]),
      confidence,
      conflicts: Object.freeze(conflicts),
      supportingExperts: Object.freeze(
        participatingExperts.filter(
          (expert) => expert.expertId !== primaryExpert?.id,
        ),
      ),
      metadata,
    });
  }

  private buildContributionSummary(input: {
    selection: CoachExpertSelection;
    input: CoachExpertCompositionInput;
  }): CoachExpertContributionSummary {
    const expert = input.selection.expert;
    const result = this.findResult(input.input.expertResults, expert.id);
    const analysis = this.readAnalysis(result?.metadata);
    const recommendations = this.readRecommendationCodes(
      analysis?.recommendations,
    );
    const risks = this.readRiskLevels(analysis?.risks);
    const confidence = this.resolveExpertConfidence({
      result,
      analysis,
      selection: input.selection,
    });
    const keyFindings = this.resolveExpertKeyFindings({
      expert,
      analysis,
      result,
    });

    return Object.freeze({
      expertId: expert.id,
      expertName: expert.displayName,
      role: input.selection.role,
      sequence: input.selection.sequence,
      summary: result?.summary ?? `${expert.displayName} analysis unavailable.`,
      recommendationCodes: Object.freeze(recommendations),
      riskLevels: Object.freeze(risks),
      confidence,
      keyFindings: Object.freeze(keyFindings),
      metadata: Object.freeze({
        expertId: expert.id,
        role: input.selection.role,
        sequence: input.selection.sequence,
        analysisSummary: this.readString(analysis?.summary),
        goalAlignment: this.readString(analysis?.goalAlignment),
        goalType: this.readString(analysis?.goalType),
        trainingStatus: this.readString(analysis?.trainingStatus),
        nutritionStatus: this.readString(analysis?.nutritionStatus),
        recoveryStatus: this.readString(analysis?.recoveryStatus),
        goalStatus: this.readString(analysis?.goalStatus),
        habitStatus: this.readString(analysis?.habitStatus),
        overallProgress: this.readString(analysis?.overallProgress),
        motivationState: this.readString(analysis?.motivationState),
        inactivityDays: this.readNumber(analysis?.inactivityDays),
        trend: analysis?.trend
          ? Object.freeze({ ...analysis.trend })
          : undefined,
        momentum: this.readString(analysis?.momentum),
        plateau: this.readString(analysis?.plateau),
        regression: this.readString(analysis?.regression),
        contributionCount: this.findContributions(
          input.input.expertContributions,
          expert.id,
        ).length,
        resultAvailable: Boolean(result),
        recommendationCount: recommendations.length,
        riskCount: risks.length,
        confidence: confidence,
        analysis: analysis ? Object.freeze({ ...analysis }) : undefined,
      }),
    });
  }

  private buildRisks(input: {
    input: CoachExpertCompositionInput;
    participatingExperts: readonly CoachExpertContributionSummary[];
  }): readonly CoachUnifiedRisk[] {
    const risks: CoachUnifiedRisk[] = [];

    for (const expert of input.participatingExperts) {
      const result = this.findResult(
        input.input.expertResults,
        expert.expertId,
      );
      const analysis = this.readAnalysis(result?.metadata);
      const riskEntries = this.readRiskEntries(analysis);

      if (riskEntries.length === 0) {
        continue;
      }

      for (const risk of riskEntries) {
        risks.push(
          this.policy.buildRiskFromInput({
            expertId: expert.expertId,
            expertName: expert.expertName,
            riskLevel: risk.level,
            riskSummary:
              risk.summary ?? `${expert.expertName} risk=${risk.level}`,
            riskFactors: risk.factors,
            riskMetadata: Object.freeze({
              expertId: expert.expertId,
              riskSummary: risk.summary,
            }),
          }),
        );
      }
    }

    return Object.freeze(
      risks.sort((left, right) => {
        const leftScore = this.riskToScore(left.level);
        const rightScore = this.riskToScore(right.level);

        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }

        return left.summary.localeCompare(right.summary);
      }),
    );
  }

  private mergeRecommendations(input: {
    input: CoachExpertCompositionInput;
    participatingExperts: readonly CoachExpertContributionSummary[];
  }): readonly CoachUnifiedRecommendation[] {
    const recommendations: CoachUnifiedRecommendation[] = [];

    for (const expert of input.participatingExperts) {
      const result = this.findResult(
        input.input.expertResults,
        expert.expertId,
      );
      const analysis = this.readAnalysis(result?.metadata);
      const recommendationEntries = this.readRecommendationEntries(analysis);
      const riskLevel = this.highestRiskLevel(expert.riskLevels);

      recommendationEntries.forEach((recommendation, index) => {
        if (
          this.policy
            .normalizePolicyBlockedRecommendationCodes(
              input.input.policyEvaluation,
            )
            .includes(recommendation.code)
        ) {
          return;
        }

        recommendations.push(
          this.policy.buildRecommendation({
            expertId: expert.expertId,
            recommendation,
            primaryExpertId: input.input.routingDecision.primaryExpert?.id,
            riskLevel,
            sourceOrder: expert.sequence + index,
          }),
        );
      });
    }

    return this.policy.mergeRecommendations(recommendations);
  }

  private resolveExpertConfidence(input: {
    result?: CoachExpertResult;
    analysis?: ExpertAnalysisRecord;
    selection: CoachExpertSelection;
  }): CoachUnifiedConfidence['level'] {
    const analysisConfidence = this.readString(input.analysis?.confidence);

    if (analysisConfidence === 'HIGH' || analysisConfidence === 'MEDIUM') {
      return analysisConfidence;
    }

    if (input.selection.role === 'PRIMARY') {
      return 'MEDIUM';
    }

    return input.result ? 'LOW' : 'LOW';
  }

  private resolveExpertKeyFindings(input: {
    expert: CoachExpertMetadata;
    analysis?: ExpertAnalysisRecord;
    result?: CoachExpertResult;
  }): readonly string[] {
    const findings: string[] = [];

    if (!input.analysis) {
      return findings;
    }

    switch (input.expert.id) {
      case 'WorkoutExpert':
        if (
          input.analysis.trainingStatus === 'completed' &&
          input.analysis.priority !== 'CRITICAL'
        ) {
          findings.push('WORKOUT_CONSISTENCY');
        } else {
          findings.push('WORKOUT_INCONSISTENCY');
        }
        break;
      case 'NutritionExpert':
        findings.push(
          input.analysis.nutritionStatus === 'ON_TRACK'
            ? 'NUTRITION_CONSISTENCY'
            : 'NUTRITION_INCONSISTENCY',
        );
        break;
      case 'RecoveryExpert':
        findings.push(
          input.analysis.recoveryStatus === 'OPTIMAL' ||
            input.analysis.recoveryStatus === 'GOOD'
            ? 'RECOVERY_STABILITY'
            : 'LOW_RECOVERY',
        );
        break;
      case 'GoalExpert':
        findings.push(
          input.analysis.goalStatus === 'COMPLETED'
            ? 'RECENT_MILESTONE'
            : 'GOAL_PROGRESS',
        );
        break;
      case 'HabitExpert':
        findings.push(
          input.analysis.habitStatus === 'EXCELLENT' ||
            input.analysis.habitStatus === 'GOOD'
            ? 'CONSISTENT_HABITS'
            : 'INCONSISTENT_HABITS',
        );
        break;
      case 'ProgressExpert':
        findings.push(
          input.analysis.overallProgress === 'EXCELLENT' ||
            input.analysis.overallProgress === 'GOOD'
            ? 'STRONG_PROGRESS'
            : input.analysis.plateau === 'PLATEAU'
              ? 'PLATEAU'
              : 'DECLINING_PROGRESS',
        );
        break;
      case 'MotivationExpert':
        findings.push(
          input.analysis.motivationState === 'HIGHLY_ENGAGED' ||
            input.analysis.motivationState === 'ENGAGED'
            ? 'HIGH_MOTIVATION'
            : 'NEEDS_SUPPORT',
        );
        break;
      default:
        break;
    }

    if (this.hasRecentInactivity(input.analysis)) {
      findings.push('LONG_INACTIVITY');
    }

    return this.uniqueValues(findings);
  }

  private resolveRuntimeCompleteness(input: {
    input: CoachExpertCompositionInput;
    participatingExperts: readonly CoachExpertContributionSummary[];
  }): 'FULL' | 'PARTIAL' | 'EMPTY' {
    if (input.participatingExperts.length === 0) {
      return 'EMPTY';
    }

    const selectedExpertIds =
      input.input.routingDecision.route.orderedExperts.map(
        (selection) => selection.expert.id,
      );
    const resultCount = input.input.expertResults.filter((result) =>
      selectedExpertIds.includes(result.expertId),
    ).length;

    if (resultCount === selectedExpertIds.length) {
      return 'FULL';
    }

    return 'PARTIAL';
  }

  private resolveParticipatingSelections(
    input: CoachExpertCompositionInput,
    blockedExpertIds: readonly string[],
  ): readonly CoachExpertSelection[] {
    const blocked = new Set(blockedExpertIds);
    const allowed = input.routingDecision.route.orderedExperts.filter(
      (selection) => !blocked.has(selection.expert.id),
    );

    return Object.freeze([...allowed]);
  }

  private resolvePolicyBlockedExpertIds(
    input: CoachExpertCompositionInput,
  ): readonly string[] {
    const metadata = input.policyEvaluation.decision.metadata as Readonly<
      Record<string, unknown>
    >;
    const blocked = metadata.blockedExpertIds;

    if (!Array.isArray(blocked)) {
      return [];
    }

    return blocked.filter(
      (value): value is string => typeof value === 'string',
    );
  }

  private readAnalysis(
    metadata?: Readonly<Record<string, unknown>>,
  ): ExpertAnalysisRecord | undefined {
    const analysis = metadata?.analysis;

    if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
      return undefined;
    }

    return analysis as ExpertAnalysisRecord;
  }

  private readRecommendationEntries(analysis?: ExpertAnalysisRecord): readonly {
    code: string;
    summary: string;
    reason?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metadata?: Readonly<Record<string, unknown>>;
  }[] {
    if (!analysis || !Array.isArray(analysis.recommendations)) {
      return [];
    }

    return analysis.recommendations.filter(
      (entry): entry is NonNullable<typeof entry> =>
        Boolean(
          entry &&
          typeof entry.code === 'string' &&
          typeof entry.summary === 'string',
        ),
    );
  }

  private readRiskEntries(analysis?: ExpertAnalysisRecord): readonly {
    level: CoachUnifiedRiskLevel;
    summary?: string;
    factors: readonly string[];
    metadata?: Readonly<Record<string, unknown>>;
  }[] {
    const risks: {
      level: CoachUnifiedRiskLevel;
      summary?: string;
      factors: readonly string[];
      metadata?: Readonly<Record<string, unknown>>;
    }[] = [];

    if (analysis?.riskAssessment) {
      risks.push({
        level: analysis.riskAssessment.level ?? 'UNKNOWN',
        summary: analysis.riskAssessment.summary,
        factors: analysis.riskAssessment.factors ?? [],
        metadata: analysis.riskAssessment.metadata,
      });
    }

    if (Array.isArray(analysis?.risks)) {
      for (const risk of analysis.risks) {
        if (risk && typeof risk.level === 'string') {
          risks.push({
            level: risk.level as CoachUnifiedRiskLevel,
            summary: risk.summary,
            factors: risk.factors ?? [],
            metadata: risk.metadata,
          });
        }
      }
    }

    return risks;
  }

  private readRecommendationCodes(
    recommendations?: readonly {
      code?: string;
      summary?: string;
      reason?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      metadata?: Readonly<Record<string, unknown>>;
    }[],
  ): readonly string[] {
    if (!Array.isArray(recommendations)) {
      return [];
    }

    return recommendations
      .map((recommendation) => recommendation.code)
      .filter((code): code is string => typeof code === 'string');
  }

  private readRiskLevels(
    risks?: readonly {
      level?: CoachUnifiedRiskLevel;
      summary?: string;
      factors?: readonly string[];
      metadata?: Readonly<Record<string, unknown>>;
    }[],
  ): readonly CoachUnifiedRiskLevel[] {
    if (!Array.isArray(risks)) {
      return [];
    }

    return risks
      .map((risk) => risk.level)
      .filter(
        (level): level is CoachUnifiedRiskLevel => typeof level === 'string',
      );
  }

  private highestRiskLevel(
    levels: readonly CoachUnifiedRiskLevel[],
  ): CoachUnifiedRiskLevel {
    let highest: CoachUnifiedRiskLevel = 'UNKNOWN';

    for (const level of levels) {
      if (this.riskToScore(level) > this.riskToScore(highest)) {
        highest = level;
      }
    }

    return highest;
  }

  private hasRecentInactivity(
    analysis: ExpertAnalysisRecord | undefined,
  ): boolean {
    if (!analysis) {
      return false;
    }

    const inactivityDays = this.readNumber(analysis.inactivityDays);
    return typeof inactivityDays === 'number' && inactivityDays >= 14;
  }

  private findResult(
    results: readonly CoachExpertResult[],
    expertId: string,
  ): CoachExpertResult | undefined {
    return results.find((result) => result.expertId === expertId);
  }

  private findContributions(
    contributions: readonly CoachExpertContribution[],
    expertId: string,
  ): readonly CoachExpertContribution[] {
    return contributions.filter(
      (contribution) => contribution.expertId === expertId,
    );
  }

  private riskToScore(level: CoachUnifiedRiskLevel): number {
    switch (level) {
      case 'CRITICAL':
        return 4;
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

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private uniqueValues<T>(values: readonly T[]): readonly T[] {
    return [...new Set(values)];
  }
}
