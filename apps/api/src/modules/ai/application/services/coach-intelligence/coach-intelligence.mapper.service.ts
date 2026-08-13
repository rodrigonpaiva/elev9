import { Injectable } from '@nestjs/common';

import type {
  CoachCompositionConflict,
  CoachConfidenceLevel,
  CoachDecisionReason,
  CoachEvidence,
  CoachEvidenceAvailability,
  CoachEvidenceImportance,
  CoachExpertName,
  CoachIntelligenceAggregate,
  CoachIntelligenceAvailability,
  CoachIntelligenceFreshness,
  CoachIntelligenceHeader,
  CoachIntelligenceInsight,
  CoachIntelligenceMetadata,
  CoachIntelligenceOwnership,
  CoachIntelligenceRolloutState,
  CoachIntelligenceSectionState,
  CoachIntelligenceSections,
  CoachIntelligenceWarning,
  CoachRecommendationPriority,
  CoachRiskLevel,
  CoachUnifiedAssessment,
  CoachUnifiedConfidence,
  CoachUnifiedRecommendation,
  CoachUnifiedRisk,
} from '@elev9/types';

import { CoachIntelligenceFreshnessPolicy } from './coach-intelligence.policy';
import type {
  CoachIntelligenceBuildResult,
  CoachIntelligenceSourceContext,
  CoachIntelligenceSourceSectionState,
} from './coach-intelligence.types';

const COACH_INTELLIGENCE_SOURCE_VERSION = '1.0.0';
const COACH_INTELLIGENCE_CONTRACT_VERSION = '1';

const EXPERT_NAME_BY_ID: Readonly<Record<string, CoachExpertName>> =
  Object.freeze({
    WorkoutExpert: 'Workout',
    NutritionExpert: 'Nutrition',
    RecoveryExpert: 'Recovery',
    GoalExpert: 'Goal',
    HabitExpert: 'Habit',
    ProgressExpert: 'Progress',
    MotivationExpert: 'Motivation',
  });

const PUBLIC_EXPERT_NAMES = new Set<CoachExpertName>([
  'Workout',
  'Nutrition',
  'Recovery',
  'Goal',
  'Habit',
  'Progress',
  'Motivation',
]);

const EVIDENCE_TITLE_BY_TYPE: Readonly<Record<string, string>> = Object.freeze({
  WORKOUT_HISTORY: 'Workout history',
  WORKOUT_COMPLETION: 'Workout completion',
  RECOVERY_CHECK_IN: 'Recovery check-in',
  RECOVERY_SNAPSHOT: 'Recovery snapshot',
  NUTRITION_PROFILE: 'Nutrition profile',
  GOAL_PROGRESS: 'Goal progress',
  HABIT_STREAK: 'Habit streak',
  WEEKLY_PROGRESS: 'Weekly progress',
  RECENT_MILESTONE: 'Recent milestone',
  PLATEAU_SIGNAL: 'Plateau signal',
  SAFETY_RISK: 'Safety risk',
  CONFLICTING_GUIDANCE: 'Conflicting guidance',
  PERSONALIZATION_SIGNAL: 'Personalization signal',
  RUNTIME_COMPLETENESS: 'Runtime completeness',
  POLICY_RESTRICTION: 'Policy restriction',
  EXPERT_CONTRIBUTION: 'Expert contribution',
});

@Injectable()
export class CoachIntelligenceMapperService {
  constructor(
    private readonly freshnessPolicy: CoachIntelligenceFreshnessPolicy,
  ) {}

