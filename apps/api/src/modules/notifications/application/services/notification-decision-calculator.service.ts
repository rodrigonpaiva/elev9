import { Injectable } from '@nestjs/common';

import { NotificationChannelValueObject } from '../../domain/value-objects/notification-channel.value-object';
import {
  NotificationInfluence,
} from '../../domain/value-objects/notification-influence.value-object';
import { NotificationPriorityValueObject } from '../../domain/value-objects/notification-priority.value-object';
import { NotificationStatusValueObject } from '../../domain/value-objects/notification-status.value-object';
import { NotificationTypeValueObject } from '../../domain/value-objects/notification-type.value-object';
import type {
  NotificationCoachDecisionPriority,
  NotificationSourceContext,
} from '../../domain/notifications.types';

export const NOTIFICATION_ENGINE_CALCULATOR_VERSION =
  'notification-engine-v1';

export type NotificationDecisionSourceInput = {
  coachDecisionPriority?: NotificationCoachDecisionPriority;
  coachDecisionHeadline?: string;
  coachDecisionInfluences?: Array<{
    code: string;
    label: string;
    impact: 'positive' | 'negative' | 'neutral';
    source: string;
    weight?: number;
    value?: number;
  }>;
  readinessScore?: number;
  fatigueScore?: number;
  adaptiveRecommendationType?: string;
  goalProgressTrend?: 'improving' | 'stable' | 'declining';
  goalMilestoneClose?: boolean;
  goalAchievementReached?: boolean;
  nutritionAdherence?: number;
  missedWorkouts?: number;
  noRecentActivity?: boolean;
  fatigueLevel?: 'low' | 'medium' | 'high';
};

export type NotificationDecisionCalculatorOutput = {
  type: NotificationTypeValueObject['value'];
  priority: NotificationPriorityValueObject['value'];
  channel: NotificationChannelValueObject['value'];
  status: NotificationStatusValueObject['value'];
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationInfluence[];
  sourceContext: NotificationSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic';
};

type ResolvedInput = {
  coachDecisionPriority?: NotificationCoachDecisionPriority;
  coachDecisionHeadline?: string;
  coachDecisionInfluences: NonNullable<
    NotificationDecisionSourceInput['coachDecisionInfluences']
  >;
  readinessScore: number;
  fatigueScore: number;
  adaptiveRecommendationType?: string;
  goalProgressTrend?: 'improving' | 'stable' | 'declining';
  goalMilestoneClose: boolean;
  goalAchievementReached: boolean;
  nutritionAdherence: number;
  missedWorkouts: number;
  noRecentActivity: boolean;
  fatigueLevel: 'low' | 'medium' | 'high';
  hasReadinessScore: boolean;
  hasFatigueScore: boolean;
  hasAdaptiveRecommendationType: boolean;
  hasGoalProgressTrend: boolean;
  hasGoalMilestoneClose: boolean;
  hasGoalAchievementReached: boolean;
  hasNutritionAdherence: boolean;
  hasMissedWorkouts: boolean;
  hasNoRecentActivity: boolean;
  hasFatigueLevel: boolean;
};

@Injectable()
export class NotificationDecisionCalculatorService {
  calculate(
    input: NotificationDecisionSourceInput,
  ): NotificationDecisionCalculatorOutput {
    const resolved = this.resolveInput(input);
    const decision = this.selectDecision(resolved);
    const fatigueInfluence = this.buildFatigueInfluence(resolved.fatigueLevel);
    const influences = [
      fatigueInfluence,
      ...this.buildInfluencesForDecision(resolved, decision.type),
    ];

    return {
      ...decision,
      influences,
      sourceContext: this.buildSourceContext(resolved),
      formulaVersion: NOTIFICATION_ENGINE_CALCULATOR_VERSION,
      generatedBy: 'deterministic',
    };
  }

  private resolveInput(input: NotificationDecisionSourceInput): ResolvedInput {
    return {
      coachDecisionPriority: input.coachDecisionPriority,
      coachDecisionHeadline: input.coachDecisionHeadline?.trim() || undefined,
      coachDecisionInfluences: input.coachDecisionInfluences ?? [],
      readinessScore: this.resolveScore(input.readinessScore, 50),
      fatigueScore: this.resolveScore(input.fatigueScore, 50),
      adaptiveRecommendationType:
        input.adaptiveRecommendationType?.trim() || undefined,
      goalProgressTrend: input.goalProgressTrend,
      goalMilestoneClose: Boolean(input.goalMilestoneClose),
      goalAchievementReached: Boolean(input.goalAchievementReached),
      nutritionAdherence: this.resolveScore(input.nutritionAdherence, 50),
      missedWorkouts: this.resolveNonNegativeInteger(input.missedWorkouts),
      noRecentActivity: Boolean(input.noRecentActivity),
      fatigueLevel: this.resolveFatigueLevel(input),
      hasReadinessScore: typeof input.readinessScore === 'number',
      hasFatigueScore: typeof input.fatigueScore === 'number',
      hasAdaptiveRecommendationType:
        typeof input.adaptiveRecommendationType === 'string' &&
        input.adaptiveRecommendationType.trim().length > 0,
      hasGoalProgressTrend:
        input.goalProgressTrend === 'improving' ||
        input.goalProgressTrend === 'stable' ||
        input.goalProgressTrend === 'declining',
      hasGoalMilestoneClose: typeof input.goalMilestoneClose === 'boolean',
      hasGoalAchievementReached:
        typeof input.goalAchievementReached === 'boolean',
      hasNutritionAdherence: typeof input.nutritionAdherence === 'number',
      hasMissedWorkouts: typeof input.missedWorkouts === 'number',
      hasNoRecentActivity: typeof input.noRecentActivity === 'boolean',
      hasFatigueLevel:
        input.fatigueLevel === 'low' ||
        input.fatigueLevel === 'medium' ||
        input.fatigueLevel === 'high',
    };
  }

