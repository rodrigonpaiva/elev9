import type {
  BehavioralPatternType,
  CoachingStyle,
  EngagementProfile,
  PersonalizationTrend,
  ResponsivenessLevel,
} from '../../domain/personalization.types';

export const PERSONALIZATION_ENGINE_CALCULATOR_VERSION =
  'personalization-engine-v1';

export interface PersonalizationCalculationInput {
  engagementScore?: number;
  notificationDismissalRate?: number;
  notificationCompletionRate?: number;

  consistencyScore?: number;
  habitTrend?: 'improving' | 'stable' | 'declining';
  habitRiskLevel?: 'low' | 'medium' | 'high';

  goalTrend?: 'improving' | 'stable' | 'declining';
  goalMilestoneReached?: boolean;
  goalAchievementReached?: boolean;

  recoveryTrend?: 'improving' | 'stable' | 'declining';
  recoveryAlertEngagement?: number;

  coachDecisionPriorityHistory?: string[];

  activityHourDistribution?: {
    morning: number;
    afternoon: number;
    evening: number;
  };

  previousSnapshotScore?: number;
}

export interface PersonalizationCalculationResult {
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  riskOfDisengagement: ResponsivenessLevel;
  behavioralPatterns: BehavioralPatternType[];
  trend: PersonalizationTrend;
  compositeScore: number;
  formulaVersion: string;
}

export class PersonalizationCalculatorService {
  calculate(
    input: PersonalizationCalculationInput,
  ): PersonalizationCalculationResult {
    const engagementScore = this.resolveScore(input.engagementScore);
    const notificationDismissalRate = this.resolveScore(
      input.notificationDismissalRate,
    );
    const notificationCompletionRate = this.resolveScore(
      input.notificationCompletionRate,
    );
    const consistencyScore = this.resolveScore(input.consistencyScore);
    const recoveryAlertEngagement = this.resolveScore(
      input.recoveryAlertEngagement,
    );

    const preferredCoachingStyle = this.resolveCoachingStyle({
      engagementScore,
      notificationDismissalRate,
      notificationCompletionRate,
      recoveryAlertEngagement,
    });
    const engagementProfile = this.resolveLevel(engagementScore);
    const notificationResponsiveness = this.resolveLevel(
      this.averageScore([
        engagementScore,
        notificationCompletionRate,
        100 - notificationDismissalRate,
      ]),
    );
    const goalResponsiveness = this.resolveLevel(
      this.averageScore([
        engagementScore,
        consistencyScore,
        this.resolveGoalSignalScore(input),
      ]),
    );
    const recoveryResponsiveness = this.resolveLevel(
      this.averageScore([
        engagementScore,
        recoveryAlertEngagement,
        this.resolveRecoverySignalScore(input, recoveryAlertEngagement),
      ]),
    );
    const habitResponsiveness = this.resolveLevel(
      this.averageScore([
        engagementScore,
        consistencyScore,
        this.resolveHabitSignalScore(input),
      ]),
    );
    const riskOfDisengagement = this.resolveRiskOfDisengagement({
      engagementScore,
      notificationDismissalRate,
      habitRiskLevel: input.habitRiskLevel,
    });
    const behavioralPatterns = this.resolveBehavioralPatterns(input, {
      engagementScore,
      notificationDismissalRate,
      notificationCompletionRate,
      consistencyScore,
      recoveryAlertEngagement,
    });
    const compositeScore = this.averageScore([
      engagementScore,
      consistencyScore,
      notificationCompletionRate,
      recoveryAlertEngagement,
    ]);
    const trend = this.resolveTrend(
      compositeScore,
      input.previousSnapshotScore,
    );

    return {
      preferredCoachingStyle,
      engagementProfile,
      notificationResponsiveness,
      goalResponsiveness,
      recoveryResponsiveness,
      habitResponsiveness,
      riskOfDisengagement,
      behavioralPatterns,
      trend,
      compositeScore,
      formulaVersion: PERSONALIZATION_ENGINE_CALCULATOR_VERSION,
    };
  }

  resolveCoachingStyle(input: {
    engagementScore: number;
    notificationDismissalRate: number;
    notificationCompletionRate: number;
    recoveryAlertEngagement: number;
  }): CoachingStyle {
    if (
      input.engagementScore >= 70 &&
      input.notificationCompletionRate >= 70
    ) {
      return 'motivational';
    }

    if (input.recoveryAlertEngagement >= 70) {
      return 'educational';
    }

    if (
      input.notificationDismissalRate >= 70 &&
      input.notificationCompletionRate <= 40
    ) {
      return 'direct';
    }

    return 'balanced';
  }

