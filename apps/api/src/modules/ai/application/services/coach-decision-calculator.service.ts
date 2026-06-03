import { Injectable } from '@nestjs/common';

import { CoachDecisionActionItem } from '../../domain/value-objects/coach-decision-action-item.value-object';
import {
  CoachDecisionInfluence,
  type CoachDecisionInfluenceCode,
  type CoachDecisionInfluenceImpact,
} from '../../domain/value-objects/coach-decision-influence.value-object';
import {
  CoachDecisionPriority,
  CoachDecisionPriorityValueObject,
} from '../../domain/value-objects/coach-decision-priority.value-object';

export const COACH_DECISION_CALCULATOR_VERSION = 'coach-decision-v1';

export type CoachDecisionCalculatorInput = {
  readinessScore?: number;
  fatigueScore?: number;
  nutritionAdherence?: number;
  adaptiveRecommendationType?: string;
  adaptiveIntensity?: string;
  currentStreak?: number;
  missedWorkouts?: number;
};

export type CoachDecisionCalculatorOutput = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluence[];
  formulaVersion: string;
};

type ResolvedInput = {
  readinessScore: number;
  fatigueScore: number;
  nutritionAdherence: number;
  adaptiveRecommendationType?: string;
  adaptiveIntensity?: string;
  currentStreak: number;
  missedWorkouts: number;
  hasReadinessScore: boolean;
  hasFatigueScore: boolean;
  hasNutritionAdherence: boolean;
  hasCurrentStreak: boolean;
  hasMissedWorkouts: boolean;
  hasAdaptiveRecommendationType: boolean;
  hasAdaptiveIntensity: boolean;
};

@Injectable()
export class CoachDecisionCalculatorService {
  calculate(
    input: CoachDecisionCalculatorInput,
  ): CoachDecisionCalculatorOutput {
    const resolved = this.resolveInput(input);
    const priority = this.selectPriority(resolved);
    const influences = this.buildInfluences(resolved, priority);
    const headline = this.buildHeadline(priority);
    const summary = this.limitSummary(
      this.buildSummary(priority, resolved, influences),
    );
    const actionItems = this.selectActionItems(priority);

    return {
      priority: new CoachDecisionPriorityValueObject(priority).value,
      headline,
      summary,
      actionItems: actionItems.map((item) => item.value),
      influences,
      formulaVersion: COACH_DECISION_CALCULATOR_VERSION,
    };
  }

  private resolveInput(input: CoachDecisionCalculatorInput): ResolvedInput {
    return {
      readinessScore: this.resolveScore(input.readinessScore, 50),
      fatigueScore: this.resolveScore(input.fatigueScore, 50),
      nutritionAdherence: this.resolveScore(input.nutritionAdherence, 50),
      adaptiveRecommendationType: input.adaptiveRecommendationType?.trim() || undefined,
      adaptiveIntensity: input.adaptiveIntensity?.trim() || undefined,
      currentStreak: this.resolveNonNegativeInteger(input.currentStreak),
      missedWorkouts: this.resolveNonNegativeInteger(input.missedWorkouts),
      hasReadinessScore: typeof input.readinessScore === 'number',
      hasFatigueScore: typeof input.fatigueScore === 'number',
      hasNutritionAdherence: typeof input.nutritionAdherence === 'number',
      hasCurrentStreak: typeof input.currentStreak === 'number',
      hasMissedWorkouts: typeof input.missedWorkouts === 'number',
      hasAdaptiveRecommendationType:
        typeof input.adaptiveRecommendationType === 'string' &&
        input.adaptiveRecommendationType.trim().length > 0,
      hasAdaptiveIntensity:
        typeof input.adaptiveIntensity === 'string' &&
        input.adaptiveIntensity.trim().length > 0,
    };
  }

  private selectPriority(input: ResolvedInput): CoachDecisionPriority {
    if (
      input.readinessScore < 40 ||
      input.fatigueScore > 75 ||
      input.adaptiveRecommendationType === 'rest_day' ||
      input.adaptiveRecommendationType === 'recovery_workout'
    ) {
      return 'recovery';
    }

    if (input.nutritionAdherence < 40) {
      return 'nutrition';
    }

    if (this.isTrainingSignal(input.adaptiveRecommendationType)) {
      return 'training';
    }

    if (
      (input.hasMissedWorkouts && input.missedWorkouts >= 2) ||
      (input.hasCurrentStreak && input.currentStreak <= 1)
    ) {
      return 'consistency';
    }

    return 'motivation';
  }

