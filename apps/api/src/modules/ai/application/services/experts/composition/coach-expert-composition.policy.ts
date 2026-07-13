import { Injectable } from '@nestjs/common';

import type { AgentPolicyEvaluation } from '../../agent/policies/agent-policy.types';
import type {
  CoachCompositionConflict,
  CoachCompositionConflictResolution,
  CoachCompositionConflictSeverity,
  CoachCompositionConflictType,
  CoachCompositionResolutionStrategy,
  CoachExpertContributionSummary,
  CoachUnifiedConfidence,
  CoachUnifiedConfidenceLevel,
  CoachUnifiedRecommendation,
  CoachUnifiedRecommendationCategory,
  CoachUnifiedRisk,
  CoachUnifiedRiskLevel,
} from './coach-expert-composition.types';

const RISK_ORDER: readonly CoachUnifiedRiskLevel[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNKNOWN',
];

const RECOMMENDATION_CATEGORY_ORDER: readonly CoachUnifiedRecommendationCategory[] =
  ['PRIMARY', 'SAFETY_CRITICAL', 'SUPPORTING', 'INFORMATIONAL'];

const SAFETY_CRITICAL_RECOMMENDATION_CODES = new Set([
  'REST_FIRST',
  'PRIORITIZE_RECOVERY',
  'TAKE_FULL_RECOVERY_DAY',
  'REDUCE_TODAYS_VOLUME',
  'REDUCE_TODAYS_INTENSITY',
  'USE_TECHNIQUE_ONLY',
  'REDUCE_OVERLOAD',
  'RECOVER_CONSISTENCY_BEFORE_INCREASING_WORKLOAD',
]);

const CONFLICTING_WORKOUT_PUSH_CODES = new Set([
  'INCREASE_VOLUME',
  'INCREASE_INTENSITY',
  'MAINTAIN_TODAY',
  'INCREASE_PROGRESSIVE_OVERLOAD',
  'MAINTAIN_CURRENT_PROGRESSION',
  'MAINTAIN_CURRENT_MOMENTUM',
]);

const CONFLICTING_RECOVERY_CODES = new Set([
  'REST_FIRST',
  'PRIORITIZE_RECOVERY',
  'TAKE_FULL_RECOVERY_DAY',
  'REDUCE_TODAYS_VOLUME',
  'REDUCE_TODAYS_INTENSITY',
  'USE_TECHNIQUE_ONLY',
  'PROMOTE_RECOVERY',
]);

@Injectable()
export class CoachExpertCompositionPolicy {
  resolveRecommendationCategory(input: {
    expertId: string;
    recommendationCode: string;
    primaryExpertId?: string;
    riskLevel?: CoachUnifiedRiskLevel;
  }): CoachUnifiedRecommendationCategory {
    if (input.expertId === input.primaryExpertId) {
      return 'PRIMARY';
    }

    if (
      this.isSafetyCriticalRecommendation(input.recommendationCode) ||
      input.riskLevel === 'CRITICAL' ||
      input.riskLevel === 'HIGH'
    ) {
      return 'SAFETY_CRITICAL';
    }

    if (input.riskLevel === 'MEDIUM') {
      return 'SUPPORTING';
    }

    return 'INFORMATIONAL';
  }

  isSafetyCriticalRecommendation(recommendationCode: string): boolean {
    return SAFETY_CRITICAL_RECOMMENDATION_CODES.has(recommendationCode);
  }

  resolveUnifiedRisk(risks: readonly CoachUnifiedRisk[]): CoachUnifiedRisk {
    if (risks.length === 0) {
      return Object.freeze({
        level: 'UNKNOWN',
        summary: 'risk=UNKNOWN',
        factors: Object.freeze([]),
        sources: Object.freeze([]),
        metadata: Object.freeze({
          riskCount: 0,
        }),
      });
    }

    const highestLevel = this.pickHighestRiskLevel(
      risks.map((risk) => risk.level),
    );
    const highestRisks = risks.filter((risk) => risk.level === highestLevel);
    const sources = this.uniqueValues(
      highestRisks.flatMap((risk) => risk.sources),
    );
    const factors = this.uniqueValues(
      highestRisks.flatMap((risk) => risk.factors),
    );

    return Object.freeze({
      level: highestLevel,
      summary: `risk=${highestLevel}; sources=${sources.join(',') || 'none'}`,
      factors: Object.freeze(factors),
      sources: Object.freeze(sources),
      metadata: Object.freeze({
        riskCount: risks.length,
        highestRiskSourceCount: sources.length,
      }),
    });
  }