  map(
    input: CoachIntelligenceBuildResult & {
      aggregateId: string;
      requestId: string;
      sourceVersion?: string;
      rolloutState?: CoachIntelligenceRolloutState;
    },
  ): CoachIntelligenceAggregate {
    const aggregateId = input.aggregateId;
    const requestId = input.requestId;
    const generatedAt = input.source.generatedAt;
    const sections = this.buildSections(input.source);
    const availability = this.freshnessPolicy.resolveAggregateAvailability({
      sections: input.source.sections,
      featureEnabled: true,
      fallbackUsed: this.hasFallback(input.source.sections),
    });
    const freshness = this.freshnessPolicy.resolveAggregateFreshness({
      generatedAt,
      sections: input.source.sections,
    });
    const featureAvailability = this.freshnessPolicy.resolveFeatureAvailability(
      {
        sections: input.source.sections,
      },
    );
    const explanation = this.mapExplanation(input);
    const evidence = explanation.evidence;
    const insight = this.buildInsight({
      input,
      evidence,
      explanation: input.pipeline.explanation,
    });
    const warnings = this.buildWarnings({
      source: input.source,
      availability,
      insight,
      explanation,
    });
    const header: CoachIntelligenceHeader = Object.freeze({
      aggregateId,
      requestId,
      generatedAt,
      sourceVersion: input.sourceVersion ?? COACH_INTELLIGENCE_SOURCE_VERSION,
      rolloutState: input.rolloutState ?? 'aggregate',
    });
    const ownership: CoachIntelligenceOwnership = Object.freeze({
      primaryExpert: this.resolvePrimaryExpertName(input),
      participatingExperts: this.resolveParticipatingExpertNames(input),
      supportingExperts: this.resolveSupportingExpertNames(input),
    });
    const metadata: CoachIntelligenceMetadata = Object.freeze({
      contractVersion: COACH_INTELLIGENCE_CONTRACT_VERSION,
      partialResult:
        availability.status !== 'available' ||
        warnings.some((warning) => warning.code === 'PARTIAL_RESPONSE'),
      fallbackUsed: availability.fallbackUsed,
      featureAvailability,
    });

    return {
      header,
      ownership,
      insight,
      evidence,
      explainability: explanation,
      warnings: [...warnings],
      availability,
      freshness,
      sections,
      metadata,
    };
  }

  private buildSections(
    source: CoachIntelligenceSourceContext,
  ): CoachIntelligenceSections {
    return {
      training: this.mapSectionState(source.sections.training),
      nutrition: this.mapSectionState(source.sections.nutrition),
      recovery: this.mapSectionState(source.sections.recovery),
      goals: this.mapSectionState(source.sections.goals),
      habits: this.mapSectionState(source.sections.habits),
      progress: this.mapSectionState(source.sections.progress),
      personalization: this.mapSectionState(source.sections.personalization),
      notifications: this.mapSectionState(source.sections.notifications),
    };
  }

  private mapSectionState<TSectionData>(
    section: CoachIntelligenceSourceSectionState<TSectionData>,
  ): CoachIntelligenceSectionState<TSectionData> {
    return {
      availability: section.availability,
      freshness: section.freshness,
      data: section.data,
      warnings: [...section.warnings],
    };
  }

  private mapExplanation(
    input: CoachIntelligenceBuildResult,
  ): CoachIntelligenceAggregate['explainability'] {
    const internal = input.pipeline.explanation;
    const publicEvidence = this.mapEvidenceList({
      evidence: internal.evidence,
      primaryExpert: this.resolvePrimaryExpertName(input),
    });
    const evidenceIds = new Map(
      internal.evidence.map((evidence, index) => [
        evidence,
        `evidence-${String(index + 1).padStart(2, '0')}`,
      ]),
    );
    const decisionReasons = internal.decisionReasons.map((reason) =>
      this.mapDecisionReason(reason, evidenceIds),
    );
    const recommendationReasons = internal.recommendationReasons.map((reason) =>
      this.mapRecommendationReason(reason, evidenceIds),
    );
    const riskExplanations = internal.riskExplanations.map((risk) =>
      this.mapRiskExplanation(risk, evidenceIds),
    );
    const conflictExplanations = internal.conflictExplanations.map((conflict) =>
      this.mapConflictExplanation(conflict),
    );
    const missingEvidence = internal.missingEvidence.map((missing) =>
      this.mapMissingEvidence(missing),
    );

    return {
      evidence: [...publicEvidence],
      decisionReasons: [...decisionReasons],
      recommendationReasons: [...recommendationReasons],
      riskExplanations: [...riskExplanations],
      confidenceExplanation: {
        confidence: internal.confidenceExplanation.confidence,
        supportingEvidenceCount:
          internal.confidenceExplanation.supportingEvidenceCount,
        supportingExpertCount:
          internal.confidenceExplanation.supportingExpertCount,
        missingEvidenceCount:
          internal.confidenceExplanation.missingEvidenceCount,
        policyRestrictions: [
          ...internal.confidenceExplanation.policyRestrictions,
        ],
        metadata: {
          ...internal.confidenceExplanation.metadata,
        },
      },
      conflictExplanations: [...conflictExplanations],
      missingEvidence: [...missingEvidence],
      metadata: {
        generatedAt: input.source.generatedAt,
        durationMs: input.pipeline.explainabilityDurationMs,
        evidenceCount: publicEvidence.length,
        explanationCount:
          decisionReasons.length +
          recommendationReasons.length +
          riskExplanations.length +
          conflictExplanations.length,
        missingEvidenceCount: missingEvidence.length,
      },
      summary: internal.summary,
    };
  }