  private buildHeadline(priority: CoachDecisionPriority): string {
    switch (priority) {
      case 'recovery':
        return 'Recovery should be your focus today';
      case 'nutrition':
        return 'Nutrition is the priority today';
      case 'training':
        return 'Training adaptation recommended';
      case 'consistency':
        return 'Focus on consistency';
      case 'motivation':
      default:
        return 'Keep building momentum';
    }
  }

  private buildSummary(
    priority: CoachDecisionPriority,
    input: ResolvedInput,
    influences: CoachDecisionInfluence[],
  ): string {
    const signalText = this.describePrimarySignals(priority, input);
    const influenceText = this.describeInfluences(influences);

    return this.compact([
      signalText,
      influenceText ? `Main signals: ${influenceText}.` : null,
    ]);
  }

  private describePrimarySignals(
    priority: CoachDecisionPriority,
    input: ResolvedInput,
  ): string {
    switch (priority) {
      case 'recovery':
        if (
          input.adaptiveRecommendationType === 'rest_day' ||
          input.adaptiveRecommendationType === 'recovery_workout'
        ) {
          return 'Recovery is the main priority because the adaptive signal recommends easing off today.';
        }

        if (input.readinessScore < 40) {
          return 'Recovery is the main priority because readiness is low.';
        }

        return 'Recovery is the main priority because fatigue is elevated.';
      case 'nutrition':
        return 'Nutrition is below target and should be tightened today.';
      case 'training':
        return 'Training can be adapted today using the current recommendation.';
      case 'consistency':
        return 'Recent activity shows a consistency gap that should be closed today.';
      case 'motivation':
      default:
        return 'Signals are stable, so the focus is to keep building momentum.';
    }
  }

  private describeInfluences(influences: CoachDecisionInfluence[]): string {
    const labels = influences.slice(0, 2).map((influence) => influence.label);
    return labels.join('; ');
  }

  private selectActionItems(
    priority: CoachDecisionPriority,
  ): CoachDecisionActionItem[] {
    const templates = this.getActionItemTemplates(priority);
    return templates.slice(0, 3).map((item) => new CoachDecisionActionItem(item));
  }

  private getActionItemTemplates(priority: CoachDecisionPriority): string[] {
    switch (priority) {
      case 'recovery':
        return [
          'Reduce training intensity today',
          'Prioritize sleep tonight',
          'Keep hydration high',
        ];
      case 'nutrition':
        return [
          'Reach your protein target',
          'Plan your meals ahead',
          'Keep hydration consistent',
        ];
      case 'training':
        return [
          'Follow the adaptive recommendation',
          'Monitor fatigue during the session',
          'Track workout completion',
        ];
      case 'consistency':
        return [
          'Complete today\'s session',
          'Avoid skipping workouts',
          'Maintain your routine',
        ];
      case 'motivation':
      default:
        return ['Continue the current plan', 'Stay consistent'];
    }
  }

