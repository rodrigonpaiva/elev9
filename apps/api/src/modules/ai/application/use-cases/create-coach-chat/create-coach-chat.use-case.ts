import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

import { AiPromptBuilder } from '../../services/llm/ai-prompt-builder.service';
import { AiRolloutService } from '../../services/governance/ai-rollout.service';
import { AI_COACH_CHAT_PROMPT_ID } from '../../services/governance/ai-governance.types';
import { LLMCancelledError } from '../../services/llm/ai-llm.errors';
import { CoachChatContextLoaderService } from '../../services/chat/coach-chat-context-loader.service';
import { CoachChatMemoryUpdaterService } from '../../services/chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../../services/chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from '../../services/chat/coach-chat-reply-orchestrator.service';
import { AgentRuntimeService } from '../../services/agent/agent-runtime.service';
import { CreateCoachChatInput } from './create-coach-chat.input';
import { CreateCoachChatOutput } from './create-coach-chat.output';
import {
  CREATE_COACH_CHAT_ERROR_CODES,
  CreateCoachChatError,
} from './create-coach-chat.errors';
import type { CreateCoachChatStreamOptions } from './create-coach-chat.types';

@Injectable()
export class CreateCoachChatUseCase {
  private readonly logger = new Logger(CreateCoachChatUseCase.name);

  constructor(
    private readonly coachChatContextLoaderService: CoachChatContextLoaderService,
    private readonly coachChatPersistenceService: CoachChatPersistenceService,
    private readonly coachChatReplyOrchestratorService: CoachChatReplyOrchestratorService,
    private readonly coachChatMemoryUpdaterService: CoachChatMemoryUpdaterService,
    private readonly aiPromptBuilder: AiPromptBuilder,
    private readonly aiRolloutService: AiRolloutService,
    private readonly agentRuntimeService?: AgentRuntimeService,
  ) {}

  async execute(input: CreateCoachChatInput): Promise<CreateCoachChatOutput> {
    return this.executeCoachChat(input);
  }

  async executeStream(
    input: CreateCoachChatInput,
    options: CreateCoachChatStreamOptions = {},
  ): Promise<CreateCoachChatOutput> {
    return this.executeCoachChat(input, {
      onDelta: options.onDelta,
      streaming: true,
    });
  }

  private async executeCoachChat(
    input: CreateCoachChatInput,
    options: CreateCoachChatStreamOptions & { streaming?: boolean } = {},
  ): Promise<CreateCoachChatOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const message =
      typeof input.message === 'string' ? input.message.trim() : '';

    if (!authUserId) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!message) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT,
        'Invalid chat message input.',
      );
    }

    try {
      const context = await this.coachChatContextLoaderService.load(authUserId);
      const conversationState =
        await this.coachChatPersistenceService.resolveConversationState(
          context.userProfileId,
        );
      const userIdHash = this.hashValue(context.userProfileId);
      const experiment = this.aiRolloutService.resolveCoachChatAssignment({
        authUserId,
        userIdHash,
        promptId: AI_COACH_CHAT_PROMPT_ID,
      });
      const trace = {
        conversationId: conversationState.conversationId,
        userIdHash,
        experimentId: experiment.experimentId,
        canaryBucket: experiment.canaryBucket,
        rolloutVariant: experiment.rolloutVariant,
      };

      if (this.agentRuntimeService?.isEnabled()) {
        const agentResponse = await this.agentRuntimeService.execute(
          {
            authUserId,
            message,
            signal: input.signal,
          },
          {
            streaming: Boolean(options.streaming),
            ...(options.onDelta ? { onDelta: options.onDelta } : {}),
          },
        );

        return {
          conversationId: agentResponse.conversationId,
          reply: agentResponse.assistantText,
        };
      }

      await this.coachChatPersistenceService.persistUserMessage(
        conversationState.conversationId,
        message,
      );

      const prompt = this.aiPromptBuilder.build({
        message,
        healthContext: context.healthContext,
        conversationHistory: conversationState.conversationHistory,
        trace,
        experiment,
        ...(conversationState.conversationMemory
          ? { conversationMemory: conversationState.conversationMemory }
          : {}),
        ...(context.coachDecision
          ? { coachDecision: context.coachDecision }
          : {}),
        ...(context.notification ? { notification: context.notification } : {}),
        ...(context.habit ? { habit: context.habit } : {}),
        ...(context.personalization
          ? { personalization: context.personalization }
          : {}),
      });

      const reply = await this.coachChatReplyOrchestratorService.execute({
        prompt,
        context,
        message,
        options,
      });

      await this.coachChatPersistenceService.persistAssistantMessage(
        conversationState.conversationId,
        reply,
      );

      await this.coachChatMemoryUpdaterService.update({
        conversationId: conversationState.conversationId,
        healthContext: context.healthContext,
        conversationHistory: conversationState.conversationHistory,
        userMessage: message,
        assistantReply: reply.content,
        ...(context.coachDecision
          ? { coachDecision: context.coachDecision }
          : {}),
        ...(context.notificationMemory
          ? { notification: context.notificationMemory }
          : {}),
        ...(context.habitMemory ? { habit: context.habitMemory } : {}),
        ...(context.personalizationMemory
          ? { personalization: context.personalizationMemory }
          : {}),
      });

      return {
        conversationId: conversationState.conversationId,
        reply: reply.content,
      };
    } catch (error) {
      if (error instanceof LLMCancelledError) {
        throw error;
      }

      if (error instanceof CreateCoachChatError) {
        throw error;
      }

      this.logger.error(
        'chat execution failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