  resolveLevel(score: number): ResponsivenessLevel {
    if (score < 40) {
      return 'low';
    }

    if (score < 70) {
      return 'medium';
    }

    return 'high';
  }

  resolveRiskOfDisengagement(input: {
    engagementScore: number;
    notificationDismissalRate: number;
    habitRiskLevel?: 'low' | 'medium' | 'high';
  }): ResponsivenessLevel {
    if (
      input.habitRiskLevel === 'high' ||
      input.engagementScore < 35 ||
      input.notificationDismissalRate > 70
    ) {
      return 'high';
    }

    if (input.habitRiskLevel === 'medium' || input.engagementScore < 60) {
      return 'medium';
    }

    return 'low';
  }

  resolveTrend(
    currentScore: number,
    previousSnapshotScore?: number,
  ): PersonalizationTrend {
    if (
      typeof previousSnapshotScore !== 'number' ||
      Number.isNaN(previousSnapshotScore)
    ) {
      return 'stable';
    }

    const delta = currentScore - this.clampScore(previousSnapshotScore);

    if (delta >= 5) {
      return 'improving';
    }

    if (delta <= -5) {
      return 'declining';
    }

    return 'stable';
  }

  resolveBehavioralPatterns(
    input: PersonalizationCalculationInput,
    scores: {
      engagementScore: number;
      notificationDismissalRate: number;
      notificationCompletionRate: number;
      consistencyScore: number;
      recoveryAlertEngagement: number;
    },
  ): BehavioralPatternType[] {
    const patterns: BehavioralPatternType[] = [];

    if (scores.consistencyScore >= 75 && input.habitTrend === 'improving') {
      patterns.push('responds_to_streaks');
    }

    if (input.goalMilestoneReached || input.goalAchievementReached) {
      patterns.push('responds_to_goals');
    }

    if (scores.recoveryAlertEngagement >= 70) {
      patterns.push('responds_to_recovery_guidance');
    }

    if (
      scores.engagementScore >= 70 &&
      scores.notificationCompletionRate >= 50
    ) {
      patterns.push('responds_to_notifications');
    }

    if (scores.notificationDismissalRate >= 60) {
      patterns.push('ignores_low_priority_reminders');
    }

    if (input.activityHourDistribution) {
      const morning = this.resolveActivityBucket(
        input.activityHourDistribution.morning,
      );
      const afternoon = this.resolveActivityBucket(
        input.activityHourDistribution.afternoon,
      );
      const evening = this.resolveActivityBucket(
        input.activityHourDistribution.evening,
      );

      if (morning > afternoon && morning > evening) {
        patterns.push('morning_engagement');
      }

      if (evening > morning && evening > afternoon) {
        patterns.push('evening_engagement');
      }
    }

    if (scores.notificationDismissalRate >= 70) {
      patterns.push('high_dismissal_behavior');
    }

    if (scores.consistencyScore >= 80) {
      patterns.push('consistent_check_in_behavior');
    }

    return patterns;
  }

  resolveGoalSignalScore(
    input: Pick<
      PersonalizationCalculationInput,
      'goalTrend' | 'goalMilestoneReached' | 'goalAchievementReached'
    >,
  ): number {
    return this.clampScore(
      50 +
        this.resolveTrendBonus(input.goalTrend) +
        (input.goalMilestoneReached ? 10 : 0) +
        (input.goalAchievementReached ? 15 : 0),
    );
  }

  resolveRecoverySignalScore(
    input: Pick<PersonalizationCalculationInput, 'recoveryTrend'>,
    recoveryAlertEngagement: number,
  ): number {
    return this.clampScore(
      50 +
        this.resolveTrendBonus(input.recoveryTrend) +
        (recoveryAlertEngagement >= 70 ? 10 : 0),
    );
  }

  resolveHabitSignalScore(
    input: Pick<PersonalizationCalculationInput, 'habitTrend'>,
  ): number {
    return this.clampScore(50 + this.resolveTrendBonus(input.habitTrend));
  }

  resolveTrendBonus(
    trend?: 'improving' | 'stable' | 'declining',
  ): number {
    if (trend === 'improving') {
      return 10;
    }

    if (trend === 'declining') {
      return -10;
    }

    return 0;
  }

  resolveActivityBucket(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return value;
  }

  averageScore(values: number[]): number {
    if (values.length === 0) {
      return 50;
    }

    const total = values.reduce((sum, value) => sum + this.clampScore(value), 0);

    return this.clampScore(Math.round(total / values.length));
  }

  resolveScore(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 50;
    }

    return this.clampScore(value);
  }

  clampScore(value: number): number {
    if (value < 0) {
      return 0;
    }

    if (value > 100) {
      return 100;
    }

    return Math.round(value);
  }
}