  private mapEvidenceList(input: {
    evidence: CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'];
    primaryExpert: CoachExpertName | null;
  }): CoachEvidence[] {
    return input.evidence.map((evidence, index) => {
      const expert = this.resolveEvidenceExpert(evidence, input.primaryExpert);

      return {
        id: `evidence-${String(index + 1).padStart(2, '0')}`,
        type: evidence.type,
        source: expert,
        expert,
        importance: evidence.importance,
        confidence:
          evidence.confidence === 'UNKNOWN' ? 'LOW' : evidence.confidence,
        availability: evidence.availability,
        title: this.resolveEvidenceTitle(evidence.type),
        detail: this.resolveEvidenceDetail(evidence, index + 1),
        metadata: {
          ...evidence.metadata,
        },
      };
    });
  }

  private mapDecisionReason(
    reason: CoachIntelligenceBuildResult['pipeline']['explanation']['decisionReasons'][number],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): CoachDecisionReason {
    return {
      code: reason.code,
      title: this.humanize(reason.code),
      supportingEvidenceIds: this.resolveEvidenceIds(
        reason.supportingEvidence,
        evidenceIds,
      ),
      supportingExperts: this.resolveExpertNames(reason.supportingExperts),
      priority: this.mapPriorityReason(reason.priority),
      reasonCategory: reason.reasonCategory,
      metadata: {
        ...reason.metadata,
        decisionType: reason.decisionType,
      },
    };
  }

  private mapRecommendationReason(
    reason: CoachIntelligenceBuildResult['pipeline']['explanation']['recommendationReasons'][number],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): CoachIntelligenceAggregate['explainability']['recommendationReasons'][number] {
    return {
      recommendationCode: reason.recommendationCode,
      supportingEvidenceIds: this.resolveEvidenceIds(
        reason.supportingEvidence,
        evidenceIds,
      ),
      supportingExperts: this.resolveExpertNames(reason.supportingExperts),
      priority: this.mapRecommendationPriority(reason.priority),
      reasonCategory: reason.reasonCategory,
      metadata: {
        ...reason.metadata,
      },
    };
  }

  private mapRiskExplanation(
    risk: CoachIntelligenceBuildResult['pipeline']['explanation']['riskExplanations'][number],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): CoachIntelligenceAggregate['explainability']['riskExplanations'][number] {
    return {
      riskLevel: risk.riskLevel,
      supportingEvidenceIds: this.resolveEvidenceIds(
        risk.supportingEvidence,
        evidenceIds,
      ),
      supportingExperts: this.resolveExpertNames(risk.supportingExperts),
      severity: risk.severity,
      metadata: {
        ...risk.metadata,
      },
    };
  }

  private mapConflictExplanation(
    conflict: CoachIntelligenceBuildResult['pipeline']['explanation']['conflictExplanations'][number],
  ): CoachIntelligenceAggregate['explainability']['conflictExplanations'][number] {
    return {
      conflictType: conflict.conflictType,
      experts: this.resolveExpertNames(conflict.experts),
      resolution: `${conflict.resolution.strategy}:${conflict.resolution.winnerExpertId ?? 'none'}:${conflict.resolution.winnerRecommendationCode ?? 'none'}`,
      resolvedBy: conflict.resolvedBy,
      severity: conflict.severity,
      metadata: {
        ...conflict.metadata,
        resolution: conflict.resolution.metadata,
      },
    };
  }