  private selectDecision(input: ResolvedInput): Omit<
    NotificationDecisionCalculatorOutput,
    'influences' | 'sourceContext' | 'formulaVersion' | 'generatedBy'
  > {
    if (
      input.readinessScore < 30 ||
      input.fatigueScore > 85 ||
      input.adaptiveRecommendationType === 'rest_day'
    ) {
      return {
        type: new NotificationTypeValueObject('recovery_alert').value,
        priority: new NotificationPriorityValueObject('urgent').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: 'Recovery needed today',
        message:
          'Recovery is the priority today. Ease off, recover well, and get ready for the next session.',
        actionLabel: 'Recover today',
        actionTarget: 'recovery.today',
      };
    }

    if (input.goalAchievementReached) {
      return {
        type: new NotificationTypeValueObject('goal_achievement').value,
        priority: new NotificationPriorityValueObject('high').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: 'Goal achieved',
        message:
          'You reached your goal. Take a moment to acknowledge the progress and keep the momentum going.',
        actionLabel: 'View goal',
        actionTarget: 'goals.current',
      };
    }

    if (input.goalMilestoneClose) {
      return {
        type: new NotificationTypeValueObject('goal_milestone').value,
        priority: new NotificationPriorityValueObject('high').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: "You're close to a milestone",
        message:
          'A goal milestone is within reach. Keep the routine steady and one more step should get you there.',
        actionLabel: 'Keep going',
        actionTarget: 'goals.current',
      };
    }

    if (input.missedWorkouts >= 2 || input.noRecentActivity) {
      return {
        type: new NotificationTypeValueObject('missed_workout').value,
        priority: new NotificationPriorityValueObject('medium').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: 'Time to get back on track',
        message:
          'Activity has dipped recently. A short workout or a reset today will help you get back into rhythm.',
        actionLabel: 'Plan workout',
        actionTarget: 'training.current',
      };
    }

    if (input.nutritionAdherence < 40) {
      return {
        type: new NotificationTypeValueObject('nutrition_reminder').value,
        priority: new NotificationPriorityValueObject('medium').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: 'Nutrition needs attention',
        message:
          'Nutrition is lagging today. Keep the next meals simple and aim to stay close to your targets.',
        actionLabel: 'Review plan',
        actionTarget: 'nutrition.today',
      };
    }

    if (
      input.coachDecisionPriority === 'consistency' ||
      input.coachDecisionPriority === 'motivation'
    ) {
      return {
        type: new NotificationTypeValueObject('coach_nudge').value,
        priority: new NotificationPriorityValueObject('medium').value,
        channel: new NotificationChannelValueObject('in_app').value,
        status: new NotificationStatusValueObject('planned').value,
        title: 'Small action, big progress',
        message:
          'Keep the routine steady today. One focused action is enough to keep progress moving.',
        actionLabel: 'Keep building',
        actionTarget: 'dashboard.home',
      };
    }

    return {
      type: new NotificationTypeValueObject('weekly_summary').value,
      priority: new NotificationPriorityValueObject('low').value,
      channel: new NotificationChannelValueObject('in_app').value,
      status: new NotificationStatusValueObject('planned').value,
      title: 'Your weekly summary is ready',
      message:
        'Review the week and keep the next step simple. A short check-in is enough to stay on track.',
      actionLabel: 'Review week',
      actionTarget: 'dashboard.weekly-summary',
    };
  }

  private buildFatigueInfluence(
    fatigueLevel: ResolvedInput['fatigueLevel'],
  ): NotificationInfluence {
    switch (fatigueLevel) {
      case 'high':
        return new NotificationInfluence({
          code: 'HIGH_FATIGUE',
          label: 'High fatigue',
          impact: 'negative',
          source: 'recovery',
          value: 100,
        });
      case 'medium':
        return new NotificationInfluence({
          code: 'MEDIUM_FATIGUE',
          label: 'Moderate fatigue',
          impact: 'neutral',
          source: 'recovery',
          value: 50,
        });
      case 'low':
      default:
        return new NotificationInfluence({
          code: 'LOW_FATIGUE',
          label: 'Low fatigue',
          impact: 'positive',
          source: 'recovery',
          value: 0,
        });
    }
  }

