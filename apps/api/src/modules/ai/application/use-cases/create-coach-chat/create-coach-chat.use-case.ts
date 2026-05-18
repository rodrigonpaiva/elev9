import { Logger, Inject, Injectable } from "@nestjs/common";

import {
  AiLlmService,
} from "../../services/llm/ai-llm.service";
import {
  AiPromptBuilder,
  type AiPromptBuilderConversationMessage,
} from "../../services/llm/ai-prompt-builder.service";
import { BuildUserHealthContextService } from "../../services/context-builder/build-user-health-context.service";
import { CoachChatReplyGenerator } from "../../services/chat/coach-chat-reply-generator.service";
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
  CoachConversationMemorySummarizer,
  COACH_CONVERSATION_MEMORY_VERSION,
} from "../../services/memory/coach-conversation-memory-summarizer.service";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  CREATE_COACH_CHAT_ERROR_CODES,
  CreateCoachChatError,
} from "./create-coach-chat.errors";
import { CreateCoachChatInput } from "./create-coach-chat.input";
import { CreateCoachChatOutput } from "./create-coach-chat.output";

@Injectable()
export class CreateCoachChatUseCase {
  private readonly logger = new Logger(CreateCoachChatUseCase.name);

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
    private readonly aiLlmService: AiLlmService,
    private readonly coachChatReplyGenerator: CoachChatReplyGenerator,
    private readonly coachConversationMemorySummarizer: CoachConversationMemorySummarizer,
  ) {}

  async execute(input: CreateCoachChatInput): Promise<CreateCoachChatOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const message =
      typeof input.message === "string" ? input.message.trim() : "";

    if (!authUserId) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    if (!message) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT,
        "Invalid chat message input.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateCoachChatError(
          CREATE_COACH_CHAT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      const existingConversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const conversation =
        existingConversation ??
        (await this.coachConversationRepository.create({
          userProfileId: userProfile.id,
        }));

      const conversationMemory =
        await this.coachConversationMemoryRepository.findByConversationId(
          conversation.id,
        );

      const conversationHistory = (
        existingConversation
          ? await this.coachMessageRepository.findByConversationId({
              conversationId: conversation.id,
              limit: 12,
            })
          : []
      )
        .slice()
        .reverse()
        .map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })) as AiPromptBuilderConversationMessage[];

      await this.coachMessageRepository.create({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });

      const prompt = this.aiPromptBuilder.build({
        message,
        healthContext,
        conversationHistory,
        conversationMemory: conversationMemory
          ? {
              summary: conversationMemory.summary,
              metadata: conversationMemory.metadata,
            }
          : undefined,
      });

      let reply:
        | {
            content: string;
            provider: string;
            model: string;
            promptVersion: string;
          }
        | null = null;
      let fallbackTriggered = false;

      try {
        reply = await this.aiLlmService.generateReply(prompt);
      } catch (_error) {
        fallbackTriggered = true;
        this.logger.warn("fallback activated");
      }

      if (!reply) {
        if (!fallbackTriggered) {
          this.logger.log("fallback activated");
        }
        const fallbackReply = this.coachChatReplyGenerator.generate({
          message,
          healthContext,
        });

        await this.coachMessageRepository.create({
          conversationId: conversation.id,
          role: "assistant",
          content: fallbackReply,
          metadata: {
            source: "heuristic",
          },
        });

        await this.updateConversationMemory({
          conversationId: conversation.id,
          healthContext,
          conversationHistory,
          userMessage: message,
          assistantReply: fallbackReply,
        });

        return {
          conversationId: conversation.id,
          reply: fallbackReply,
        };
      }

      await this.coachMessageRepository.create({
        conversationId: conversation.id,
        role: "assistant",
        content: reply.content,
        metadata: {
          source: "llm",
          provider: reply.provider,
          model: reply.model,
          promptVersion: reply.promptVersion,
        },
      });

      await this.updateConversationMemory({
        conversationId: conversation.id,
        healthContext,
        conversationHistory,
        userMessage: message,
        assistantReply: reply.content,
      });

      return {
        conversationId: conversation.id,
        reply: reply.content,
      };
    } catch (error) {
      if (error instanceof CreateCoachChatError) {
        throw error;
      }

      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private async updateConversationMemory(input: {
    conversationId: string;
    healthContext: Awaited<
      ReturnType<BuildUserHealthContextService["build"]>
    >;
    conversationHistory: AiPromptBuilderConversationMessage[];
    userMessage: string;
    assistantReply: string;
  }): Promise<void> {
    const memory = this.coachConversationMemorySummarizer.summarize({
      healthContext: input.healthContext,
      conversationMessages: [
        ...input.conversationHistory,
        {
          role: "user",
          content: input.userMessage,
          createdAt: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: input.assistantReply,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await this.coachConversationMemoryRepository.upsertByConversationId({
      conversationId: input.conversationId,
      summary: memory.summary,
      metadata: {
        generatedFromMessageCount: memory.metadata.generatedFromMessageCount,
        version:
          memory.metadata.version ?? COACH_CONVERSATION_MEMORY_VERSION,
      },
    });
  }
}
