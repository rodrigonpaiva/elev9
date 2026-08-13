import { Injectable } from '@nestjs/common';

import type { AgentContextDomain } from '../agent/agent.types';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition.types';
import type { CoachPersonaGuidance } from '../persona/coach-persona-engine';
import type {
  CoachConfidenceExplanation,
  CoachConflictExplanation,
  CoachDecisionReason,
  CoachEvidence,
  CoachEvidenceAvailability,
  CoachEvidenceImportance,
  CoachExplainabilityEngineInput,
  CoachExplainabilityMetadata,
  CoachExplanation,
  CoachMissingEvidence,
  CoachRecommendationReason,
  CoachRiskExplanation,
} from './coach-explainability.types';

const EXPLANATION_VERSION = 'coach-explainability-v1';

@Injectable()
export class CoachExplainabilityPolicy {
  resolveExplanation(input: CoachExplainabilityEngineInput): CoachExplanation {
    const composition = input.unifiedCoachIntelligence;
    const persona = input.coachPersonaGuidance;
    const blockedExpertIds = this.resolveBlockedExpertIds(input);
    const evidences = this.buildEvidence(input, blockedExpertIds);
    const missingEvidence = this.buildMissingEvidence(input, blockedExpertIds);
    const participatingExperts = this.resolveParticipatingExperts(
      composition,
      blockedExpertIds,
    );
    const supportingExperts = this.resolveSupportingExperts(
      composition,
      blockedExpertIds,
    );
    const decisionReasons = this.buildDecisionReasons({
      input,
      composition,
      persona,
      evidences,
      blockedExpertIds,
    });
    const recommendationReasons = this.buildRecommendationReasons({
      composition,
      evidences,
      blockedExpertIds,
    });
    const riskExplanations = this.buildRiskExplanations({
      composition,
      evidences,
      blockedExpertIds,
    });
    const conflictExplanations = this.buildConflictExplanations(
      composition,
      blockedExpertIds,
    );
    const confidenceExplanation = this.buildConfidenceExplanation({
      input,
      evidences,
      missingEvidence,
      blockedExpertIds,
      recommendationReasons,
      riskExplanations,
      conflictExplanations,
    });

    const primaryExpertId = this.resolvePrimaryExpertId(
      composition,
      blockedExpertIds,
    );

    return Object.freeze({
      primaryExpertId,
      participatingExperts: Object.freeze(participatingExperts),
      supportingExperts: Object.freeze(supportingExperts),
      evidence: Object.freeze(evidences),
      decisionReasons: Object.freeze(decisionReasons),
      recommendationReasons: Object.freeze(recommendationReasons),
      riskExplanations: Object.freeze(riskExplanations),
      confidenceExplanation,
      conflictExplanations: Object.freeze(conflictExplanations),
      missingEvidence: Object.freeze(missingEvidence),
      metadata: this.buildMetadata({
        input,
        composition,
        persona,
        evidences,
        decisionReasons,
        recommendationReasons,
        riskExplanations,
        conflictExplanations,
        missingEvidence,
        blockedExpertIds,
      }),
      summary: this.buildSummary({
        composition,
        evidences,
        decisionReasons,
        recommendationReasons,
        riskExplanations,
        conflictExplanations,
        missingEvidence,
      }),
    });
  }