  private mapMissingEvidence(
    missing: CoachIntelligenceBuildResult['pipeline']['explanation']['missingEvidence'][number],
  ): CoachIntelligenceAggregate['explainability']['missingEvidence'][number] {
    return {
      type: missing.type,
      source: missing.source,
      availability: missing.availability,
      metadata: {
        ...missing.metadata,
      },
    };
  }

  private buildInsight(input: {
    input: CoachIntelligenceBuildResult;
    evidence: readonly CoachEvidence[];
    explanation: CoachIntelligenceBuildResult['pipeline']['explanation'];
  }): CoachIntelligenceInsight {
    const composition = input.input.pipeline.composition;
    const evidenceIds = new Map(
      input.explanation.evidence.map((evidence, index) => [
        evidence,
        `evidence-${String(index + 1).padStart(2, '0')}`,
      ]),
    );
    const recommendations = composition.recommendations.map((recommendation) =>
      this.mapRecommendation(recommendation, input.explanation, evidenceIds),
    );
    const risks = composition.risks.map((risk) =>
      this.mapRisk(risk, input.explanation, evidenceIds),
    );
    const keyFindings = composition.keyFindings.map((finding) =>
      this.mapAssessment(finding, input.input, input.evidence),
    );
    const topRecommendation = recommendations[0] ?? null;
    const currentRisk = risks[0] ?? null;

    return {
      summary: composition.summary,
      dailyPriority: topRecommendation?.priority ?? 'INFORMATIONAL',
      currentFocus: this.resolveFocus(input.input, currentRisk),
      currentRisk,
      topRecommendation,
      keyFindings: [...keyFindings],
      recommendations: [...recommendations],
      risks: [...risks],
      confidence: this.mapConfidence(input.input),
      conflicts: composition.conflicts.map((conflict) =>
        this.mapCompositionConflict(conflict),
      ),
    };
  }

  private mapRecommendation(
    recommendation: CoachIntelligenceBuildResult['pipeline']['composition']['recommendations'][number],
    explanation: CoachIntelligenceBuildResult['pipeline']['explanation'],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): CoachUnifiedRecommendation {
    const supportingEvidenceIds =
      this.resolveRecommendationEvidenceIds(
        recommendation.code,
        explanation,
        evidenceIds,
      ) ?? [];
    const expert =
      this.mapExpertIdToName(recommendation.sourceExperts[0] ?? '') ??
      this.resolvePrimaryExpertNameFromExperts(recommendation.sourceExperts) ??
      'Progress';

    return {
      code: recommendation.code,
      title: recommendation.summary,
      detail: recommendation.reason,
      expert,
      priority: recommendation.category,
      supportingEvidenceIds: [...supportingEvidenceIds],
      metadata: {
        ...recommendation.metadata,
        sourceExperts: recommendation.sourceExperts,
        category: recommendation.category,
      },
    };
  }

  private mapRisk(
    risk: CoachIntelligenceBuildResult['pipeline']['composition']['risks'][number],
    explanation: CoachIntelligenceBuildResult['pipeline']['explanation'],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): CoachUnifiedRisk {
    const supportingEvidenceIds =
      this.resolveRiskEvidenceIds(risk.level, explanation, evidenceIds) ?? [];
    const sources = this.resolveExpertNames(risk.sources);

    return {
      level: risk.level,
      sources,
      title: this.humanize(`${risk.level}_RISK`),
      detail: risk.summary,
      evidenceIds: [...supportingEvidenceIds],
      metadata: {
        ...risk.metadata,
        factors: [...risk.factors],
      },
    };
  }

  private mapAssessment(
    finding: string,
    input: CoachIntelligenceBuildResult,
    evidence: readonly CoachEvidence[],
  ): CoachUnifiedAssessment {
    const code = this.normalizeAssessmentCode(finding);
    const primaryExpert = this.resolvePrimaryExpertName(input);
    const evidenceIds = this.resolveFindingEvidenceIds(code, evidence);

    return {
      code,
      title: this.humanize(code),
      detail: this.buildAssessmentDetail(code, input),
      expert: primaryExpert,
      evidenceIds: [...evidenceIds],
      metadata: {
        finding,
        sourceExperts: input.pipeline.composition.participatingExperts.map(
          (expert) =>
            this.mapExpertIdToName(expert.expertId) ?? expert.expertId,
        ),
      },
    };
  }

