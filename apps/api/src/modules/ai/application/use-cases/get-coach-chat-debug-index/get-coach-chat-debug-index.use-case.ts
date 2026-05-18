import { Injectable } from "@nestjs/common";

import { GetCoachChatDebugHistoryUseCase } from "../get-coach-chat-debug-history/get-coach-chat-debug-history.use-case";
import { GetCoachChatDebugHistoryError } from "../get-coach-chat-debug-history/get-coach-chat-debug-history.errors";
import { GetCoachChatMemoryDebugUseCase } from "../get-coach-chat-memory-debug/get-coach-chat-memory-debug.use-case";
import { GetCoachChatMemoryDebugError } from "../get-coach-chat-memory-debug/get-coach-chat-memory-debug.errors";
import { GetCoachChatPromptDebugUseCase } from "../get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case";
import { GetCoachChatPromptDebugError } from "../get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.errors";
import { GetCoachChatReplyPathDebugUseCase } from "../get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case";
import { GetCoachChatReplyPathDebugError } from "../get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.errors";
import {
  GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES,
  GetCoachChatDebugIndexError,
} from "./get-coach-chat-debug-index.errors";
import { GetCoachChatDebugIndexInput } from "./get-coach-chat-debug-index.input";
import { GetCoachChatDebugIndexOutput } from "./get-coach-chat-debug-index.output";

@Injectable()
export class GetCoachChatDebugIndexUseCase {
  constructor(
    private readonly getCoachChatDebugHistoryUseCase: GetCoachChatDebugHistoryUseCase,
    private readonly getCoachChatMemoryDebugUseCase: GetCoachChatMemoryDebugUseCase,
    private readonly getCoachChatPromptDebugUseCase: GetCoachChatPromptDebugUseCase,
    private readonly getCoachChatReplyPathDebugUseCase: GetCoachChatReplyPathDebugUseCase,
  ) {}

  async execute(
    input: GetCoachChatDebugIndexInput,
  ): Promise<GetCoachChatDebugIndexOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetCoachChatDebugIndexError(
        GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const [history, memory, prompt, replyPath] = await Promise.all([
        this.getCoachChatDebugHistoryUseCase.execute({
          authUserId,
          limit: 10,
        }),
        this.getCoachChatMemoryDebugUseCase.execute({ authUserId }),
        this.getCoachChatPromptDebugUseCase.execute({ authUserId }),
        this.getCoachChatReplyPathDebugUseCase.execute({ authUserId }),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        replyPath: replyPath.replyPath,
        llm: {
          ...prompt.llm,
          promptVersion: prompt.promptVersion,
        },
        promptVersion: prompt.promptVersion,
        promptPreview: {
          systemSections: prompt.promptPreview.systemSections,
        },
        ...(memory.memory
          ? {
              memoryPreview: {
                version: memory.memory.version,
                generatedFromMessageCount:
                  memory.memory.generatedFromMessageCount,
                summaryPreview: memory.memory.summaryPreview,
                metadata: memory.memory.metadata,
                updatedAt: memory.memory.updatedAt,
              },
            }
          : {}),
        context: {
          fatigueLevel: prompt.context.fatigueLevel,
          recoveryTrend: prompt.context.recoveryTrend,
          hasNutritionProfile: prompt.context.hasNutritionProfile,
          recentWorkoutCount: prompt.context.recentWorkoutCount,
        },
        recentMessages: history.messages,
      };
    } catch (error) {
      if (
        error instanceof GetCoachChatDebugIndexError ||
        error instanceof GetCoachChatDebugHistoryError ||
        error instanceof GetCoachChatMemoryDebugError ||
        error instanceof GetCoachChatPromptDebugError ||
        error instanceof GetCoachChatReplyPathDebugError
      ) {
        throw error;
      }

      throw new GetCoachChatDebugIndexError(
        GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }
}