  private buildEvidence(
    input: CoachExplainabilityEngineInput,
    blockedExpertIds: ReadonlySet<string>,
  ): readonly CoachEvidence[] {
    const composition = input.unifiedCoachIntelligence;
    const evidences: CoachEvidence[] = [];

    const recentWorkoutLogs = input.healthContext.recentWorkoutLogs;
    evidences.push(
      this.createEvidence({
        type: 'WORKOUT_HISTORY',
        source: 'HEALTH_CONTEXT',
        importance: recentWorkoutLogs.length > 0 ? 'HIGH' : 'LOW',
        confidence: recentWorkoutLogs.length > 0 ? 'HIGH' : 'UNKNOWN',
        availability: recentWorkoutLogs.length > 0 ? 'AVAILABLE' : 'MISSING',
        metadata: {
          workoutLogCount: recentWorkoutLogs.length,
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'WORKOUT_COMPLETION',
        source: 'HEALTH_CONTEXT',
        importance: recentWorkoutLogs.length > 0 ? 'MEDIUM' : 'LOW',
        confidence: recentWorkoutLogs.length > 0 ? 'HIGH' : 'UNKNOWN',
        availability: recentWorkoutLogs.length > 0 ? 'AVAILABLE' : 'MISSING',
        metadata: {
          recentWorkoutDate:
            recentWorkoutLogs[0]?.date ??
            input.healthContext.todayWorkout?.dayIndex,
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'RECOVERY_CHECK_IN',
        source: 'HEALTH_CONTEXT',
        importance: input.healthContext.latestCheckIn ? 'HIGH' : 'MEDIUM',
        confidence: input.healthContext.latestCheckIn ? 'HIGH' : 'UNKNOWN',
        availability: input.healthContext.latestCheckIn
          ? 'AVAILABLE'
          : 'MISSING',
        metadata: {
          hasCheckIn: Boolean(input.healthContext.latestCheckIn),
          recoveryTrend: input.healthContext.recoveryTrend ?? 'unknown',
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'RECOVERY_SNAPSHOT',
        source: 'HEALTH_CONTEXT',
        importance: input.healthContext.recoverySnapshot ? 'HIGH' : 'MEDIUM',
        confidence: input.healthContext.recoverySnapshot ? 'HIGH' : 'UNKNOWN',
        availability: input.healthContext.recoverySnapshot
          ? 'AVAILABLE'
          : 'MISSING',
        metadata: {
          hasRecoverySnapshot: Boolean(input.healthContext.recoverySnapshot),
          readinessScore: input.healthContext.readinessScore,
          fatigueScore: input.healthContext.fatigueScore,
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'GOAL_PROGRESS',
        source: 'HEALTH_CONTEXT',
        importance:
          input.healthContext.currentStreak > 0 ||
          input.healthContext.adherenceScore > 0
            ? 'MEDIUM'
            : 'LOW',
        confidence:
          input.healthContext.currentStreak > 0 ||
          input.healthContext.adherenceScore > 0
            ? 'HIGH'
            : 'UNKNOWN',
        availability:
          input.healthContext.currentStreak > 0 ||
          input.healthContext.adherenceScore > 0
            ? 'AVAILABLE'
            : 'PARTIAL',
        metadata: {
          currentStreak: input.healthContext.currentStreak,
          adherenceScore: input.healthContext.adherenceScore,
          weeklyFrequency: input.healthContext.weeklyFrequency,
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'HABIT_STREAK',
        source: 'HEALTH_CONTEXT',
        importance: input.healthContext.currentStreak >= 5 ? 'HIGH' : 'MEDIUM',
        confidence: input.healthContext.currentStreak > 0 ? 'HIGH' : 'UNKNOWN',
        availability:
          input.healthContext.currentStreak > 0 ? 'AVAILABLE' : 'MISSING',
        metadata: {
          currentStreak: input.healthContext.currentStreak,
          adherenceScore: input.healthContext.adherenceScore,
        },
      }),
    );

    evidences.push(
      this.createEvidence({
        type: 'WEEKLY_PROGRESS',
        source: 'HEALTH_CONTEXT',
        importance:
          input.healthContext.recentWorkoutLogs.length > 0 ||
          Boolean(input.healthContext.weeklyFrequency)
            ? 'MEDIUM'
            : 'LOW',
        confidence:
          input.healthContext.recentWorkoutLogs.length > 0 ||
          Boolean(input.healthContext.weeklyFrequency)
            ? 'HIGH'
            : 'UNKNOWN',
        availability:
          input.healthContext.recentWorkoutLogs.length > 0 ||
          Boolean(input.healthContext.weeklyFrequency)
            ? 'AVAILABLE'
            : 'PARTIAL',
        metadata: {
          weeklyFrequency: input.healthContext.weeklyFrequency,
          recentWorkoutCount: input.healthContext.recentWorkoutLogs.length,
        },
      }),
    );

    if (input.personalization) {
      evidences.push(
        this.createEvidence({
          type: 'PERSONALIZATION_SIGNAL',
          source: 'PERSONALIZATION',
          importance: 'MEDIUM',
          confidence: 'HIGH',
          availability: 'AVAILABLE',
          metadata: {
            preferredCoachingStyle:
              input.personalization.preferredCoachingStyle ?? 'unavailable',
            engagementProfile:
              input.personalization.engagementProfile ?? 'unavailable',
            riskOfDisengagement:
              input.personalization.riskOfDisengagement ?? 'unavailable',
          },
        }),
      );
    }

    evidences.push(
      this.createEvidence({
        type: 'RUNTIME_COMPLETENESS',
        source: 'RUNTIME',
        importance: 'LOW',
        confidence: 'HIGH',
        availability: input.runtimeMetadata.responseMode
          ? 'AVAILABLE'
          : 'PARTIAL',
        metadata: {
          responseMode: input.runtimeMetadata.responseMode ?? 'unknown',
          stepCount: input.runtimeMetadata.stepCount ?? 0,
          planningDurationMs: input.runtimeMetadata.planningDurationMs ?? 0,
          orchestrationDurationMs:
            input.runtimeMetadata.orchestrationDurationMs ?? 0,
          expertExecutionDurationMs:
            input.runtimeMetadata.expertExecutionDurationMs ?? 0,
        },
      }),
    );

    if (composition) {
      const participatingExpertIds = this.resolveParticipatingExperts(
        composition,
        blockedExpertIds,
      );

      for (const expert of composition.participatingExperts) {
        if (blockedExpertIds.has(expert.expertId)) {
          continue;
        }

        evidences.push(
          this.createEvidence({
            type: 'EXPERT_CONTRIBUTION',
            source: 'EXPERT',
            expert: expert.expertId,
            importance: this.resolveImportanceFromRole(expert.role),
            confidence: expert.confidence,
            availability: 'AVAILABLE',
            metadata: {
              expertName: expert.expertName,
              role: expert.role,
              sequence: expert.sequence,
              recommendationCodes: [...expert.recommendationCodes],
              keyFindings: [...expert.keyFindings],
              participatingExpertIds,
            },
          }),
        );
      }

      for (const finding of composition.keyFindings) {
        evidences.push(
          this.createEvidence({
            type: this.resolveEvidenceTypeFromFinding(finding),
            source: 'COMPOSITION',
            expert: composition.primaryExpert?.id,
            importance: this.resolveImportanceFromFinding(finding),
            confidence: this.resolveConfidenceFromRiskLevel(
              composition.risks[0]?.level,
            ),
            availability: 'AVAILABLE',
            metadata: {
              finding,
            },
          }),
        );
      }

      for (const risk of composition.risks) {
        evidences.push(
          this.createEvidence({
            type: 'SAFETY_RISK',
            source: 'COMPOSITION',
            expert: composition.primaryExpert?.id,
            importance: this.resolveImportanceFromRiskLevel(risk.level),
            confidence: this.resolveConfidenceFromRiskLevel(risk.level),
            availability: 'AVAILABLE',
            metadata: {
              riskLevel: risk.level,
              factors: [...risk.factors],
              sources: [...risk.sources],
            },
          }),
        );
      }

      if (composition.conflicts.length > 0) {
        evidences.push(
          this.createEvidence({
            type: 'CONFLICTING_GUIDANCE',
            source: 'COMPOSITION',
            expert: composition.primaryExpert?.id,
            importance: 'HIGH',
            confidence: 'HIGH',
            availability: 'AVAILABLE',
            metadata: {
              conflictCount: composition.conflicts.length,
            },
          }),
        );
      }
    }

    const policyEvaluation = input.safetyDecisions.policyEvaluation;
    if (policyEvaluation.decision.blocked) {
      evidences.push(
        this.createEvidence({
          type: 'POLICY_RESTRICTION',
          source: 'POLICY',
          importance: 'CRITICAL',
          confidence: 'HIGH',
          availability: 'AVAILABLE',
          metadata: {
            policyBlocked: true,
            fallbackRequired: policyEvaluation.decision.fallbackRequired,
          },
        }),
      );
    }

    return Object.freeze(evidences);
  }

  private buildDecisionReasons(input: {
    input: CoachExplainabilityEngineInput;
    composition?: CoachExpertCompositionResult;
    persona?: CoachPersonaGuidance;
    evidences: readonly CoachEvidence[];
    blockedExpertIds: ReadonlySet<string>;
  }): CoachDecisionReason[] {
    const reasons: CoachDecisionReason[] = [];
    const composition = input.composition;
    const persona = input.persona;
    const focusEvidence = this.collectEvidenceForFocus(input.evidences);

    if (
      persona?.safetyLevel === 'STRICT' ||
      input.input.safetyDecisions.policyEvaluation.decision.blocked
    ) {
      reasons.push(
        this.createDecisionReason({
          code: 'SAFETY_PRIORITY',
          decisionType: 'SAFETY_LEVEL',
          supportingEvidence: this.pickEvidence(input.evidences, [
            'POLICY_RESTRICTION',
            'SAFETY_RISK',
            'RECOVERY_CHECK_IN',
          ]),
          supportingExperts: this.collectExperts(input.evidences),
          priority: 'CRITICAL',
          reasonCategory: 'SAFETY',
          metadata: {
            policyBlocked:
              input.input.safetyDecisions.policyEvaluation.decision.blocked,
          },
        }),
      );
    }

    if (persona?.focus && focusEvidence.length > 0) {
      reasons.push(
        this.createDecisionReason({
          code: `FOCUS_${persona.focus}`,
          decisionType: 'FOCUS',
          supportingEvidence: focusEvidence,
          supportingExperts: this.collectExperts(focusEvidence),
          priority: persona.safetyLevel === 'STRICT' ? 'HIGH' : 'MEDIUM',
          reasonCategory: this.mapFocusToCategory(persona.focus),
          metadata: {
            focus: persona.focus,
          },
        }),
      );
    }

    if (persona?.tone) {
      reasons.push(
        this.createDecisionReason({
          code: `TONE_${persona.tone}`,
          decisionType: 'TONE',
          supportingEvidence: this.pickEvidence(input.evidences, [
            'RECENT_MILESTONE',
            'PLATEAU_SIGNAL',
            'RECOVERY_CHECK_IN',
            'SAFETY_RISK',
            'PERSONALIZATION_SIGNAL',
          ]),
          supportingExperts: this.collectExperts(input.evidences),
          priority: this.resolvePriorityFromTone(persona.tone),
          reasonCategory: this.mapFocusToCategory(persona.focus),
          metadata: {
            tone: persona.tone,
          },
        }),
      );
    }

    if (persona?.verbosity) {
      reasons.push(
        this.createDecisionReason({
          code: `VERBOSITY_${persona.verbosity}`,
          decisionType: 'VERBOSITY',
          supportingEvidence: this.pickEvidence(input.evidences, [
            'RUNTIME_COMPLETENESS',
            'CONFLICTING_GUIDANCE',
            'EXPERT_CONTRIBUTION',
          ]),
          supportingExperts: this.collectExperts(input.evidences),
          priority: persona.verbosity === 'DETAILED' ? 'MEDIUM' : 'LOW',
          reasonCategory: 'PROGRESS',
          metadata: {
            verbosity: persona.verbosity,
          },
        }),
      );
    }

    if (composition?.conflicts.length) {
      reasons.push(
        this.createDecisionReason({
          code: 'CONFLICTING_EXPERTS',
          decisionType: 'DIRECTIVE_LEVEL',
          supportingEvidence: this.pickEvidence(input.evidences, [
            'CONFLICTING_GUIDANCE',
            'EXPERT_CONTRIBUTION',
          ]),
          supportingExperts: this.collectExperts(input.evidences),
          priority: 'HIGH',
          reasonCategory: 'SAFETY',
          metadata: {
            conflictCount: composition.conflicts.length,
          },
        }),
      );
    }

    return reasons;
  }

  private buildRecommendationReasons(input: {
    composition?: CoachExpertCompositionResult;
    evidences: readonly CoachEvidence[];
    blockedExpertIds: ReadonlySet<string>;
  }): CoachRecommendationReason[] {
    if (!input.composition) {
      return [];
    }

    const reasons: CoachRecommendationReason[] = [];
    for (const recommendation of input.composition.recommendations) {
      const supportingExperts = recommendation.sourceExperts.filter(
        (expertId) => !input.blockedExpertIds.has(expertId),
      );

      if (supportingExperts.length === 0) {
        continue;
      }

      const supportingEvidence = this.pickEvidenceForRecommendation(
        recommendation.code,
        input.evidences,
      );

      reasons.push(
        this.createRecommendationReason({
          recommendationCode: recommendation.code,
          supportingEvidence,
          supportingExperts,
          priority: recommendation.priority,
          reasonCategory: this.mapRecommendationCategory(recommendation),
          metadata: {
            category: recommendation.category,
            sourceExperts: [...recommendation.sourceExperts],
          },
        }),
      );
    }

    return reasons;
  }

  private buildRiskExplanations(input: {
    composition?: CoachExpertCompositionResult;
    evidences: readonly CoachEvidence[];
    blockedExpertIds: ReadonlySet<string>;
  }): CoachRiskExplanation[] {
    if (!input.composition) {
      return [];
    }

    return input.composition.risks.map((risk) => {
      const supportingEvidence = this.pickEvidenceForRisk(
        risk.level,
        input.evidences,
      );
      const supportingExperts = risk.sources.filter(
        (expertId) => !input.blockedExpertIds.has(expertId),
      );

      return this.createRiskExplanation({
        riskLevel: risk.level,
        supportingEvidence,
        supportingExperts,
        severity: this.resolveSeverityFromRiskLevel(risk.level),
        metadata: {
          factors: [...risk.factors],
          sources: [...risk.sources],
        },
      });
    });
  }

  private buildConflictExplanations(
    composition: CoachExpertCompositionResult | undefined,
    blockedExpertIds: ReadonlySet<string>,
  ): CoachConflictExplanation[] {
    if (!composition) {
      return [];
    }

    return composition.conflicts.map((conflict) => {
      const experts = conflict.experts.filter(
        (expertId) => !blockedExpertIds.has(expertId),
      );

      return this.createConflictExplanation({
        conflictType: conflict.type,
        experts,
        resolution: conflict.resolution,
        resolvedBy: conflict.resolution.strategy,
        severity: conflict.severity,
        metadata: {
          sourceMetadata: conflict.metadata,
        },
      });
    });
  }

  private buildMissingEvidence(
    input: CoachExplainabilityEngineInput,
    blockedExpertIds: ReadonlySet<string>,
  ): CoachMissingEvidence[] {
    const missingEvidence: CoachMissingEvidence[] = [];

    if (!input.healthContext.latestCheckIn) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'RECOVERY_CHECK_IN_MISSING',
          source: 'HEALTH_CONTEXT',
          availability: 'MISSING',
          metadata: {
            selectedDomains: [...input.selectedDomains],
          },
        }),
      );
    }

    if (input.healthContext.recentWorkoutLogs.length === 0) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'WORKOUT_HISTORY_MISSING',
          source: 'HEALTH_CONTEXT',
          availability: 'MISSING',
          metadata: {
            selectedDomains: [...input.selectedDomains],
          },
        }),
      );
    }

    if (!input.healthContext.nutritionContext) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'NUTRITION_PROFILE_MISSING',
          source: 'HEALTH_CONTEXT',
          availability: 'MISSING',
          metadata: {
            selectedDomains: [...input.selectedDomains],
          },
        }),
      );
    }

    if (!input.healthContext.goal) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'GOAL_HISTORY_MISSING',
          source: 'HEALTH_CONTEXT',
          availability: 'MISSING',
          metadata: {
            selectedDomains: [...input.selectedDomains],
          },
        }),
      );
    }

    if (
      input.selectedDomains.includes('progress') &&
      input.healthContext.recentWorkoutLogs.length < 2
    ) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'PROGRESS_HISTORY_INCOMPLETE',
          source: 'RUNTIME',
          availability: 'PARTIAL',
          metadata: {
            selectedDomains: [...input.selectedDomains],
          },
        }),
      );
    }

    if (blockedExpertIds.size > 0) {
      missingEvidence.push(
        this.createMissingEvidence({
          type: 'POLICY_RESTRICTION_PRESENT',
          source: 'POLICY',
          availability: 'PARTIAL',
          metadata: {
            blockedExpertCount: blockedExpertIds.size,
          },
        }),
      );
    }

    return missingEvidence;
  }

  private buildConfidenceExplanation(input: {
    input: CoachExplainabilityEngineInput;
    evidences: readonly CoachEvidence[];
    missingEvidence: readonly CoachMissingEvidence[];
    blockedExpertIds: ReadonlySet<string>;
    recommendationReasons: readonly CoachRecommendationReason[];
    riskExplanations: readonly CoachRiskExplanation[];
    conflictExplanations: readonly CoachConflictExplanation[];
  }): CoachConfidenceExplanation {
    const policyRestrictions = this.resolvePolicyRestrictions(input);
    const uniqueExperts = new Set([
      ...this.collectExperts(input.evidences),
      ...input.recommendationReasons.flatMap(
        (reason) => reason.supportingExperts,
      ),
      ...input.riskExplanations.flatMap((risk) => risk.supportingExperts),
      ...input.conflictExplanations.flatMap((conflict) => conflict.experts),
    ]);

    const confidence =
      input.evidences.length >= 8 &&
      input.missingEvidence.length === 0 &&
      policyRestrictions.length === 0
        ? 'HIGH'
        : input.evidences.length >= 4 && input.missingEvidence.length <= 2
          ? 'MEDIUM'
          : 'LOW';

    return Object.freeze({
      confidence,
      supportingEvidenceCount: input.evidences.length,
      supportingExpertCount: uniqueExperts.size,
      missingEvidenceCount: input.missingEvidence.length,
      policyRestrictions: Object.freeze(policyRestrictions),
      metadata: Object.freeze({
        evidenceTypes: [
          ...new Set(input.evidences.map((evidence) => evidence.type)),
        ],
        runtimeResponseMode:
          input.input.runtimeMetadata.responseMode ?? 'unknown',
      }),
    });
  }

  private buildMetadata(input: {
    input: CoachExplainabilityEngineInput;
    composition?: CoachExpertCompositionResult;
    persona?: CoachPersonaGuidance;
    evidences: readonly CoachEvidence[];
    decisionReasons: readonly CoachDecisionReason[];
    recommendationReasons: readonly CoachRecommendationReason[];
    riskExplanations: readonly CoachRiskExplanation[];
    conflictExplanations: readonly CoachConflictExplanation[];
    missingEvidence: readonly CoachMissingEvidence[];
    blockedExpertIds: ReadonlySet<string>;
  }): CoachExplainabilityMetadata {
    const composition = input.composition;
    const persona = input.persona;
    const blockedRecommendationCount = this.countBlockedRecommendations(
      composition,
      input.blockedExpertIds,
    );

    return Object.freeze({
      requestId: input.input.requestId,
      intent: input.input.intent,
      selectedDomains: Object.freeze([...input.input.selectedDomains]),
      primaryExpertId: this.resolvePrimaryExpertId(
        composition,
        input.blockedExpertIds,
      ),
      participatingExpertIds: Object.freeze(
        this.resolveParticipatingExperts(composition, input.blockedExpertIds),
      ),
      supportingExpertIds: Object.freeze(
        this.resolveSupportingExperts(composition, input.blockedExpertIds),
      ),
      routeConfidence: composition?.metadata.routeConfidence ?? 'UNKNOWN',
      policyApproved:
        input.input.safetyDecisions.policyEvaluation.decision.approved,
      policyBlocked:
        input.input.safetyDecisions.policyEvaluation.decision.blocked,
      policyFallbackRequired:
        input.input.safetyDecisions.policyEvaluation.decision.fallbackRequired,
      runtimeCompleteness: composition?.metadata.runtimeCompleteness ?? 'EMPTY',
      evidenceCount: input.evidences.length,
      explanationCount:
        input.decisionReasons.length +
        input.recommendationReasons.length +
        input.riskExplanations.length +
        input.conflictExplanations.length,
      recommendationCount: input.recommendationReasons.length,
      riskCount: input.riskExplanations.length,
      conflictCount: input.conflictExplanations.length,
      missingEvidenceCount: input.missingEvidence.length,
      blockedExpertCount: input.blockedExpertIds.size,
      blockedRecommendationCount,
      personaTone: persona?.tone ?? 'UNKNOWN',
      personaFocus: persona?.focus ?? 'UNKNOWN',
      personaSafetyLevel: persona?.safetyLevel ?? 'UNKNOWN',
      personaUrgency: persona?.urgency ?? 'UNKNOWN',
      explanationVersion: EXPLANATION_VERSION,
    });
  }

  private buildSummary(input: {
    composition: CoachExpertCompositionResult | undefined;
    evidences: readonly CoachEvidence[];
    decisionReasons: readonly CoachDecisionReason[];
    recommendationReasons: readonly CoachRecommendationReason[];
    riskExplanations: readonly CoachRiskExplanation[];
    conflictExplanations: readonly CoachConflictExplanation[];
    missingEvidence: readonly CoachMissingEvidence[];
  }): string {
    const recommendationCount = input.composition?.recommendations.length ?? 0;
    const riskCount = input.riskExplanations.length;
    const conflictCount = input.conflictExplanations.length;
    const missingEvidenceCount = input.missingEvidence.length;

    return [
      `evidence=${input.evidences.length}`,
      `decisions=${input.decisionReasons.length}`,
      `recommendations=${recommendationCount}`,
      `risks=${riskCount}`,
      `conflicts=${conflictCount}`,
      `missing=${missingEvidenceCount}`,
    ].join(';');
  }

  private resolveBlockedExpertIds(
    input: CoachExplainabilityEngineInput,
  ): ReadonlySet<string> {
    const blockedExpertIds = new Set<string>();
    const composition = input.unifiedCoachIntelligence;

    for (const expertId of composition?.metadata.blockedExpertIds ?? []) {
      blockedExpertIds.add(expertId);
    }

    for (const expertId of input.safetyDecisions.policyEvaluation.decision
      .metadata.blockedExpertIds ?? []) {
      blockedExpertIds.add(expertId);
    }

    return blockedExpertIds;
  }

  private resolveParticipatingExperts(
    composition: CoachExpertCompositionResult | undefined,
    blockedExpertIds: ReadonlySet<string>,
  ): readonly string[] {
    if (!composition) {
      return [];
    }

    return composition.participatingExperts
      .map((expert) => expert.expertId)
      .filter((expertId) => !blockedExpertIds.has(expertId));
  }

  private resolveSupportingExperts(
    composition: CoachExpertCompositionResult | undefined,
    blockedExpertIds: ReadonlySet<string>,
  ): readonly string[] {
    if (!composition) {
      return [];
    }

    return composition.supportingExperts
      .map((expert) => expert.expertId)
      .filter((expertId) => !blockedExpertIds.has(expertId));
  }

  private resolvePrimaryExpertId(
    composition: CoachExpertCompositionResult | undefined,
    blockedExpertIds: ReadonlySet<string>,
  ): string | undefined {
    const primaryExpertId = composition?.primaryExpert?.id;
    if (!primaryExpertId || blockedExpertIds.has(primaryExpertId)) {
      return undefined;
    }

    return primaryExpertId;
  }

  private resolvePolicyRestrictions(input: {
    input: CoachExplainabilityEngineInput;
    blockedExpertIds: ReadonlySet<string>;
  }): readonly string[] {
    const restrictions = [
      input.input.safetyDecisions.policyEvaluation.decision.blocked
        ? 'POLICY_BLOCKED'
        : null,
      input.blockedExpertIds.size > 0 ? 'EXPERTS_FILTERED' : null,
      input.input.unifiedCoachIntelligence?.recommendations.length &&
      this.countBlockedRecommendations(
        input.input.unifiedCoachIntelligence,
        input.blockedExpertIds,
      ) > 0
        ? 'RECOMMENDATIONS_FILTERED'
        : null,
      input.input.unifiedCoachIntelligence?.metadata.runtimeCompleteness !==
      'FULL'
        ? 'RUNTIME_INCOMPLETE'
        : null,
    ].filter((restriction): restriction is string => Boolean(restriction));

    return Object.freeze([...new Set(restrictions)]);
  }

  private countBlockedRecommendations(
    composition: CoachExpertCompositionResult | undefined,
    blockedExpertIds: ReadonlySet<string>,
  ): number {
    if (!composition) {
      return 0;
    }

    return composition.recommendations.filter((recommendation) =>
      recommendation.sourceExperts.some((expertId) =>
        blockedExpertIds.has(expertId),
      ),
    ).length;
  }

  private collectExperts(
    evidences: readonly CoachEvidence[],
  ): readonly string[] {
    return [
      ...new Set(
        evidences.flatMap((evidence) =>
          evidence.expert ? [evidence.expert] : [],
        ),
      ),
    ];
  }

  private createEvidence(input: {
    type: CoachEvidence['type'];
    source: CoachEvidence['source'];
    expert?: string;
    importance: CoachEvidenceImportance;
    confidence: CoachEvidence['confidence'];
    availability: CoachEvidenceAvailability;
    metadata: Readonly<Record<string, unknown>>;
  }): CoachEvidence {
    return Object.freeze({
      type: input.type,
      source: input.source,
      expert: input.expert,
      importance: input.importance,
      confidence: input.confidence,
      availability: input.availability,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private createDecisionReason(input: {
    code: string;
    decisionType: CoachDecisionReason['decisionType'];
    supportingEvidence: readonly CoachEvidence[];
    supportingExperts: readonly string[];
    priority: CoachDecisionReason['priority'];
    reasonCategory: CoachDecisionReason['reasonCategory'];
    metadata: Readonly<Record<string, unknown>>;
  }): CoachDecisionReason {
    return Object.freeze({
      code: input.code,
      decisionType: input.decisionType,
      supportingEvidence: Object.freeze([...input.supportingEvidence]),
      supportingExperts: Object.freeze([...new Set(input.supportingExperts)]),
      priority: input.priority,
      reasonCategory: input.reasonCategory,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private createRecommendationReason(input: {
    recommendationCode: string;
    supportingEvidence: readonly CoachEvidence[];
    supportingExperts: readonly string[];
    priority: CoachRecommendationReason['priority'];
    reasonCategory: CoachRecommendationReason['reasonCategory'];
    metadata: Readonly<Record<string, unknown>>;
  }): CoachRecommendationReason {
    return Object.freeze({
      recommendationCode: input.recommendationCode,
      supportingEvidence: Object.freeze([...input.supportingEvidence]),
      supportingExperts: Object.freeze([...new Set(input.supportingExperts)]),
      priority: input.priority,
      reasonCategory: input.reasonCategory,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private createRiskExplanation(input: {
    riskLevel: CoachRiskExplanation['riskLevel'];
    supportingEvidence: readonly CoachEvidence[];
    supportingExperts: readonly string[];
    severity: CoachRiskExplanation['severity'];
    metadata: Readonly<Record<string, unknown>>;
  }): CoachRiskExplanation {
    return Object.freeze({
      riskLevel: input.riskLevel,
      supportingEvidence: Object.freeze([...input.supportingEvidence]),
      supportingExperts: Object.freeze([...new Set(input.supportingExperts)]),
      severity: input.severity,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private createConflictExplanation(input: {
    conflictType: string;
    experts: readonly string[];
    resolution: CoachConflictExplanation['resolution'];
    resolvedBy: string;
    severity: CoachConflictExplanation['severity'];
    metadata: Readonly<Record<string, unknown>>;
  }): CoachConflictExplanation {
    return Object.freeze({
      conflictType: input.conflictType,
      experts: Object.freeze([...new Set(input.experts)]),
      resolution: Object.freeze({
        strategy: input.resolution.strategy,
        winnerExpertId: input.resolution.winnerExpertId,
        winnerRecommendationCode: input.resolution.winnerRecommendationCode,
        metadata: Object.freeze({ ...input.resolution.metadata }),
      }),
      resolvedBy: input.resolvedBy,
      severity: input.severity,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private createMissingEvidence(input: {
    type: string;
    source: CoachMissingEvidence['source'];
    availability: CoachMissingEvidence['availability'];
    metadata: Readonly<Record<string, unknown>>;
  }): CoachMissingEvidence {
    return Object.freeze({
      type: input.type,
      source: input.source,
      availability: input.availability,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  private mapRecommendationCategory(
    recommendation: CoachExpertCompositionResult['recommendations'][number],
  ): CoachRecommendationReason['reasonCategory'] {
    const code = recommendation.code.toUpperCase();
    const sourceExpertIds = recommendation.sourceExperts.map((expertId) =>
      expertId.toUpperCase(),
    );

    if (
      sourceExpertIds.some((expertId) => expertId.includes('WORKOUT')) ||
      code.includes('WORKOUT') ||
      code.includes('TRAIN') ||
      code.includes('LOAD') ||
      code.includes('VOLUME')
    ) {
      return 'WORKOUT';
    }

    if (
      code.includes('SAFETY') ||
      code.includes('REST') ||
      code.includes('PAUSE') ||
      code.includes('RECOVERY')
    ) {
      return 'SAFETY';
    }

    if (
      sourceExpertIds.some((expertId) => expertId.includes('RECOVERY')) ||
      code.includes('RECOVERY') ||
      code.includes('REST') ||
      code.includes('PAUSE')
    ) {
      return 'RECOVERY';
    }

    if (
      sourceExpertIds.some((expertId) => expertId.includes('NUTRITION')) ||
      code.includes('NUTRITION') ||
      code.includes('CALORIE') ||
      code.includes('PROTEIN') ||
      code.includes('MEAL')
    ) {
      return 'NUTRITION';
    }

    if (
      sourceExpertIds.some((expertId) => expertId.includes('GOAL')) ||
      code.includes('GOAL') ||
      code.includes('MILESTONE') ||
      code.includes('TARGET')
    ) {
      return 'GOALS';
    }

    if (
      sourceExpertIds.some((expertId) => expertId.includes('HABIT')) ||
      code.includes('HABIT') ||
      code.includes('STREAK') ||
      code.includes('CONSIST')
    ) {
      return 'CONSISTENCY';
    }

    if (
      sourceExpertIds.some((expertId) => expertId.includes('PROGRESS')) ||
      code.includes('PROGRESS') ||
      code.includes('PLATEAU') ||
      code.includes('STALL')
    ) {
      return 'PROGRESS';
    }

    return 'PROGRESS';
  }

  private mapFocusToCategory(
    focus: CoachPersonaGuidance['focus'],
  ): CoachDecisionReason['reasonCategory'] {
    switch (focus) {
      case 'WORKOUT':
        return 'WORKOUT';
      case 'RECOVERY':
        return 'RECOVERY';
      case 'NUTRITION':
        return 'NUTRITION';
      case 'GOALS':
        return 'GOALS';
      case 'CONSISTENCY':
        return 'CONSISTENCY';
      case 'PROGRESS':
        return 'PROGRESS';
      case 'MOTIVATION':
        return 'PROGRESS';
      case 'SAFETY':
        return 'SAFETY';
      default:
        return 'PROGRESS';
    }
  }

  private resolveEvidenceTypeFromFinding(
    finding: string,
  ): CoachEvidence['type'] {
    const normalized = finding.toUpperCase();

    if (
      normalized.includes('RECENT_MILESTONE') ||
      normalized.includes('MILESTONE')
    ) {
      return 'RECENT_MILESTONE';
    }

    if (
      normalized.includes('PLATEAU') ||
      normalized.includes('STALL') ||
      normalized.includes('REGRESSION')
    ) {
      return 'PLATEAU_SIGNAL';
    }

    if (
      normalized.includes('RECOVERY') ||
      normalized.includes('INJURY') ||
      normalized.includes('LOW_RECOVERY')
    ) {
      return 'SAFETY_RISK';
    }

    if (normalized.includes('NUTRITION')) {
      return 'NUTRITION_PROFILE';
    }

    if (normalized.includes('HABIT') || normalized.includes('CONSIST')) {
      return 'HABIT_STREAK';
    }

    if (normalized.includes('WORKOUT') || normalized.includes('TRAINING')) {
      return 'WORKOUT_HISTORY';
    }

    return 'EXPERT_CONTRIBUTION';
  }

  private resolveImportanceFromFinding(
    finding: string,
  ): CoachEvidenceImportance {
    const normalized = finding.toUpperCase();

    if (
      normalized.includes('RECENT_MILESTONE') ||
      normalized.includes('CRITICAL') ||
      normalized.includes('HIGH_RECOVERY_RISK') ||
      normalized.includes('LOW_RECOVERY')
    ) {
      return 'CRITICAL';
    }

    if (
      normalized.includes('PLATEAU') ||
      normalized.includes('STALL') ||
      normalized.includes('NUTRITION') ||
      normalized.includes('WORKOUT')
    ) {
      return 'HIGH';
    }

    if (normalized.includes('HABIT') || normalized.includes('CONSIST')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveImportanceFromRole(
    role: CoachExpertCompositionResult['participatingExperts'][number]['role'],
  ): CoachEvidenceImportance {
    switch (role) {
      case 'PRIMARY':
        return 'HIGH';
      case 'COMPLEMENTARY':
        return 'MEDIUM';
      case 'DEPENDENCY':
        return 'LOW';
      default:
        return 'LOW';
    }
  }

  private resolveImportanceFromRiskLevel(
    riskLevel: CoachRiskExplanation['riskLevel'],
  ): CoachEvidenceImportance {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'LOW';
    }
  }

  private resolveConfidenceFromRiskLevel(
    riskLevel: CoachRiskExplanation['riskLevel'] | undefined,
  ): CoachEvidence['confidence'] {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'UNKNOWN';
    }
  }

  private resolveSeverityFromRiskLevel(
    riskLevel: CoachRiskExplanation['riskLevel'],
  ): CoachRiskExplanation['severity'] {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
      case 'MEDIUM':
      case 'LOW':
        return riskLevel;
      default:
        return 'LOW';
    }
  }

  private resolvePriorityFromTone(
    tone: CoachPersonaGuidance['tone'],
  ): CoachDecisionReason['priority'] {
    switch (tone) {
      case 'CAUTIOUS':
        return 'HIGH';
      case 'CELEBRATORY':
        return 'MEDIUM';
      case 'ANALYTICAL':
        return 'MEDIUM';
      case 'DIRECT':
        return 'MEDIUM';
      case 'CALM':
      case 'SUPPORTIVE':
      default:
        return 'LOW';
    }
  }

  private pickEvidenceForRecommendation(
    recommendationCode: string,
    evidences: readonly CoachEvidence[],
  ): readonly CoachEvidence[] {
    return this.pickEvidence(evidences, [
      ...this.resolveRecommendationEvidenceTypes(recommendationCode),
      'EXPERT_CONTRIBUTION',
    ]);
  }

  private resolveRecommendationEvidenceTypes(
    recommendationCode: string,
  ): readonly CoachEvidence['type'][] {
    const code = recommendationCode.toUpperCase();
    const types: CoachEvidence['type'][] = [];

    if (
      code.includes('RECOVERY') ||
      code.includes('REST') ||
      code.includes('PAUSE')
    ) {
      types.push('RECOVERY_CHECK_IN', 'RECOVERY_SNAPSHOT', 'SAFETY_RISK');
    }

    if (
      code.includes('NUTRITION') ||
      code.includes('CALORIE') ||
      code.includes('PROTEIN') ||
      code.includes('MEAL') ||
      code.includes('HYDRATION')
    ) {
      types.push('NUTRITION_PROFILE');
    }

    if (
      code.includes('WORKOUT') ||
      code.includes('LOAD') ||
      code.includes('VOLUME') ||
      code.includes('TRAIN')
    ) {
      types.push('WORKOUT_HISTORY', 'WORKOUT_COMPLETION', 'WEEKLY_PROGRESS');
    }

    if (
      code.includes('GOAL') ||
      code.includes('MILESTONE') ||
      code.includes('TARGET')
    ) {
      types.push('GOAL_PROGRESS', 'RECENT_MILESTONE');
    }

    if (
      code.includes('HABIT') ||
      code.includes('STREAK') ||
      code.includes('CONSIST')
    ) {
      types.push('HABIT_STREAK', 'WEEKLY_PROGRESS');
    }

    if (types.length === 0) {
      types.push('WORKOUT_HISTORY', 'GOAL_PROGRESS');
    }

    return types;
  }

  private pickEvidenceForFinding(
    finding: string,
    evidences: readonly CoachEvidence[],
  ): readonly CoachEvidence[] {
    return this.pickEvidence(evidences, [
      this.resolveEvidenceTypeFromFinding(finding),
    ]);
  }

  private pickEvidenceForRisk(
    riskLevel: string,
    evidences: readonly CoachEvidence[],
  ): readonly CoachEvidence[] {
    const types: CoachEvidence['type'][] = [
      'SAFETY_RISK',
      'CONFLICTING_GUIDANCE',
    ];

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      types.push('RECOVERY_CHECK_IN', 'RECOVERY_SNAPSHOT');
    }

    if (riskLevel === 'MEDIUM') {
      types.push('WEEKLY_PROGRESS', 'HABIT_STREAK');
    }

    return this.pickEvidence(evidences, types);
  }

  private pickEvidence(
    evidences: readonly CoachEvidence[],
    types: readonly string[],
  ): readonly CoachEvidence[] {
    const allowed = new Set(types);
    return evidences.filter((evidence) => allowed.has(evidence.type));
  }

  private collectEvidenceForFocus(
    evidences: readonly CoachEvidence[],
  ): CoachEvidence[] {
    const focusedTypes: CoachEvidence['type'][] = [
      'WORKOUT_HISTORY',
      'WORKOUT_COMPLETION',
      'RECOVERY_CHECK_IN',
      'RECOVERY_SNAPSHOT',
      'NUTRITION_PROFILE',
      'GOAL_PROGRESS',
      'HABIT_STREAK',
      'WEEKLY_PROGRESS',
      'RECENT_MILESTONE',
      'PLATEAU_SIGNAL',
      'SAFETY_RISK',
      'CONFLICTING_GUIDANCE',
      'PERSONALIZATION_SIGNAL',
      'EXPERT_CONTRIBUTION',
    ];

    return this.pickEvidence(evidences, focusedTypes) as CoachEvidence[];
  }

  private createEvidenceCollectionLabel(
    composition?: CoachExpertCompositionResult,
  ): string {
    return composition?.primaryExpert?.id ?? 'none';
  }
}