  private mapConfidence(
    input: CoachIntelligenceBuildResult,
  ): CoachUnifiedConfidence {
    const explanation = input.pipeline.explanation;
    const composition = input.pipeline.composition;
    const supportingExperts = new Set(
      explanation.decisionReasons.flatMap((reason) => reason.supportingExperts),
    );
    const supportingEvidence = new Set(
      explanation.decisionReasons.flatMap((reason) =>
        reason.supportingEvidence.map((evidence) => evidence.type),
      ),
    );

    return {
      level: composition.confidence.level,
      evidenceCount: explanation.evidence.length,
      supportingEvidenceCount: supportingEvidence.size,
      missingEvidenceCount: explanation.missingEvidence.length,
      policyConfidence: input.pipeline.policyEvaluation.decision.approved
        ? 'HIGH'
        : 'LOW',
      runtimeCompleteness:
        composition.metadata.runtimeCompleteness === 'FULL'
          ? 'HIGH'
          : composition.metadata.runtimeCompleteness === 'PARTIAL'
            ? 'MEDIUM'
            : 'LOW',
      detail: composition.confidence.summary,
    };
  }

  private mapCompositionConflict(
    conflict: CoachIntelligenceBuildResult['pipeline']['composition']['conflicts'][number],
  ): CoachCompositionConflict {
    return {
      type: conflict.type,
      experts: this.resolveExpertNames(conflict.experts),
      severity: conflict.severity,
      resolution: `${conflict.resolution.strategy}:${conflict.resolution.winnerExpertId ?? 'none'}:${conflict.resolution.winnerRecommendationCode ?? 'none'}`,
      metadata: {
        ...conflict.metadata,
        resolution: conflict.resolution.metadata,
      },
    };
  }

  private buildWarnings(input: {
    source: CoachIntelligenceSourceContext;
    availability: CoachIntelligenceAvailability;
    insight: CoachIntelligenceInsight;
    explanation: CoachIntelligenceAggregate['explainability'];
  }): readonly CoachIntelligenceWarning[] {
    const warnings = new Map<string, CoachIntelligenceWarning>();

    for (const section of Object.values(input.source.sections)) {
      for (const warning of section.warnings) {
        warnings.set(
          `${warning.code}:${warning.affectedSections.join(',')}`,
          warning,
        );
      }
    }

    if (input.availability.status !== 'available') {
      warnings.set('PARTIAL_RESPONSE:aggregate', {
        code: 'PARTIAL_RESPONSE',
        severity: 'MEDIUM',
        affectedSections: ['insight', 'evidence', 'explainability'],
        retryable: input.availability.retryable,
        title: 'Coach intelligence is partially available.',
        detail: 'Some sections returned partial or unavailable data.',
        metadata: {
          status: input.availability.status,
        },
      });
    }

    if (input.availability.fallbackUsed) {
      warnings.set('FALLBACK_USED:aggregate', {
        code: 'FALLBACK_USED',
        severity: 'LOW',
        affectedSections: ['insight'],
        retryable: true,
        title: 'Fallback data was used.',
        detail: 'At least one section required a fallback path.',
        metadata: {
          fallbackUsed: true,
        },
      });
    }

    if (input.insight.confidence.level === 'LOW') {
      warnings.set('LOW_CONFIDENCE:aggregate', {
        code: 'LOW_CONFIDENCE',
        severity: 'LOW',
        affectedSections: ['insight', 'explainability'],
        retryable: false,
        title: 'Coach confidence is low.',
        detail: 'The composed intelligence has limited supporting evidence.',
        metadata: {
          confidence: input.insight.confidence.level,
        },
      });
    }

    if (input.insight.topRecommendation === null) {
      warnings.set('NO_SAFE_RECOMMENDATION:aggregate', {
        code: 'NO_SAFE_RECOMMENDATION',
        severity: 'MEDIUM',
        affectedSections: ['insight'],
        retryable: false,
        title: 'No safe recommendation was selected.',
        detail:
          'The current aggregate does not include a safe top recommendation.',
        metadata: {
          recommendationCount: input.insight.recommendations.length,
        },
      });
    }

    if (input.explanation.missingEvidence.length > 0) {
      warnings.set('EXPLAINABILITY_REDACTED:aggregate', {
        code: 'EXPLAINABILITY_REDACTED',
        severity: 'LOW',
        affectedSections: ['explainability'],
        retryable: false,
        title: 'Some explainability evidence was redacted.',
        detail: 'One or more evidence items were not available for disclosure.',
        metadata: {
          missingEvidenceCount: input.explanation.missingEvidence.length,
        },
      });
    }

    return Object.freeze([...warnings.values()]);
  }