  resolveConfidence(input: {
    primaryExpert?: CoachExpertContributionSummary | null;
    participatingExperts: readonly CoachExpertContributionSummary[];
    policyEvaluation: AgentPolicyEvaluation;
    routingConfidence: string;
    runtimeCompleteness: 'FULL' | 'PARTIAL' | 'EMPTY';
    expertExecutionDurationMs: number;
  }): CoachUnifiedConfidence {
    if (input.participatingExperts.length === 0) {
      return Object.freeze({
        level: 'LOW',
        summary: 'confidence=LOW; evidence=EMPTY',
        factors: Object.freeze(['NO_PARTICIPATING_EXPERTS']),
        metadata: Object.freeze({
          score: 0,
          participatingExpertCount: 0,
        }),
      });
    }

    const expertScore = this.averageScore(
      input.participatingExperts.map((expert) =>
        this.confidenceToScore(expert.confidence),
      ),
    );
    const routeScore = this.confidenceToScore(input.routingConfidence);
    const policyScore = input.policyEvaluation.decision.approved ? 1 : 0;
    const completenessScore =
      input.runtimeCompleteness === 'FULL'
        ? 1
        : input.runtimeCompleteness === 'PARTIAL'
          ? 0.5
          : 0;
    const executionScore = input.expertExecutionDurationMs > 0 ? 1 : 0;
    const primaryScore = input.primaryExpert
      ? this.confidenceToScore(input.primaryExpert.confidence)
      : expertScore;
    const combinedScore =
      primaryScore * 0.3 +
      expertScore * 0.25 +
      routeScore * 0.15 +
      policyScore * 0.15 +
      completenessScore * 0.1 +
      executionScore * 0.05;
    const level = this.scoreToConfidence(combinedScore);

    return Object.freeze({
      level,
      summary: `confidence=${level}; score=${combinedScore.toFixed(2)}`,
      factors: Object.freeze(
        this.buildConfidenceFactors({
          input,
          expertScore,
          routeScore,
          policyScore,
          completenessScore,
        }),
      ),
      metadata: Object.freeze({
        score: combinedScore,
        participatingExpertCount: input.participatingExperts.length,
        primaryExpertId: input.primaryExpert?.expertId,
      }),
    });
  }

  resolveConflictResolution(input: {
    conflictType: CoachCompositionConflictType;
    left: CoachExpertContributionSummary;
    right: CoachExpertContributionSummary;
    primaryExpertId?: string;
    leftRecommendationCode?: string;
    rightRecommendationCode?: string;
    expertConfidenceById: ReadonlyMap<string, CoachUnifiedConfidenceLevel>;
  }): CoachCompositionConflictResolution {
    const leftSafety = this.isSafetyCriticalRecommendation(
      input.leftRecommendationCode ?? '',
    );
    const rightSafety = this.isSafetyCriticalRecommendation(
      input.rightRecommendationCode ?? '',
    );

    if (leftSafety !== rightSafety) {
      const winner = leftSafety ? input.left : input.right;
      return Object.freeze({
        strategy: 'SAFETY',
        winnerExpertId: winner.expertId,
        winnerRecommendationCode:
          winner.expertId === input.left.expertId
            ? input.leftRecommendationCode
            : input.rightRecommendationCode,
        metadata: Object.freeze({
          conflictType: input.conflictType,
          safetyDriven: true,
        }),
      });
    }

    if (input.primaryExpertId) {
      if (input.primaryExpertId === input.left.expertId) {
        return this.buildResolution('PRIMARY_EXPERT', input.left, input);
      }

      if (input.primaryExpertId === input.right.expertId) {
        return this.buildResolution('PRIMARY_EXPERT', input.right, input);
      }
    }

    const leftConfidence =
      input.expertConfidenceById.get(input.left.expertId) ?? 'LOW';
    const rightConfidence =
      input.expertConfidenceById.get(input.right.expertId) ?? 'LOW';

    if (
      this.confidenceToScore(leftConfidence) !==
      this.confidenceToScore(rightConfidence)
    ) {
      const winner =
        this.confidenceToScore(leftConfidence) >
        this.confidenceToScore(rightConfidence)
          ? input.left
          : input.right;

      return this.buildResolution('HIGHER_CONFIDENCE', winner, input);
    }

    const winner =
      input.left.sequence <= input.right.sequence ? input.left : input.right;

    return this.buildResolution('EARLIER_EXECUTION_ORDER', winner, input);
  }