  private buildInfluencesForDecision(
    input: ResolvedInput,
    type: NotificationDecisionCalculatorOutput['type'],
  ): NotificationInfluence[] {
    const influences: NotificationInfluence[] = [];

    if (type === 'recovery_alert') {
      if (input.hasReadinessScore && input.readinessScore < 30) {
        influences.push(
          new NotificationInfluence({
            code: 'LOW_READINESS',
            label: 'Low readiness',
            impact: 'negative',
            source: 'recovery',
            value: input.readinessScore,
          }),
        );
      }

      if (input.adaptiveRecommendationType === 'rest_day') {
        influences.push(
          new NotificationInfluence({
            code: 'REST_DAY_RECOMMENDED',
            label: 'Rest day recommended',
            impact: 'neutral',
            source: 'recovery',
          }),
        );
      }
    }

    if (type === 'goal_achievement') {
      influences.push(
        new NotificationInfluence({
          code: 'GOAL_ACHIEVED',
          label: 'Goal achieved',
          impact: 'positive',
          source: 'goal',
        }),
      );
    }

    if (type === 'goal_milestone') {
      influences.push(
        new NotificationInfluence({
          code: 'GOAL_MILESTONE_CLOSE',
          label: 'Goal milestone close',
          impact: 'positive',
          source: 'goal',
        }),
      );
    }

    if (type === 'missed_workout') {
      influences.push(
        new NotificationInfluence({
          code: 'MISSED_WORKOUTS',
          label: 'Missed workouts',
          impact: 'negative',
          source: 'activity',
          value: input.missedWorkouts,
        }),
      );

      if (input.noRecentActivity) {
        influences.push(
          new NotificationInfluence({
            code: 'LOW_ENGAGEMENT',
            label: 'Low engagement',
            impact: 'negative',
            source: 'activity',
          }),
        );
      }
    }

    if (type === 'nutrition_reminder') {
      influences.push(
        new NotificationInfluence({
          code: 'LOW_NUTRITION_ADHERENCE',
          label: 'Low nutrition adherence',
          impact: 'negative',
          source: 'nutrition',
          value: input.nutritionAdherence,
        }),
      );
    }

    if (type === 'coach_nudge') {
      influences.push(
        new NotificationInfluence({
          code: 'COACH_CONSISTENCY_NUDGE',
          label: 'Coach consistency nudge',
          impact: 'neutral',
          source: 'coach',
        }),
      );
    }

    if (type === 'weekly_summary') {
      influences.push(
        new NotificationInfluence({
          code: 'LOW_ENGAGEMENT',
          label: 'Weekly summary prompt',
          impact: 'neutral',
          source: 'coach',
        }),
      );
    }

    return influences;
  }

  private buildSourceContext(input: ResolvedInput): NotificationSourceContext {
    return {
      coachDecisionPriority: input.coachDecisionPriority,
      readinessScore: input.hasReadinessScore ? input.readinessScore : undefined,
      fatigueScore: input.hasFatigueScore ? input.fatigueScore : undefined,
      fatigueLevel: input.hasFatigueLevel ? input.fatigueLevel : undefined,
      adaptiveRecommendationType: input.adaptiveRecommendationType,
      goalProgressTrend: input.hasGoalProgressTrend
        ? input.goalProgressTrend
        : undefined,
      goalMilestoneClose: input.hasGoalMilestoneClose
        ? input.goalMilestoneClose
        : undefined,
      goalAchievementReached: input.hasGoalAchievementReached
        ? input.goalAchievementReached
        : undefined,
      nutritionAdherence: input.hasNutritionAdherence
        ? input.nutritionAdherence
        : undefined,
      missedWorkouts: input.hasMissedWorkouts ? input.missedWorkouts : undefined,
      noRecentActivity: input.hasNoRecentActivity
        ? input.noRecentActivity
        : undefined,
      formulaVersion: NOTIFICATION_ENGINE_CALCULATOR_VERSION,
    };
  }

  private resolveFatigueLevel(
    input: NotificationDecisionSourceInput,
  ): 'low' | 'medium' | 'high' {
    if (input.fatigueLevel === 'low' || input.fatigueLevel === 'medium' || input.fatigueLevel === 'high') {
      return input.fatigueLevel;
    }

    if (typeof input.fatigueScore === 'number') {
      if (input.fatigueScore > 75) {
        return 'high';
      }

      if (input.fatigueScore >= 40) {
        return 'medium';
      }
    }

    return 'low';
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private resolveNonNegativeInteger(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.floor(value));
  }
}
