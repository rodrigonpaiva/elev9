import { Injectable } from '@nestjs/common';

import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachMessageRole } from '../../../domain/entities/coach-message.entity';
import { UserHealthContext } from '../context-builder/build-user-health-context.service';

export const COACH_CONVERSATION_MEMORY_VERSION = 'memory-v1';

export type CoachConversationMemorySummarizerMessage = {
  role: CoachMessageRole;
  content: string;
  createdAt: string;
};

export type CoachConversationMemorySummarizerInput = {
  healthContext: UserHealthContext;
  conversationMessages: CoachConversationMemorySummarizerMessage[];
  coachDecision?: CoachDecisionLike;
};

export type CoachConversationMemorySummaryResult = {
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
};

@Injectable()
export class CoachConversationMemorySummarizer {
  summarize(
    input: CoachConversationMemorySummarizerInput,
  ): CoachConversationMemorySummaryResult {
    const messages = input.conversationMessages.slice(-12);
    const latestUserMessage = this.findLatestUserMessage(messages);
    const concern = this.resolveConcern(latestUserMessage?.content ?? '');
    const recoveryTrend = this.resolveRecoveryTrend(input.healthContext);
    const nutritionGoal = input.healthContext.nutritionProfile?.goal ?? 'none';
    const mealsPerDay = input.healthContext.nutritionProfile?.mealsPerDay ?? 0;
    const workoutCount = input.healthContext.recentWorkoutLogs.length;
    const coachDecisionSummary = input.coachDecision
      ? this.buildCoachDecisionSummary(input.coachDecision)
      : null;

    const summary = [
      `goal=${this.normalizeValue(input.healthContext.goal ?? 'unknown')}`,
      `fatigue=${input.healthContext.fatigueLevel}`,
      `recovery=${recoveryTrend}`,
      `nutrition=${nutritionGoal}${nutritionGoal !== 'none' ? `/${mealsPerDay} meals` : ''}`,
      `workout_continuity=streak:${input.healthContext.currentStreak}, recent_workouts:${workoutCount}`,
      ...(coachDecisionSummary ? [coachDecisionSummary] : []),
      `user_concern=${concern}`,
    ].join('; ');

    return {
      summary,
      metadata: {
        generatedFromMessageCount: messages.length,
        version: COACH_CONVERSATION_MEMORY_VERSION,
      },
    };
  }

  private findLatestUserMessage(
    messages: CoachConversationMemorySummarizerMessage[],
  ): CoachConversationMemorySummarizerMessage | undefined {
    return [...messages].reverse().find((message) => message.role === 'user');
  }

  private resolveConcern(value: string): string {
    const normalized = value.toLowerCase();

    if (/(fatigue|tired|exhausted|sleep|sore|recovery)/.test(normalized)) {
      return 'recovery';
    }

    if (/(nutrition|meal|food|eat|protein|carb|diet)/.test(normalized)) {
      return 'nutrition';
    }

    if (/(train|workout|session|program|lift|exercise|plan)/.test(normalized)) {
      return 'training';
    }

    if (/(consisten|habit|routine|schedule)/.test(normalized)) {
      return 'consistency';
    }

    if (normalized.trim().length === 0) {
      return 'general';
    }

    return 'general';
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

  private buildCoachDecisionSummary(coachDecision: CoachDecisionLike): string {
    const actionItems = coachDecision.actionItems
      .slice(0, 3)
      .map((item) => this.normalizeValue(item))
      .join('|');

    return [
      `last_coach_decision=priority:${coachDecision.priority}`,
      `headline:${this.normalizeValue(coachDecision.headline)}`,
      `action_items:${actionItems || 'none'}`,
    ].join(', ');
  }

  private normalizeValue(value: string): string {
    return value.trim().replace(/\s+/g, '_');
  }
}

type CoachDecisionLike = Pick<
  CoachDecision,
  'priority' | 'headline' | 'actionItems'
>;