  detectConflicts(input: {
    primaryExpertId?: string;
    participatingExperts: readonly CoachExpertContributionSummary[];
    recommendations: readonly CoachUnifiedRecommendation[];
    expertConfidenceById: ReadonlyMap<string, CoachUnifiedConfidenceLevel>;
  }): readonly CoachCompositionConflict[] {
    const conflicts: CoachCompositionConflict[] = [];
    const workout = input.participatingExperts.find(
      (expert) => expert.expertId === 'WorkoutExpert',
    );
    const recovery = input.participatingExperts.find(
      (expert) => expert.expertId === 'RecoveryExpert',
    );
    const nutrition = input.participatingExperts.find(
      (expert) => expert.expertId === 'NutritionExpert',
    );
    const goal = input.participatingExperts.find(
      (expert) => expert.expertId === 'GoalExpert',
    );

    const recommendationByExpertId = new Map(
      input.participatingExperts.map((expert) => [expert.expertId, expert]),
    );

    if (workout && recovery) {
      const workoutRecommendation = this.findFirstRecommendation(
        input.recommendations,
        workout.expertId,
        CONFLICTING_WORKOUT_PUSH_CODES,
      );
      const recoveryRecommendation = this.findFirstRecommendation(
        input.recommendations,
        recovery.expertId,
        CONFLICTING_RECOVERY_CODES,
      );

      if (workoutRecommendation && recoveryRecommendation) {
        conflicts.push(
          this.buildConflict({
            type: 'WORKOUT_VS_RECOVERY',
            left: workout,
            right: recovery,
            leftRecommendationCode: workoutRecommendation.code,
            rightRecommendationCode: recoveryRecommendation.code,
            severity:
              recoveryRecommendation.category === 'SAFETY_CRITICAL'
                ? 'CRITICAL'
                : 'HIGH',
            primaryExpertId: input.primaryExpertId,
            expertConfidenceById: input.expertConfidenceById,
          }),
        );
      }
    }

    if (workout && goal) {
      const workoutGoalAlignment = this.resolveGoalSignal(
        recommendationByExpertId.get(workout.expertId)?.metadata,
      );
      const goalGoalAlignment = this.resolveGoalSignal(
        recommendationByExpertId.get(goal.expertId)?.metadata,
      );

      if (
        workoutGoalAlignment &&
        goalGoalAlignment &&
        workoutGoalAlignment !== goalGoalAlignment &&
        workoutGoalAlignment !== 'unknown' &&
        goalGoalAlignment !== 'unknown'
      ) {
        conflicts.push(
          this.buildConflict({
            type: 'WORKOUT_VS_GOAL',
            left: workout,
            right: goal,
            severity: 'MEDIUM',
            primaryExpertId: input.primaryExpertId,
            expertConfidenceById: input.expertConfidenceById,
          }),
        );
      }
    }

    if (nutrition && goal) {
      const nutritionGoalAlignment = this.resolveGoalSignal(
        recommendationByExpertId.get(nutrition.expertId)?.metadata,
      );
      const goalGoalAlignment = this.resolveGoalSignal(
        recommendationByExpertId.get(goal.expertId)?.metadata,
      );

      if (
        nutritionGoalAlignment &&
        goalGoalAlignment &&
        nutritionGoalAlignment !== goalGoalAlignment &&
        nutritionGoalAlignment !== 'unknown' &&
        goalGoalAlignment !== 'unknown'
      ) {
        conflicts.push(
          this.buildConflict({
            type: 'NUTRITION_VS_GOAL',
            left: nutrition,
            right: goal,
            severity: 'MEDIUM',
            primaryExpertId: input.primaryExpertId,
            expertConfidenceById: input.expertConfidenceById,
          }),
        );
      }
    }

    return Object.freeze(conflicts);
  }

  buildSummary(input: {
    primaryExpertId?: string;
    keyFindings: readonly string[];
    unifiedRisk: CoachUnifiedRisk;
    confidence: CoachUnifiedConfidence;
    recommendationCodes: readonly string[];
    conflictCount: number;
  }): string {
    return [
      `primary=${input.primaryExpertId ?? 'none'}`,
      `findings=${input.keyFindings.join(',') || 'none'}`,
      `risk=${input.unifiedRisk.level}`,
      `confidence=${input.confidence.level}`,
      `recommendations=${input.recommendationCodes.join(',') || 'none'}`,
      `conflicts=${input.conflictCount}`,
    ].join('; ');
  }