  private resolvePrimaryExpertName(
    input: CoachIntelligenceBuildResult,
  ): CoachExpertName {
    return (
      this.mapExpertIdToName(
        input.pipeline.composition.primaryExpert?.id ??
          input.pipeline.composition.participatingExperts[0]?.expertId ??
          '',
      ) ?? 'Progress'
    );
  }

  private resolveParticipatingExpertNames(
    input: CoachIntelligenceBuildResult,
  ): CoachExpertName[] {
    return input.pipeline.composition.participatingExperts
      .map((expert) => this.mapExpertIdToName(expert.expertId))
      .filter((value): value is CoachExpertName => Boolean(value));
  }

  private resolveSupportingExpertNames(
    input: CoachIntelligenceBuildResult,
  ): CoachExpertName[] {
    return input.pipeline.composition.supportingExperts
      .map((expert) => this.mapExpertIdToName(expert.expertId))
      .filter((value): value is CoachExpertName => Boolean(value));
  }

  private resolvePrimaryExpertNameFromExperts(
    expertIds: readonly string[],
  ): CoachExpertName | undefined {
    for (const expertId of expertIds) {
      const mapped = this.mapExpertIdToName(expertId);
      if (mapped) {
        return mapped;
      }
    }

    return undefined;
  }

  private resolveEvidenceIds(
    evidence: CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): string[] {
    return evidence.flatMap((item) => evidenceIds.get(item) ?? []);
  }

  private resolveRecommendationEvidenceIds(
    recommendationCode: string,
    explanation: CoachIntelligenceBuildResult['pipeline']['explanation'],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): string[] | undefined {
    const reason = explanation.recommendationReasons.find(
      (item) => item.recommendationCode === recommendationCode,
    );

    return reason
      ? this.resolveEvidenceIds(reason.supportingEvidence, evidenceIds)
      : undefined;
  }

  private resolveRiskEvidenceIds(
    riskLevel: CoachRiskLevel,
    explanation: CoachIntelligenceBuildResult['pipeline']['explanation'],
    evidenceIds: ReadonlyMap<
      CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
      string
    >,
  ): string[] | undefined {
    const risk = explanation.riskExplanations.find(
      (item) => item.riskLevel === riskLevel,
    );

    return risk
      ? this.resolveEvidenceIds(risk.supportingEvidence, evidenceIds)
      : undefined;
  }

  private resolveFindingEvidenceIds(
    code: string,
    evidence: readonly CoachEvidence[],
  ): string[] {
    const matchingTypes = this.resolveFindingEvidenceTypes(code);

    return evidence
      .filter(
        (item) =>
          matchingTypes.length === 0 ||
          matchingTypes.includes(item.type) ||
          this.mapExpertIdToName(item.expert ?? item.source) === item.expert,
      )
      .map((item) => item.id);
  }

  private resolveFindingEvidenceTypes(code: string): readonly string[] {
    switch (code) {
      case 'LOW_RECOVERY':
        return ['RECOVERY_CHECK_IN', 'RECOVERY_SNAPSHOT', 'SAFETY_RISK'];
      case 'STRONG_PROGRESS':
        return ['WEEKLY_PROGRESS', 'GOAL_PROGRESS', 'WORKOUT_COMPLETION'];
      case 'CONSISTENT_HABITS':
        return ['HABIT_STREAK'];
      case 'PLATEAU':
        return ['WEEKLY_PROGRESS', 'GOAL_PROGRESS', 'PLATEAU_SIGNAL'];
      case 'HIGH_MOTIVATION':
        return ['PERSONALIZATION_SIGNAL', 'EXPERT_CONTRIBUTION'];
      case 'RECENT_MILESTONE':
        return ['RECENT_MILESTONE'];
      case 'NUTRITION_INCONSISTENCY':
        return ['NUTRITION_PROFILE', 'EXPERT_CONTRIBUTION'];
      default:
        return [];
    }
  }

