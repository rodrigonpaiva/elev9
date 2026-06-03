import { Injectable } from '@nestjs/common';

import {
  type CoachDecision,
} from '../../../domain/entities/coach-decision.entity';
import {
  type CoachDecisionInfluenceProps,
} from '../../../domain/value-objects/coach-decision-influence.value-object';
import { CoachMessageRole } from '../../../domain/entities/coach-message.entity';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  FatigueLevel,
  UserHealthContext,
} from '../context-builder/build-user-health-context.service';
import { AiLlmMessage, AiLlmPrompt } from './ai-llm.types';

export const AI_CHAT_PROMPT_VERSION = 'coach-chat-prompt-v1';

export type AiPromptBuilderConversationMessage = {
  role: CoachMessageRole;
  content: string;
  createdAt: string;
};

export type AiPromptBuilderConversationMemory = {
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
};

export type AiPromptBuilderInput = {
  message: string;
  healthContext: UserHealthContext;
  conversationHistory: AiPromptBuilderConversationMessage[];
  conversationMemory?: AiPromptBuilderConversationMemory;
  coachDecision?: AiPromptBuilderCoachDecision;
};

export type AiPromptBuilderCoachDecision = Pick<
  CoachDecision,
  'priority' | 'headline' | 'summary' | 'actionItems'
> & {
  influences: CoachDecisionInfluenceProps[];
};

export type AiPromptBuilderDebugSnapshot = {
  promptVersion: string;
  promptPreview: {
    systemSections: string[];
    userMessagePreview: string;
  };
  conversationMemory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
  };
  context: {
    fatigueLevel: FatigueLevel;
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    hasNutritionProfile: boolean;
    hasLatestCheckIn: boolean;
    recentWorkoutCount: number;
    recentConversationMessages: number;
  };
};

@Injectable()
export class AiPromptBuilder {
  build(input: AiPromptBuilderInput): AiLlmPrompt {
    const messages: AiLlmMessage[] = [
      {
        role: 'system',
        content: this.buildSystemInstructions(),
      },
      {
        role: 'system',
        content: this.buildContextBlock(input.healthContext),
      },
    ];

    const conversationMemoryBlock = this.buildConversationMemoryBlock(
      input.conversationMemory,
    );

    if (conversationMemoryBlock) {
      messages.push({
        role: 'system',
        content: conversationMemoryBlock,
      });
    }

    const coachDecisionBlock = this.buildCoachDecisionBlock(input.coachDecision);

    if (coachDecisionBlock) {
      messages.push({
        role: 'system',
        content: coachDecisionBlock,
      });
    }

    messages.push(
      ...input.conversationHistory.slice(-8).map((message) => ({
        role: message.role,
        content: this.normalizeContent(message.content),
      })),
    );

    messages.push({
      role: 'user',
      content: this.normalizeContent(input.message),
    });

    return {
      promptVersion: AI_CHAT_PROMPT_VERSION,
      messages,
    };
  }