  buildKeyFindings(input: {
    participatingExperts: readonly CoachExpertContributionSummary[];
    recommendations: readonly CoachUnifiedRecommendation[];
    risks: readonly CoachUnifiedRisk[];
  }): readonly string[] {
    const findings: string[] = [];

    for (const expert of input.participatingExperts) {
      findings.push(...expert.keyFindings);
    }

    if (input.recommendations.length > 0) {
      findings.push(
        ...input.recommendations.slice(0, 3).map((recommendation) => {
          switch (recommendation.category) {
            case 'PRIMARY':
              return `PRIMARY_${recommendation.code}`;
            case 'SAFETY_CRITICAL':
              return `SAFETY_${recommendation.code}`;
            case 'SUPPORTING':
              return `SUPPORT_${recommendation.code}`;
            case 'INFORMATIONAL':
            default:
              return `INFO_${recommendation.code}`;
          }
        }),
      );
    }

    if (input.risks.length > 0) {
      findings.push(`RISK_${input.risks[0]?.level ?? 'UNKNOWN'}`);
    }

    return this.uniqueValues(findings);
  }

  buildRiskFromInput(input: {
    expertId: string;
    expertName: string;
    riskLevel: CoachUnifiedRiskLevel;
    riskSummary: string;
    riskFactors: readonly string[];
    riskMetadata: Readonly<Record<string, unknown>>;
  }): CoachUnifiedRisk {
    return Object.freeze({
      level: input.riskLevel,
      summary: input.riskSummary,
      factors: Object.freeze(this.uniqueValues([...input.riskFactors])),
      sources: Object.freeze([input.expertId]),
      metadata: Object.freeze({
        expertId: input.expertId,
        expertName: input.expertName,
        ...input.riskMetadata,
      }),
    });
  }

  buildRecommendation(input: {
    expertId: string;
    recommendation: {
      code: string;
      summary: string;
      reason?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      metadata?: Readonly<Record<string, unknown>>;
    };
    primaryExpertId?: string;
    riskLevel?: CoachUnifiedRiskLevel;
    sourceOrder: number;
  }): CoachUnifiedRecommendation {
    return Object.freeze({
      code: input.recommendation.code,
      summary: input.recommendation.summary,
      reason: input.recommendation.reason ?? input.recommendation.summary,
      priority: input.recommendation.priority ?? 'LOW',
      category: this.resolveRecommendationCategory({
        expertId: input.expertId,
        recommendationCode: input.recommendation.code,
        primaryExpertId: input.primaryExpertId,
        riskLevel: input.riskLevel,
      }),
      sourceExperts: Object.freeze([input.expertId]),
      metadata: Object.freeze({
        expertId: input.expertId,
        sourceOrder: input.sourceOrder,
        ...(input.recommendation.metadata ?? {}),
      }),
    });
  }

  mergeRecommendations(
    recommendations: readonly CoachUnifiedRecommendation[],
  ): readonly CoachUnifiedRecommendation[] {
    const merged = new Map<string, CoachUnifiedRecommendation>();

    for (const recommendation of recommendations) {
      const existing = merged.get(recommendation.code);

      if (!existing) {
        merged.set(recommendation.code, recommendation);
        continue;
      }

      merged.set(
        recommendation.code,
        Object.freeze({
          ...existing,
          sourceExperts: Object.freeze(
            this.uniqueValues([
              ...existing.sourceExperts,
              ...recommendation.sourceExperts,
            ]),
          ),
        }),
      );
    }

    return Object.freeze(
      [...merged.values()].sort((left, right) => {
        const leftCategoryIndex = RECOMMENDATION_CATEGORY_ORDER.indexOf(
          left.category,
        );
        const rightCategoryIndex = RECOMMENDATION_CATEGORY_ORDER.indexOf(
          right.category,
        );

        if (leftCategoryIndex !== rightCategoryIndex) {
          return leftCategoryIndex - rightCategoryIndex;
        }

        const leftOrder = this.readNumber(left.metadata.sourceOrder) ?? 0;
        const rightOrder = this.readNumber(right.metadata.sourceOrder) ?? 0;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.code.localeCompare(right.code);
      }),
    );
  }

  normalizePolicyBlockedRecommendationCodes(
    policyEvaluation: AgentPolicyEvaluation,
  ): readonly string[] {
    const blocked = this.readStringArray(
      this.readRecord(policyEvaluation.decision.metadata)
        ?.blockedRecommendationCodes,
    );

    return Object.freeze(blocked);
  }

  private buildConflict(input: {
    type: CoachCompositionConflictType;
    left: CoachExpertContributionSummary;
    right: CoachExpertContributionSummary;
    severity: CoachCompositionConflictSeverity;
    primaryExpertId?: string;
    expertConfidenceById: ReadonlyMap<string, CoachUnifiedConfidenceLevel>;
    leftRecommendationCode?: string;
    rightRecommendationCode?: string;
  }): CoachCompositionConflict {
    const resolution = this.resolveConflictResolution({
      conflictType: input.type,
      left: input.left,
      right: input.right,
      primaryExpertId: input.primaryExpertId,
      leftRecommendationCode: input.leftRecommendationCode,
      rightRecommendationCode: input.rightRecommendationCode,
      expertConfidenceById: input.expertConfidenceById,
    });

    return Object.freeze({
      type: input.type,
      experts: Object.freeze([input.left.expertId, input.right.expertId]),
      severity: input.severity,
      resolution,
      metadata: Object.freeze({
        leftSequence: input.left.sequence,
        rightSequence: input.right.sequence,
      }),
    });
  }

