import { Injectable } from '@nestjs/common';

import type { AgentContextDomain, AgentIntent } from '../../agent.types';
import type { CoachExpertMetadata } from '../coach-expert.types';
import type {
  CoachExpertCombinationRule,
  CoachExpertRoutingConfidence,
  CoachExpertRoutingReasonCode,
} from './coach-expert-router.types';

const PRIMARY_EXPERT_BY_INTENT: ReadonlyMap<AgentIntent, string> = new Map([
  ['TRAINING', 'WorkoutExpert'],
  ['NUTRITION', 'NutritionExpert'],
  ['RECOVERY', 'RecoveryExpert'],
  ['GOALS', 'GoalExpert'],
  ['HABITS', 'HabitExpert'],
  ['PROGRESS', 'ProgressExpert'],
  ['MOTIVATION', 'MotivationExpert'],
]);

const COMPLEMENTARY_EXPERT_IDS_BY_EXPERT_ID: ReadonlyMap<
  string,
  readonly string[]
> = new Map([
  ['WorkoutExpert', ['RecoveryExpert', 'GoalExpert']],
  ['NutritionExpert', ['GoalExpert', 'RecoveryExpert']],
  ['RecoveryExpert', ['WorkoutExpert', 'NutritionExpert']],
  [
    'GoalExpert',
    [
      'WorkoutExpert',
      'NutritionExpert',
      'RecoveryExpert',
      'HabitExpert',
      'ProgressExpert',
    ],
  ],
  ['HabitExpert', ['GoalExpert', 'ProgressExpert', 'MotivationExpert']],
  [
    'ProgressExpert',
    ['GoalExpert', 'HabitExpert', 'WorkoutExpert', 'RecoveryExpert'],
  ],
  ['MotivationExpert', ['HabitExpert', 'ProgressExpert', 'GoalExpert']],
]);

const DEPENDENCY_EXPERT_IDS_BY_EXPERT_ID: ReadonlyMap<
  string,
  readonly string[]
> = new Map([
  ['GoalExpert', ['WorkoutExpert', 'NutritionExpert', 'RecoveryExpert']],
  [
    'ProgressExpert',
    ['WorkoutExpert', 'RecoveryExpert', 'HabitExpert', 'GoalExpert'],
  ],
  ['MotivationExpert', ['HabitExpert', 'ProgressExpert', 'GoalExpert']],
]);

const KNOWN_EXPERT_IDS = [
  'WorkoutExpert',
  'NutritionExpert',
  'RecoveryExpert',
  'GoalExpert',
  'HabitExpert',
  'ProgressExpert',
  'MotivationExpert',
] as const;

const COMBINATION_RULES: readonly CoachExpertCombinationRule[] = Object.freeze(
  KNOWN_EXPERT_IDS.flatMap((leftExpertId, index) =>
    KNOWN_EXPERT_IDS.slice(index + 1).map((rightExpertId) =>
      Object.freeze({
        leftExpertId,
        rightExpertId,
        allowed: true,
        reasonCode: 'COMPLEMENTARY_RULE' as CoachExpertRoutingReasonCode,
      }),
    ),
  ),
);

@Injectable()
export class CoachExpertRoutingPolicy {
  resolvePrimaryExpert(
    candidates: readonly CoachExpertMetadata[],
    intent: AgentIntent,
    selectedDomains: readonly AgentContextDomain[],
  ): CoachExpertMetadata | undefined {
    const directPrimaryId = PRIMARY_EXPERT_BY_INTENT.get(intent);
    const directPrimary = directPrimaryId
      ? candidates.find((candidate) => candidate.id === directPrimaryId)
      : undefined;

    if (directPrimary) {
      return directPrimary;
    }

    let bestCandidate: CoachExpertMetadata | undefined;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.scoreCandidate(candidate, intent, selectedDomains);

      if (score <= 0) {
        continue;
      }

      if (!bestCandidate || score > bestScore) {
        bestCandidate = candidate;
        bestScore = score;
        continue;
      }

      if (
        score === bestScore &&
        this.compareExpertMetadata(candidate, bestCandidate) < 0
      ) {
        bestCandidate = candidate;
        bestScore = score;
      }
    }

