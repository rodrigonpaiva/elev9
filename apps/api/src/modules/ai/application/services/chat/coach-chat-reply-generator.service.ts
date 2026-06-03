import { Injectable } from '@nestjs/common';

import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionInfluenceProps } from '../../../domain/value-objects/coach-decision-influence.value-object';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';

type UserHealthContext = Awaited<
  ReturnType<BuildUserHealthContextService['build']>
>;

@Injectable()
export class CoachChatReplyGenerator {
  generate(input: {
    message: string;
    healthContext: UserHealthContext;
    coachDecision?: CoachDecisionLike;
  }): string {
    const normalizedMessage = input.message.trim().toLowerCase();
    const asksAboutTraining =
      normalizedMessage.includes('train') ||
      normalizedMessage.includes('workout') ||
      normalizedMessage.includes('session');
    const coachDecisionReply = this.buildCoachDecisionReply(input.coachDecision);

    if (coachDecisionReply) {
      return coachDecisionReply;
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

    if (
      input.healthContext.fatigueLevel === 'HIGH' ||
      recoveryTrend === 'needs_recovery' ||
      hasLowSleep ||
      hasHighSoreness
    ) {
      return asksAboutTraining
        ? "Your recovery signals suggest keeping today's session lighter."
        : "Your recovery signals suggest keeping today's session lighter.";
    }

    if (
      nutritionProfile?.goal === 'muscle_gain' &&
      input.healthContext.fatigueLevel === 'LOW' &&
      latestCheckIn &&
      latestCheckIn.motivationLevel >= 4
    ) {
      return 'Your recent consistency looks strong. This may be a good moment for controlled progression.';
    }

    if (
      nutritionProfile?.mealsPerDay !== undefined &&
      nutritionProfile.mealsPerDay <= 2
    ) {
      return 'Keeping your meals consistent today will support recovery and training.';
    }

    if (hasLowMotivation || input.healthContext.currentStreak >= 3) {
      return 'Your recent consistency looks steady. Keep the routine simple and repeatable today.';
    }

    return 'Your context looks steady. Keep the routine consistent and check in after your session.';
  }

  private buildCoachDecisionReply(
    coachDecision?: CoachDecisionLike,
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

  private buildInfluenceCue(coachDecision: CoachDecisionLike): string {
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
}

type CoachDecisionLike = Pick<
  CoachDecision,
  'priority' | 'headline' | 'summary' | 'actionItems'
> & {
  influences: CoachDecisionInfluenceProps[];
};
