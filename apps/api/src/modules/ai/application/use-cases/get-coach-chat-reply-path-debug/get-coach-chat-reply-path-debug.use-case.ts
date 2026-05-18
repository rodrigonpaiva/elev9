import { Inject, Injectable } from "@nestjs/common";

import { BuildUserHealthContextService } from "../../services/context-builder/build-user-health-context.service";
import { AiLlmConfigService } from "../../services/llm/ai-llm-config.service";
import { AiPromptBuilder } from "../../services/llm/ai-prompt-builder.service";
import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from "../../../domain/repositories/coach-conversation-memory.repository";
import {
  COACH_CONVERSATION_REPOSITORY,
  CoachConversationRepository,
} from "../../../domain/repositories/coach-conversation.repository";
import {
  COACH_MESSAGE_REPOSITORY,
  CoachMessageRepository,
} from "../../../domain/repositories/coach-message.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES,
  GetCoachChatReplyPathDebugError,
} from "./get-coach-chat-reply-path-debug.errors";
import { GetCoachChatReplyPathDebugInput } from "./get-coach-chat-reply-path-debug.input";
import { GetCoachChatReplyPathDebugOutput } from "./get-coach-chat-reply-path-debug.output";

@Injectable()
export class GetCoachChatReplyPathDebugUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_MESSAGE_REPOSITORY)
    private readonly coachMessageRepository: CoachMessageRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly aiPromptBuilder: AiPromptBuilder,
    private readonly aiLlmConfigService: AiLlmConfigService,
  ) {}

  async execute(
    input: GetCoachChatReplyPathDebugInput,
  ): Promise<GetCoachChatReplyPathDebugOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetCoachChatReplyPathDebugError(
        GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachChatReplyPathDebugError(
          GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      const conversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      const messages = conversation
        ? await this.coachMessageRepository.findByConversationId({
            conversationId: conversation.id,
            limit: 6,
          })
        : [];
      const conversationMemory = conversation
        ? await this.coachConversationMemoryRepository.findByConversationId(
            conversation.id,
          )
        : null;

      const latestUserMessage =
        [...messages]
          .reverse()
          .find((message) => message.role === "user")?.content ??
        messages.at(-1)?.content ??
        "";

      const promptSnapshot = this.aiPromptBuilder.buildDebugSnapshot({
        message: latestUserMessage,
        healthContext,
        conversationHistory: messages
          .slice()
          .reverse()
          .map((message) => ({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
          })),
        conversationMemory: conversationMemory
          ? {
              summary: conversationMemory.summary,
              metadata: conversationMemory.metadata,
            }
          : undefined,
      });

      const llmEnabled = this.aiLlmConfigService.isEnabled();
      const provider = this.aiLlmConfigService.getProvider();
      const model = this.aiLlmConfigService.getModel();
      const apiKey = this.aiLlmConfigService.getApiKey();

      const fallbackReason = !llmEnabled
        ? "llm_disabled"
        : provider !== "openai"
          ? "invalid_provider"
          : apiKey.trim()
            ? undefined
            : "provider_failure";

      return {
        replyPath: {
          source: fallbackReason ? "heuristic" : "llm",
          fallbackActivated: Boolean(fallbackReason),
          ...(fallbackReason ? { fallbackReason } : {}),
          llm: {
            enabled: llmEnabled,
            provider,
            model,
            promptVersion: promptSnapshot.promptVersion,
          },
        },
        context: promptSnapshot.context,
        promptPreview: promptSnapshot.promptPreview,
        ...(promptSnapshot.conversationMemory
          ? { conversationMemory: promptSnapshot.conversationMemory }
          : {}),
      };
    } catch (error) {
      if (error instanceof GetCoachChatReplyPathDebugError) {
        throw error;
      }

      throw new GetCoachChatReplyPathDebugError(
        GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }
}