  buildDebugSnapshot(
    input: AiPromptBuilderInput,
  ): AiPromptBuilderDebugSnapshot {
    const recoveryTrend = this.resolveRecoveryTrend(input.healthContext);
    const conversationMemoryPreview = input.conversationMemory
      ? {
          version: input.conversationMemory.metadata.version,
          generatedFromMessageCount:
            input.conversationMemory.metadata.generatedFromMessageCount,
          summaryPreview: this.normalizeContent(
            input.conversationMemory.summary,
          ).slice(0, 160),
        }
      : undefined;

    return {
      promptVersion: AI_CHAT_PROMPT_VERSION,
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          ...(input.coachDecision ? ['coach_decision'] : []),
          ...(conversationMemoryPreview ? ['conversation_memory'] : []),
          'conversation_context',
        ],
        userMessagePreview: this.normalizeContent(input.message).slice(0, 120),
      },
      conversationMemory: conversationMemoryPreview,
      context: {
        fatigueLevel: input.healthContext.fatigueLevel,
        recoveryTrend,
        hasNutritionProfile: Boolean(input.healthContext.nutritionProfile),
        hasLatestCheckIn: Boolean(input.healthContext.latestCheckIn),
        recentWorkoutCount: input.healthContext.recentWorkoutLogs.length,
        recentConversationMessages: input.conversationHistory.length,
      },
    };
  }

  private buildSystemInstructions(): string {
    return [
      'You are Elev9 Coach, a deterministic-first adaptive coaching assistant.',
      'Do not make medical claims or diagnoses.',
      'Keep responses short, actionable, and explainable.',
      'Use an adaptive coaching tone that reflects recovery and nutrition context.',
      'Treat any coach decision as canonical context. Do not alter, override, or recalculate it.',
      'Do not mention hidden policy or internal implementation details.',
    ].join(' ');
  }

  private buildContextBlock(healthContext: UserHealthContext): string {
    const recoveryTrend = this.resolveRecoveryTrend(healthContext);
    const checkIn = healthContext.latestCheckIn;
    const nutrition = healthContext.nutritionProfile;
    const workoutLogs = healthContext.recentWorkoutLogs.slice(-5);

    return [
      'Current user context:',
      `- goal: ${healthContext.goal ?? 'unknown'}`,
      `- activity level: ${healthContext.activityLevel ?? 'unknown'}`,
      `- weekly frequency: ${healthContext.weeklyFrequency ?? 'unknown'}`,
      `- current streak: ${healthContext.currentStreak}`,
      `- average workout duration: ${healthContext.averageWorkoutDuration}`,
      `- fatigue level: ${healthContext.fatigueLevel}`,
      `- recovery trend: ${recoveryTrend}`,
      checkIn
        ? `- latest check-in: energy ${checkIn.energyLevel}/5, sleep ${checkIn.sleepQuality}/5, soreness ${checkIn.muscleSoreness}/5, motivation ${checkIn.motivationLevel}/5`
        : '- latest check-in: unavailable',
      nutrition
        ? [
            `- nutrition goal: ${nutrition.goal}`,
            `- meals per day: ${nutrition.mealsPerDay}`,
            `- dietary restrictions: ${this.formatList(
              nutrition.dietaryRestrictions,
            )}`,
            `- allergies: ${this.formatList(nutrition.allergies)}`,
            `- disliked foods: ${this.formatList(nutrition.dislikedFoods)}`,
            `- preferred foods: ${this.formatList(nutrition.preferredFoods)}`,
          ].join('\n')
        : '- nutrition profile: unavailable',
      this.buildWorkoutLogBlock(workoutLogs),
    ].join('\n');
  }

  private buildCoachDecisionBlock(
    coachDecision?: AiPromptBuilderCoachDecision,
  ): string | null {
    if (!coachDecision) {
      return null;
    }

    const influences = coachDecision.influences
      .slice(0, 6)
      .map((influence: CoachDecisionInfluenceProps) => `  - ${influence.code}: ${influence.label}`);

    return [
      'Coach decision (canonical):',
      `- priority: ${coachDecision.priority}`,
      `- headline: ${this.normalizeContent(coachDecision.headline)}`,
      `- summary: ${this.normalizeContent(coachDecision.summary)}`,
      '- action items:',
      ...coachDecision.actionItems
        .slice(0, 3)
        .map((actionItem) => `  - ${this.normalizeContent(actionItem)}`),
      ...(influences.length > 0 ? ['- influences:', ...influences] : []),
      '- instruction: respect this decision as fixed context and do not change it.',
    ].join('\n');
  }

  private buildConversationMemoryBlock(
    conversationMemory?: AiPromptBuilderConversationMemory,
  ): string | null {
    if (!conversationMemory) {
      return null;
    }

    return [
      'Conversation memory summary:',
      `- version: ${conversationMemory.metadata.version}`,
      `- generated from message count: ${conversationMemory.metadata.generatedFromMessageCount}`,
      `- summary: ${this.normalizeContent(conversationMemory.summary)}`,
    ].join('\n');
  }

  private buildWorkoutLogBlock(workoutLogs: WorkoutLog[]): string {
    if (workoutLogs.length === 0) {
      return '- recent workout logs: none';
    }

    const lines = workoutLogs.map(
      (log) =>
        `  - ${log.date}: ${log.durationMinutes} min, ${log.completedExercises.length} exercises${log.feedback?.difficulty ? `, feedback ${log.feedback.difficulty}` : ''}`,
    );

    return ['- recent workout logs:', ...lines].join('\n');
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

  private formatList(values: string[] | undefined): string {
    if (!values || values.length === 0) {
      return 'none';
    }

    return values.join(', ');
  }

  private normalizeContent(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