  private buildInfluences(
    input: ResolvedInput,
    priority: CoachDecisionPriority,
  ): CoachDecisionInfluence[] {
    const influences: CoachDecisionInfluence[] = [];

    if (input.hasReadinessScore && input.readinessScore < 40) {
      influences.push(
        this.createInfluence(
          'LOW_READINESS',
          'Readiness is low.',
          'negative',
          'recovery',
          0.3,
          input.readinessScore,
        ),
      );
    }

    if (input.hasFatigueScore && input.fatigueScore > 75) {
      influences.push(
        this.createInfluence(
          'HIGH_FATIGUE',
          'Fatigue is high.',
          'negative',
          'recovery',
          0.3,
          input.fatigueScore,
        ),
      );
    }

    if (input.hasNutritionAdherence && input.nutritionAdherence < 40) {
      influences.push(
        this.createInfluence(
          'LOW_NUTRITION_ADHERENCE',
          'Nutrition adherence is below target.',
          'negative',
          'nutrition',
          0.25,
          input.nutritionAdherence,
        ),
      );
    }

    if (input.hasNutritionAdherence && input.nutritionAdherence >= 70) {
      influences.push(
        this.createInfluence(
          'HIGH_NUTRITION_ADHERENCE',
          'Nutrition adherence is strong.',
          'positive',
          'nutrition',
          0.2,
          input.nutritionAdherence,
        ),
      );
    }

    if (priority === 'recovery') {
      if (input.adaptiveRecommendationType === 'rest_day') {
        influences.push(
          this.createInfluence(
            'REST_DAY_RECOMMENDED',
            'Recovery signals recommend a rest day.',
            'negative',
            'recovery',
            0.25,
          ),
        );
      }

      if (input.adaptiveRecommendationType === 'recovery_workout') {
        influences.push(
          this.createInfluence(
            'RECOVERY_WORKOUT_RECOMMENDED',
            'Recovery signals recommend a light recovery workout.',
            'negative',
            'recovery',
            0.2,
          ),
        );
      }
    }

    if (priority === 'training') {
      if (
        input.adaptiveRecommendationType === 'increase_intensity' ||
        input.adaptiveRecommendationType === 'increase_volume'
      ) {
        influences.push(
          this.createInfluence(
            'INCREASE_INTENSITY_RECOMMENDED',
            'The adaptive signal supports progression.',
            'positive',
            'training',
            0.2,
          ),
        );
      }

      if (
        input.adaptiveRecommendationType === 'decrease_intensity' ||
        input.adaptiveRecommendationType === 'decrease_volume'
      ) {
        influences.push(
          this.createInfluence(
            'DECREASE_INTENSITY_RECOMMENDED',
            'The adaptive signal recommends easing back.',
            'negative',
            'training',
            0.2,
          ),
        );
      }
    }

    if (input.hasMissedWorkouts && input.missedWorkouts >= 2) {
      influences.push(
        this.createInfluence(
          'LOW_TRAINING_ADHERENCE',
          'Recent workout adherence is low.',
          'negative',
          'progress',
          0.25,
          input.missedWorkouts,
        ),
      );
    }

    if (input.hasCurrentStreak && input.currentStreak >= 5) {
      influences.push(
        this.createInfluence(
          'LONG_STREAK',
          'The current streak supports momentum.',
          'positive',
          'progress',
          0.15,
          input.currentStreak,
        ),
      );
    }

    if (
      input.hasCurrentStreak &&
      input.hasMissedWorkouts &&
      input.currentStreak === 0 &&
      input.missedWorkouts === 0
    ) {
      influences.push(
        this.createInfluence(
          'NO_RECENT_ACTIVITY',
          'No recent activity was recorded.',
          'negative',
          'progress',
          0.2,
          0,
        ),
      );
    }

    if (
      input.hasCurrentStreak &&
      input.hasMissedWorkouts &&
      input.currentStreak >= 3 &&
      input.missedWorkouts === 0
    ) {
      influences.push(
        this.createInfluence(
          'GOOD_CONSISTENCY',
          'Consistency has been strong recently.',
          'positive',
          'progress',
          0.18,
          input.currentStreak,
        ),
      );
    }

    return this.deduplicateInfluences(influences);
  }

  private createInfluence(
    code: CoachDecisionInfluenceCode,
    label: string,
    impact: CoachDecisionInfluenceImpact,
    source: 'recovery' | 'nutrition' | 'training' | 'progress' | 'memory',
    weight?: number,
    value?: number,
  ): CoachDecisionInfluence {
    return new CoachDecisionInfluence({
      code,
      label,
      impact,
      source,
      weight,
      value,
    });
  }

  private deduplicateInfluences(
    influences: CoachDecisionInfluence[],
  ): CoachDecisionInfluence[] {
    const map = new Map<CoachDecisionInfluenceCode, CoachDecisionInfluence>();

    for (const influence of influences) {
      if (!map.has(influence.code)) {
        map.set(influence.code, influence);
      }
    }

    return [...map.values()];
  }

  private compact(parts: Array<string | null>): string {
    return parts
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();
  }

  private limitSummary(summary: string): string {
    if (summary.length <= 250) {
      return summary;
    }

    return summary.slice(0, 247).trimEnd() + '...';
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private resolveNonNegativeInteger(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.round(value));
  }

  private isTrainingSignal(
    value: string | undefined,
  ): boolean {
    return (
      value === 'increase_intensity' ||
      value === 'decrease_intensity' ||
      value === 'increase_volume' ||
      value === 'decrease_volume'
    );
  }
}
