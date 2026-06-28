import { Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import {
  CoachDecisionReadModelPayload,
  NotificationPromptPayload,
  HabitPromptPayload,
  PersonalizationPromptPayload,
} from '../../../../../shared/mappers';

type UserHealthContext = Awaited<
  ReturnType<BuildUserHealthContextService['build']>
>;

@Injectable()
export class CoachChatReplyGenerator {
  generate(input: {
    message: string;
    healthContext: UserHealthContext;
    coachDecision?: CoachDecisionReadModelPayload;
    notification?: NotificationPromptPayload;
    habit?: HabitPromptPayload;
    personalization?: PersonalizationPromptPayload;
  }): string {
    const coachDecisionReply = this.buildCoachDecisionReply(
      input.coachDecision,
    );

    if (coachDecisionReply) {
      return coachDecisionReply;
    }

    const notificationReply = this.buildNotificationReply(input.notification);

    if (notificationReply) {
      return notificationReply;
    }

    const habitReply = this.buildHabitReply(input.habit);

    if (habitReply) {
      return habitReply;
    }

    const latestCheckIn = input.healthContext.latestCheckIn;
    const recoveryTrend = this.resolveRecoveryTrend(input.healthContext);
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;
    const hasLowMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel <= 2
      : false;
    const nutritionProfile = input.healthContext.nutritionProfile;
    const personalizationTone = this.buildPersonalizationTone(
      input.personalization,
    );

    if (
      input.healthContext.fatigueLevel === 'HIGH' ||
      recoveryTrend === 'needs_recovery' ||
      hasLowSleep ||
      hasHighSoreness
    ) {
      return this.applyTone(
        "Your recovery signals suggest keeping today's session lighter.",
        personalizationTone,
      );
    }

    if (
      nutritionProfile?.goal === 'muscle_gain' &&
      input.healthContext.fatigueLevel === 'LOW' &&
      latestCheckIn &&
      latestCheckIn.motivationLevel >= 4
    ) {
      return this.applyTone(
        'Your recent consistency looks strong. This may be a good moment for controlled progression.',
        personalizationTone,
      );
    }

    if (
      nutritionProfile?.mealsPerDay !== undefined &&
      nutritionProfile.mealsPerDay <= 2
    ) {
      return this.applyTone(
        'Keeping your meals consistent today will support recovery and training.',
        personalizationTone,
      );
    }

    if (hasLowMotivation || input.healthContext.currentStreak >= 3) {
      return this.applyTone(
        'Your recent consistency looks steady. Keep the routine simple and repeatable today.',
        personalizationTone,
      );
    }

    return this.applyTone(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
      personalizationTone,
    );
  }

  private buildNotificationReply(
    notification?: NotificationPromptPayload,
  ): string | null {
    if (!notification) {
      return null;
    }

    const current = notification.current;
    const engagementSummary = notification.engagementSummary;
    const fatigueLevel =
      current?.fatigueLevel ?? engagementSummary?.fatigueLevel;
    const engagementScore = engagementSummary?.engagementScore ?? 50;
    const dismissedCount = engagementSummary?.dismissedCount ?? 0;

    if (current?.suppressed || fatigueLevel === 'high') {
      return 'Notification fatigue is high right now, so keep reminders light and focused.';
    }

    if (dismissedCount >= 2) {
      return 'Recent dismissals suggest keeping interruptions to a minimum.';
    }

    if (engagementScore >= 80) {
      return 'Notification engagement looks strong, so this is a good moment to reinforce positive behavior.';
    }

    return 'Your notification pattern looks steady, so keep the next step simple and consistent.';
  }

  private buildHabitReply(habit?: HabitPromptPayload): string | null {
    if (!habit) {
      return null;
    }

    const current = habit.current;
    const summary = habit.summary;
    const riskSignals = habit.riskSignals ?? [];
    const trend = summary?.trend ?? current?.trend ?? 'stable';
    const currentStreak = summary?.currentStreak ?? current?.streakDays ?? 0;
    const riskLevel = summary?.riskLevel ?? 'low';

    if (
      riskSignals.some((signal) => signal.type === 'dropout_risk') ||
      riskLevel === 'high'
    ) {
      return 'Your consistency signals suggest keeping the next step small and easy to repeat.';
    }

    if (trend === 'declining') {
      return 'Your routine is slipping a bit, so focus on one repeatable action today.';
    }

    if (trend === 'improving' || currentStreak >= 5) {
      return 'Your consistency looks strong. Keep the routine steady and protect the streak.';
    }

    return null;
  }

  private buildCoachDecisionReply(
    coachDecision?: CoachDecisionReadModelPayload,
  ): string | null {
    if (!coachDecision) {
      return null;
    }

    const headline = this.normalizeSentence(coachDecision.headline);
    const summary = this.normalizeSentence(coachDecision.summary);
    const influenceCue = this.buildInfluenceCue(coachDecision);

    switch (coachDecision.priority) {
      case 'recovery':
        return [
          headline,
          summary,
          influenceCue,
          'Keep the session lighter and prioritize sleep, hydration, and recovery work.',
        ]
          .filter(Boolean)
          .join(' ');
      case 'nutrition':
        return [
          headline,
          summary,
          influenceCue,
          'Prioritize meals, protein, and consistent hydration.',
        ]
          .filter(Boolean)
          .join(' ');
      case 'training':
        return [
          headline,
          summary,
          influenceCue,
          `Follow the adaptive recommendation: ${this.buildActionItemHint(coachDecision.actionItems)}.`,
        ]
          .filter(Boolean)
          .join(' ');
      case 'consistency':
        return [
          headline,
          summary,
          influenceCue,
          'Keep the routine simple and complete the planned work.',
        ]
          .filter(Boolean)
          .join(' ');
      case 'motivation':
      default:
        return [
          headline,
          summary,
          influenceCue,
          'Stay consistent and keep building on the current routine.',
        ]
          .filter(Boolean)
          .join(' ');
    }
  }

  private buildActionItemHint(actionItems: string[]): string {
    if (actionItems.length === 0) {
      return 'monitor your fatigue and keep the plan steady';
    }

    return actionItems.slice(0, 2).join(' and ');
  }

  private buildInfluenceCue(
    coachDecision: CoachDecisionReadModelPayload,
  ): string {
    const codes = coachDecision.influences.map((influence) => influence.code);

    if (
      coachDecision.priority === 'recovery' ||
      codes.includes('LOW_READINESS') ||
      codes.includes('HIGH_FATIGUE') ||
      codes.includes('REST_DAY_RECOMMENDED') ||
      codes.includes('RECOVERY_WORKOUT_RECOMMENDED')
    ) {
      return 'The strongest signals point to recovery.';
    }

    if (
      coachDecision.priority === 'nutrition' ||
      codes.includes('LOW_NUTRITION_ADHERENCE') ||
      codes.includes('HIGH_NUTRITION_ADHERENCE')
    ) {
      return 'Nutrition consistency is the main signal.';
    }

    if (
      coachDecision.priority === 'training' ||
      codes.includes('INCREASE_INTENSITY_RECOMMENDED') ||
      codes.includes('DECREASE_INTENSITY_RECOMMENDED')
    ) {
      return 'Training adaptation is the main signal.';
    }

    if (
      coachDecision.priority === 'consistency' ||
      codes.includes('LOW_TRAINING_ADHERENCE') ||
      codes.includes('NO_RECENT_ACTIVITY') ||
      codes.includes('LONG_STREAK') ||
      codes.includes('GOOD_CONSISTENCY')
    ) {
      return 'Consistency is the main signal.';
    }

    return 'Momentum is steady.';
  }

  private resolveRecoveryTrend(
    healthContext: Pick<UserHealthContext, 'fatigueLevel' | 'recoveryTrend'>,
  ): 'improving' | 'stable' | 'needs_recovery' {
    if (healthContext.recoveryTrend) {
      return healthContext.recoveryTrend;
    }

    switch (healthContext.fatigueLevel) {
      case 'LOW':
        return 'improving';
      case 'HIGH':
        return 'needs_recovery';
      case 'MODERATE':
      default:
        return 'stable';
    }
  }

  private normalizeSentence(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    return normalized.endsWith('.') ? normalized : `${normalized}.`;
  }

  private buildPersonalizationTone(
    personalization?: PersonalizationPromptPayload,
  ): 'direct' | 'motivational' | 'educational' | 'balanced' {
    return personalization?.preferredCoachingStyle ?? 'balanced';
  }

  private applyTone(message: string, tone: string): string {
    switch (tone) {
      case 'direct':
        return message;
      case 'motivational':
        return `${message} Keep going.`;
      case 'educational':
        return `${message} The next step should make the reason clear.`;
      case 'balanced':
      default:
        return message;
    }
  }
}