  private resolveEvidenceExpert(
    evidence: CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
    primaryExpert: CoachExpertName | null,
  ): CoachExpertName {
    if (evidence.expert) {
      const expertName = this.mapExpertIdToName(evidence.expert);
      if (expertName) {
        return expertName;
      }
    }

    switch (evidence.type) {
      case 'WORKOUT_HISTORY':
      case 'WORKOUT_COMPLETION':
        return 'Workout';
      case 'RECOVERY_CHECK_IN':
      case 'RECOVERY_SNAPSHOT':
        return 'Recovery';
      case 'NUTRITION_PROFILE':
        return 'Nutrition';
      case 'GOAL_PROGRESS':
      case 'RECENT_MILESTONE':
      case 'PLATEAU_SIGNAL':
        return 'Goal';
      case 'HABIT_STREAK':
        return 'Habit';
      case 'WEEKLY_PROGRESS':
      case 'RUNTIME_COMPLETENESS':
        return 'Progress';
      case 'PERSONALIZATION_SIGNAL':
        return 'Motivation';
      case 'SAFETY_RISK':
      case 'CONFLICTING_GUIDANCE':
      case 'POLICY_RESTRICTION':
        return primaryExpert ?? 'Motivation';
      case 'EXPERT_CONTRIBUTION':
        return primaryExpert ?? 'Progress';
      default:
        return primaryExpert ?? 'Progress';
    }
  }

  private resolveEvidenceTitle(type: string): string {
    return EVIDENCE_TITLE_BY_TYPE[type] ?? this.humanize(type);
  }

  private resolveEvidenceDetail(
    evidence: CoachIntelligenceBuildResult['pipeline']['explanation']['evidence'][number],
    evidenceNumber: number,
  ): string {
    const metadata = evidence.metadata;

    switch (evidence.type) {
      case 'WORKOUT_HISTORY':
        return `${this.readNumber(metadata.workoutLogCount) ?? evidenceNumber} workout logs reviewed.`;
      case 'WORKOUT_COMPLETION':
        return metadata.recentWorkoutDate
          ? `Most recent workout: ${String(metadata.recentWorkoutDate)}.`
          : 'Recent workout completion was reviewed.';
      case 'RECOVERY_CHECK_IN':
        return metadata.hasCheckIn
          ? 'Recovery check-in is available.'
          : 'Recovery check-in is missing.';
      case 'RECOVERY_SNAPSHOT':
        return metadata.hasRecoverySnapshot
          ? `Readiness score: ${String(metadata.readinessScore ?? 'unknown')}.`
          : 'Recovery snapshot is unavailable.';
      case 'NUTRITION_PROFILE':
        return metadata.hasNutritionProfile
          ? 'Nutrition profile is available.'
          : 'Nutrition profile is missing.';
      case 'GOAL_PROGRESS':
        return `Current streak: ${String(metadata.currentStreak ?? 0)}.`;
      case 'HABIT_STREAK':
        return `Habit streak is ${String(metadata.currentStreak ?? 0)}.`;
      case 'WEEKLY_PROGRESS':
        return `Weekly workouts: ${String(metadata.recentWorkoutCount ?? 0)}.`;
      case 'RECENT_MILESTONE':
        return 'A recent milestone was identified.';
      case 'PLATEAU_SIGNAL':
        return 'A plateau signal was identified.';
      case 'SAFETY_RISK':
        return 'A safety-sensitive signal was identified.';
      case 'CONFLICTING_GUIDANCE':
        return 'Conflicting guidance was identified.';
      case 'PERSONALIZATION_SIGNAL':
        return 'Personalization signals were available.';
      case 'RUNTIME_COMPLETENESS':
        return `Runtime completeness: ${String(metadata.completeness ?? 'unknown')}.`;
      case 'POLICY_RESTRICTION':
        return 'Policy restrictions were applied.';
      case 'EXPERT_CONTRIBUTION':
        return 'An expert contribution was available.';
      default:
        return `Evidence ${evidenceNumber}.`;
    }
  }