    return bestCandidate;
  }

  scoreCandidate(
    candidate: CoachExpertMetadata,
    intent: AgentIntent,
    selectedDomains: readonly AgentContextDomain[],
  ): number {
    let score = candidate.priority;

    if (candidate.supportedIntents.includes(intent)) {
      score += 100;
    }

    const domainOverlap = candidate.supportedDomains.filter((domain) =>
      selectedDomains.includes(domain),
    ).length;
    score += domainOverlap * 20;

    if (PRIMARY_EXPERT_BY_INTENT.get(intent) === candidate.id) {
      score += 1000;
    }

    if (candidate.capabilities.includes('COACH_ROUTING')) {
      score += 5;
    }

    return score;
  }

  getPrimaryExpertId(intent: AgentIntent): string | undefined {
    return PRIMARY_EXPERT_BY_INTENT.get(intent);
  }

  getComplementaryExpertIds(expertId: string): readonly string[] {
    return COMPLEMENTARY_EXPERT_IDS_BY_EXPERT_ID.get(expertId) ?? [];
  }

  getDependencyExpertIds(expertId: string): readonly string[] {
    return DEPENDENCY_EXPERT_IDS_BY_EXPERT_ID.get(expertId) ?? [];
  }

  getCombinationRules(): readonly CoachExpertCombinationRule[] {
    return COMBINATION_RULES;
  }

  isCombinationAllowed(leftExpertId: string, rightExpertId: string): boolean {
    if (!leftExpertId || !rightExpertId || leftExpertId === rightExpertId) {
      return false;
    }

    return (
      this.getCombinationRule(leftExpertId, rightExpertId)?.allowed ?? false
    );
  }

  getCombinationRule(
    leftExpertId: string,
    rightExpertId: string,
  ): CoachExpertCombinationRule | undefined {
    const normalizedLeft = this.normalizePairKey(leftExpertId, rightExpertId);
    const normalizedRight = this.normalizePairKey(rightExpertId, leftExpertId);

    return COMBINATION_RULES.find(
      (rule) =>
        this.normalizePairKey(rule.leftExpertId, rule.rightExpertId) ===
          normalizedLeft ||
        this.normalizePairKey(rule.leftExpertId, rule.rightExpertId) ===
          normalizedRight,
    );
  }

  resolveConfidence(input: {
    intent: AgentIntent;
    primaryExpert: CoachExpertMetadata | null;
    orderedExperts: readonly CoachExpertMetadata[];
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
  }): CoachExpertRoutingConfidence {
    if (input.orderedExperts.length === 0) {
      return 'LOW';
    }

    const candidateCount = input.candidateExperts.length;
    const domainCoverage = input.selectedDomains.filter((domain) =>
      input.orderedExperts.some((expert) =>
        expert.supportedDomains.includes(domain),
      ),
    ).length;
    const hasDirectPrimary =
      Boolean(input.primaryExpert) &&
      this.getPrimaryExpertId(input.intent) === input.primaryExpert?.id;

    if (
      hasDirectPrimary &&
      input.orderedExperts.length >= 2 &&
      domainCoverage >= 1
    ) {
      return 'HIGH';
    }

    if (
      hasDirectPrimary ||
      input.orderedExperts.length >= 2 ||
      candidateCount >= 2 ||
      domainCoverage >= 1
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private compareExpertMetadata(
    left: CoachExpertMetadata,
    right: CoachExpertMetadata,
  ): number {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return left.id.localeCompare(right.id);
  }

  private normalizePairKey(left: string, right: string): string {
    return [left, right].sort((a, b) => a.localeCompare(b)).join(':');
  }
}
