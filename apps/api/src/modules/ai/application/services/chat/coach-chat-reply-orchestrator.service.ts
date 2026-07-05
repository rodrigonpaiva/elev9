import { Injectable, Logger } from '@nestjs/common';

import { LLMCancelledError } from '../llm/ai-llm.errors';
import { AiLlmPrompt } from '../llm/ai-llm.types';
import { AiLlmService } from '../llm/ai-llm.service';
import { CoachChatReplyGenerator } from './coach-chat-reply-generator.service';
import { CoachChatReply } from '../../use-cases/create-coach-chat/create-coach-chat.types';
import type {
  CoachChatLoadedContext,
  CreateCoachChatStreamOptions,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';

@Injectable()
export class CoachChatReplyOrchestratorService {
  private readonly logger = new Logger(CoachChatReplyOrchestratorService.name);

  constructor(
    private readonly aiLlmService: AiLlmService,
    private readonly coachChatReplyGenerator: CoachChatReplyGenerator,
  ) {}

  async execute(input: {
    prompt: AiLlmPrompt;
    context: CoachChatLoadedContext;
    message: string;
    options?: CreateCoachChatStreamOptions & { streaming?: boolean };
  }): Promise<CoachChatReply> {
    let reply: {
      content: string;
      provider: string;
      model: string;
      promptVersion: string;
    } | null = null;
    let fallbackTriggered = false;
    let streamEmittedDelta = false;
    const shouldStream = Boolean(
      input.options?.streaming && this.aiLlmService.canStream(input.prompt),
    );

    try {
      if (shouldStream) {
        reply = await this.aiLlmService.streamReply(
          {
            ...input.prompt,
            signal: input.prompt.signal,
          },
          (delta) => {
            if (!delta) {
              return;
            }

            streamEmittedDelta = true;
            input.options?.onDelta?.(delta);
          },
        );
      } else {
        reply = await this.aiLlmService.generateReply({
          ...input.prompt,
          signal: input.prompt.signal,
        });
      }
    } catch (error) {
      if (error instanceof LLMCancelledError) {
        throw error;
      }

      fallbackTriggered = true;
      this.logger.warn('fallback activated');
    }

    if (!reply) {
      if (!fallbackTriggered) {
        this.logger.log('fallback activated');
      }

      const fallbackReply = this.coachChatReplyGenerator.generate({
        message: input.message,
        healthContext: input.context.healthContext,
        ...(input.context.coachDecision
          ? { coachDecision: input.context.coachDecision }
          : {}),
        ...(input.context.notification
          ? { notification: input.context.notification }
          : {}),
        ...(input.context.habit ? { habit: input.context.habit } : {}),
        ...(input.context.personalization
          ? { personalization: input.context.personalization }
          : {}),
      });

      if (input.options?.onDelta && !streamEmittedDelta) {
        input.options.onDelta(fallbackReply);
      }

      return {
        content: fallbackReply,
        source: 'heuristic',
      };
    }

    if (input.options?.onDelta && !streamEmittedDelta) {
      input.options.onDelta(reply.content);
    }

    return {
      content: reply.content,
      source: 'llm',
      provider: reply.provider,
      model: reply.model,
      promptVersion: reply.promptVersion,
    };
  }
}