  private mapPriorityReason(priority: string): CoachDecisionReason['priority'] {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return 'primary';
      case 'MEDIUM':
        return 'supporting';
      default:
        return 'informational';
    }
  }

  private mapRecommendationPriority(
    priority: string,
  ): CoachRecommendationPriority {
    switch (priority) {
      case 'CRITICAL':
        return 'PRIMARY';
      case 'HIGH':
        return 'SAFETY_CRITICAL';
      case 'MEDIUM':
        return 'SUPPORTING';
      default:
        return 'INFORMATIONAL';
    }
  }

  private mapExpertIdToName(
    expertId?: string | null,
  ): CoachExpertName | undefined {
    if (!expertId) {
      return undefined;
    }

    if (PUBLIC_EXPERT_NAMES.has(expertId as CoachExpertName)) {
      return expertId as CoachExpertName;
    }

    return (
      EXPERT_NAME_BY_ID[expertId] ?? this.resolveExpertByIdPattern(expertId)
    );
  }

  private resolveExpertByIdPattern(
    expertId: string,
  ): CoachExpertName | undefined {
    const normalized = expertId.toLowerCase();

    if (normalized.includes('workout')) {
      return 'Workout';
    }

    if (normalized.includes('nutrition')) {
      return 'Nutrition';
    }

    if (normalized.includes('recovery')) {
      return 'Recovery';
    }

    if (normalized.includes('goal')) {
      return 'Goal';
    }

    if (normalized.includes('habit')) {
      return 'Habit';
    }

    if (normalized.includes('progress')) {
      return 'Progress';
    }

    if (normalized.includes('motiv')) {
      return 'Motivation';
    }

    return undefined;
  }

  private resolveExpertNames(experts: readonly string[]): CoachExpertName[] {
    return experts
      .map((expert) => this.mapExpertIdToName(expert))
      .filter((value): value is CoachExpertName => Boolean(value));
  }

  private resolveFocus(
    input: CoachIntelligenceBuildResult,
    currentRisk: CoachIntelligenceAggregate['insight']['currentRisk'],
  ): CoachIntelligenceAggregate['insight']['currentFocus'] {
    if (currentRisk && ['CRITICAL', 'HIGH'].includes(currentRisk.level)) {
      return 'SAFETY';
    }

    const primaryExpert = this.resolvePrimaryExpertName(input);

    switch (primaryExpert) {
      case 'Workout':
        return 'WORKOUT';
      case 'Nutrition':
        return 'NUTRITION';
      case 'Recovery':
        return 'RECOVERY';
      case 'Goal':
        return 'GOALS';
      case 'Habit':
        return 'CONSISTENCY';
      case 'Progress':
        return 'PROGRESS';
      case 'Motivation':
        return 'MOTIVATION';
      default:
        return 'PROGRESS';
    }
  }

  private buildAssessmentDetail(
    code: string,
    input: CoachIntelligenceBuildResult,
  ): string {
    switch (code) {
      case 'LOW_RECOVERY':
        return 'Recovery signals are currently weaker than ideal.';
      case 'STRONG_PROGRESS':
        return 'Progress signals are trending positively.';
      case 'CONSISTENT_HABITS':
        return 'Habit signals are steady and consistent.';
      case 'PLATEAU':
        return 'Progress appears to be temporarily flattening.';
      case 'HIGH_MOTIVATION':
        return 'Motivation signals are elevated.';
      case 'RECENT_MILESTONE':
        return 'A recent milestone was reached.';
      case 'NUTRITION_INCONSISTENCY':
        return 'Nutrition signals show inconsistency.';
      default:
        return input.pipeline.composition.summary;
    }
  }

  private normalizeAssessmentCode(
    code: string,
  ): CoachUnifiedAssessment['code'] {
    const normalized = code.trim().toUpperCase();

    switch (normalized) {
      case 'LOW_RECOVERY':
      case 'STRONG_PROGRESS':
      case 'CONSISTENT_HABITS':
      case 'PLATEAU':
      case 'HIGH_MOTIVATION':
      case 'RECENT_MILESTONE':
      case 'NUTRITION_INCONSISTENCY':
        return normalized;
      default:
        return 'STRONG_PROGRESS';
    }
  }

  private hasFallback(
    source: CoachIntelligenceSourceContext['sections'],
  ): boolean {
    return Object.values(source).some((section) => section.fallbackUsed);
  }

  private humanize(value: string): string {
    return value
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }
}
