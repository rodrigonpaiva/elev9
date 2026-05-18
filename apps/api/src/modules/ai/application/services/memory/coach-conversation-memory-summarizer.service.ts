import { Injectable } from '@nestjs/common';

import { CoachMessageRole } from '../../../domain/entities/coach-message.entity';
import {
  FatigueLevel,
  UserHealthContext,
} from '../context-builder/build-user-health-context.service';

export const COACH_CONVERSATION_MEMORY_VERSION = 'memory-v1';

export type CoachConversationMemorySummarizerMessage = {
  role: CoachMessageRole;
  content: string;
  createdAt: string;
};

export type CoachConversationMemorySummarizerInput = {
  healthContext: UserHealthContext;
  conversationMessages: CoachConversationMemorySummarizerMessage[];
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
    const recoveryTrend = this.resolveRecoveryTrend(
      input.healthContext.fatigueLevel,
    );
    const nutritionGoal = input.healthContext.nutritionProfile?.goal ?? 'none';
    const mealsPerDay = input.healthContext.nutritionProfile?.mealsPerDay ?? 0;
    const workoutCount = input.healthContext.recentWorkoutLogs.length;

    const summary = [
      `goal=${this.normalizeValue(input.healthContext.goal ?? 'unknown')}`,
      `fatigue=${input.healthContext.fatigueLevel}`,
      `recovery=${recoveryTrend}`,
      `nutrition=${nutritionGoal}${nutritionGoal !== 'none' ? `/${mealsPerDay} meals` : ''}`,
      `workout_continuity=streak:${input.healthContext.currentStreak}, recent_workouts:${workoutCount}`,
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
    fatigueLevel: FatigueLevel,
  ): 'improving' | 'stable' | 'needs_recovery' {
    switch (fatigueLevel) {
      case 'LOW':
        return 'improving';
      case 'HIGH':
        return 'needs_recovery';
      case 'MODERATE':
      default:
        return 'stable';
    }
  }

  private normalizeValue(value: string): string {
    return value.trim().replace(/\s+/g, '_');
  }
}