  private buildResolution(
    strategy: CoachCompositionResolutionStrategy,
    winner: CoachExpertContributionSummary,
    input: {
      conflictType: CoachCompositionConflictType;
      left: CoachExpertContributionSummary;
      right: CoachExpertContributionSummary;
      leftRecommendationCode?: string;
      rightRecommendationCode?: string;
    },
  ): CoachCompositionConflictResolution {
    const winnerRecommendationCode =
      winner.expertId === input.left.expertId
        ? input.leftRecommendationCode
        : input.rightRecommendationCode;

    return Object.freeze({
      strategy,
      winnerExpertId: winner.expertId,
      ...(winnerRecommendationCode ? { winnerRecommendationCode } : {}),
      metadata: Object.freeze({
        conflictType: input.conflictType,
        winnerSequence: winner.sequence,
      }),
    });
  }

  private pickHighestRiskLevel(
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

  private findFirstRecommendation(
    recommendations: readonly CoachUnifiedRecommendation[],
    expertId: string,
    allowedCodes: ReadonlySet<string>,
  ): CoachUnifiedRecommendation | undefined {
    return recommendations.find(
      (recommendation) =>
        recommendation.sourceExperts.includes(expertId) &&
        allowedCodes.has(recommendation.code),
    );
  }

  private confidenceToScore(
    confidence: CoachUnifiedConfidenceLevel | string,
  ): number {
    switch (confidence) {
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
      default:
        return 1;
    }
  }

  private scoreToConfidence(score: number): CoachUnifiedConfidenceLevel {
    if (score >= 2) {
      return 'HIGH';
    }

    if (score >= 1.35) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private riskToScore(level: CoachUnifiedRiskLevel): number {
    return RISK_ORDER.indexOf(level) === -1
      ? Number.MAX_SAFE_INTEGER
      : 4 - RISK_ORDER.indexOf(level);
  }

  private averageScore(scores: readonly number[]): number {
    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private buildConfidenceFactors(input: {
    input: {
      primaryExpert?: CoachExpertContributionSummary | null;
      participatingExperts: readonly CoachExpertContributionSummary[];
      policyEvaluation: AgentPolicyEvaluation;
      routingConfidence: string;
      runtimeCompleteness: 'FULL' | 'PARTIAL' | 'EMPTY';
      expertExecutionDurationMs: number;
    };
    expertScore: number;
    routeScore: number;
    policyScore: number;
    completenessScore: number;
  }): string[] {
    const factors: string[] = [];

    if (input.input.primaryExpert) {
      factors.push('PRIMARY_EXPERT_PRESENT');
    }

    if (input.input.participatingExperts.length > 1) {
      factors.push('MULTI_EXPERT_COVERAGE');
    }

    if (input.input.policyEvaluation.decision.approved) {
      factors.push('POLICY_APPROVED');
    }

    if (input.input.runtimeCompleteness === 'FULL') {
      factors.push('FULL_RUNTIME_COMPLETENESS');
    }

    if (input.input.expertExecutionDurationMs > 0) {
      factors.push('EXPERT_EXECUTION_COMPLETE');
    }

    if (input.expertScore >= 2) {
      factors.push('HIGH_EXPERT_CONFIDENCE');
    }

    if (input.routeScore >= 2) {
      factors.push('ROUTE_CONFIDENCE_STRONG');
    }

    if (input.policyScore > 0) {
      factors.push('POLICY_SUPPORTIVE');
    }

    if (input.completenessScore > 0.5) {
      factors.push('EVIDENCE_COMPLETE');
    }

    return this.uniqueValues(factors);
  }

  private readRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private resolveGoalSignal(
    metadata?: Readonly<Record<string, unknown>>,
  ): string | undefined {
    const record = this.readRecord(metadata);
    const goalAlignment = this.readString(record?.goalAlignment);

    if (goalAlignment) {
      return goalAlignment;
    }

    return this.readString(record?.goalType);
  }

  private readStringArray(value: unknown): readonly string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private uniqueValues<T>(values: readonly T[]): readonly T[] {
    return [...new Set(values)];
  }
}
