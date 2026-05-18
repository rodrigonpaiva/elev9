import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { COACH_FEEDBACK_REPOSITORY } from "./domain/repositories/coach-feedback.repository";
import { MongooseCoachFeedbackRepository } from "./infrastructure/mongoose/mongoose-coach-feedback.repository";
import {
  COACH_FEEDBACK_MODEL_NAME,
  CoachFeedbackSchema,
} from "./infrastructure/mongoose/coach-feedback.schema";
import { AuthModule } from "../auth/auth.module";
import { FITNESS_PROFILE_REPOSITORY } from "../fitness/domain/repositories/fitness-profile.repository";
import { MongooseFitnessProfileRepository } from "../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository";
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from "../fitness/infrastructure/mongoose/fitness-profile.schema";
import { NUTRITION_PROFILE_REPOSITORY } from "../nutrition/domain/repositories/nutrition-profile.repository";
import { MongooseNutritionProfileRepository } from "../nutrition/infrastructure/mongoose/mongoose-nutrition-profile.repository";
import {
  NUTRITION_PROFILE_MODEL_NAME,
  NutritionProfileSchema,
} from "../nutrition/infrastructure/mongoose/nutrition-profile.schema";
import { DAILY_CHECK_IN_REPOSITORY } from "../progress/domain/repositories/daily-check-in.repository";
import { WORKOUT_LOG_REPOSITORY } from "../progress/domain/repositories/workout-log.repository";
import { CLOCK } from "../progress/domain/services/clock.service";
import { MongooseDailyCheckInRepository } from "../progress/infrastructure/mongoose/mongoose-daily-check-in.repository";
import { MongooseWorkoutLogRepository } from "../progress/infrastructure/mongoose/mongoose-workout-log.repository";
import { SystemClockService } from "../progress/infrastructure/system-clock.service";
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInSchema,
} from "../progress/infrastructure/mongoose/daily-check-in.schema";
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogSchema,
} from "../progress/infrastructure/mongoose/workout-log.schema";
import { TRAINING_PLAN_REPOSITORY } from "../training/domain/repositories/training-plan.repository";
import { MongooseTrainingPlanRepository } from "../training/infrastructure/mongoose/mongoose-training-plan.repository";
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from "../training/infrastructure/mongoose/training-plan.schema";
import { USER_PROFILE_REPOSITORY } from "../users/domain/repositories/user-profile.repository";
import { MongooseUserProfileRepository } from "../users/infrastructure/mongoose/mongoose-user-profile.repository";
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from "../users/infrastructure/mongoose/user-profile.schema";
import { AuthSessionGuard } from "../users/presentation/http/guards/auth-session.guard";
import { BuildUserHealthContextService } from "./application/services/context-builder/build-user-health-context.service";
import { AiLlmConfigService } from "./application/services/llm/ai-llm-config.service";
import { AiLlmService } from "./application/services/llm/ai-llm.service";
import { AiPromptBuilder } from "./application/services/llm/ai-prompt-builder.service";
import { AI_LLM_PROVIDER } from "./application/services/llm/ai-llm.types";
import { CoachFeedbackGenerator } from "./application/services/coach-feedback/coach-feedback-generator.service";
import { CoachChatReplyGenerator } from "./application/services/chat/coach-chat-reply-generator.service";
import { CoachConversationMemorySummarizer } from "./application/services/memory/coach-conversation-memory-summarizer.service";
import { CreateCoachChatUseCase } from "./application/use-cases/create-coach-chat/create-coach-chat.use-case";
import { GetCoachChatDebugHistoryUseCase } from "./application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.use-case";
import { GetCoachChatPromptDebugUseCase } from "./application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case";
import { GetCoachChatReplyPathDebugUseCase } from "./application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case";
import { GetCoachChatDebugIndexUseCase } from "./application/use-cases/get-coach-chat-debug-index/get-coach-chat-debug-index.use-case";
import { GetCoachFeedbackDebugHistoryUseCase } from "./application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.use-case";
import { GetCoachFeedbackHistoryUseCase } from "./application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import { GetCoachChatHistoryUseCase } from "./application/use-cases/get-coach-chat-history/get-coach-chat-history.use-case";
import { GenerateCoachFeedbackUseCase } from "./application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import { ReplayCoachFeedbackUseCase } from "./application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case";
import { AiController } from "./presentation/http/ai.controller";
import { COACH_CONVERSATION_REPOSITORY } from "./domain/repositories/coach-conversation.repository";
import { MongooseCoachConversationRepository } from "./infrastructure/mongoose/mongoose-coach-conversation.repository";
import { COACH_CONVERSATION_MEMORY_REPOSITORY } from "./domain/repositories/coach-conversation-memory.repository";
import { MongooseCoachConversationMemoryRepository } from "./infrastructure/mongoose/mongoose-coach-conversation-memory.repository";
import {
  COACH_CONVERSATION_MODEL_NAME,
  CoachConversationSchema,
} from "./infrastructure/mongoose/coach-conversation.schema";
import {
  COACH_CONVERSATION_MEMORY_MODEL_NAME,
  CoachConversationMemorySchema,
} from "./infrastructure/mongoose/coach-conversation-memory.schema";
import { COACH_MESSAGE_REPOSITORY } from "./domain/repositories/coach-message.repository";
import { MongooseCoachMessageRepository } from "./infrastructure/mongoose/mongoose-coach-message.repository";
import {
  COACH_MESSAGE_MODEL_NAME,
  CoachMessageSchema,
} from "./infrastructure/mongoose/coach-message.schema";
import { OpenAiLlmProvider } from "./infrastructure/llm/openai-llm.provider";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: USER_PROFILE_MODEL_NAME,
        schema: UserProfileSchema,
      },
      {
        name: FITNESS_PROFILE_MODEL_NAME,
        schema: FitnessProfileSchema,
      },
      {
        name: NUTRITION_PROFILE_MODEL_NAME,
        schema: NutritionProfileSchema,
      },
      {
        name: TRAINING_PLAN_MODEL_NAME,
        schema: TrainingPlanSchema,
      },
      {
        name: WORKOUT_LOG_MODEL_NAME,
        schema: WorkoutLogSchema,
      },
      {
        name: DAILY_CHECK_IN_MODEL_NAME,
        schema: DailyCheckInSchema,
      },
      {
        name: COACH_FEEDBACK_MODEL_NAME,
        schema: CoachFeedbackSchema,
      },
      {
        name: COACH_CONVERSATION_MODEL_NAME,
        schema: CoachConversationSchema,
      },
      {
        name: COACH_CONVERSATION_MEMORY_MODEL_NAME,
        schema: CoachConversationMemorySchema,
      },
      {
        name: COACH_MESSAGE_MODEL_NAME,
        schema: CoachMessageSchema,
      },
    ]),
  ],
  controllers: [AiController],
  providers: [
    AuthSessionGuard,
    BuildUserHealthContextService,
    AiLlmConfigService,
    AiPromptBuilder,
    AiLlmService,
    CoachConversationMemorySummarizer,
    CoachFeedbackGenerator,
    CoachChatReplyGenerator,
    CreateCoachChatUseCase,
    GetCoachChatDebugHistoryUseCase,
    GetCoachChatPromptDebugUseCase,
    GetCoachChatReplyPathDebugUseCase,
    GetCoachChatDebugIndexUseCase,
    GetCoachFeedbackDebugHistoryUseCase,
    GetCoachFeedbackHistoryUseCase,
    GetCoachChatHistoryUseCase,
    GenerateCoachFeedbackUseCase,
    ReplayCoachFeedbackUseCase,
    {
      provide: CLOCK,
      useClass: SystemClockService,
    },
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
    {
      provide: FITNESS_PROFILE_REPOSITORY,
      useClass: MongooseFitnessProfileRepository,
    },
    {
      provide: NUTRITION_PROFILE_REPOSITORY,
      useClass: MongooseNutritionProfileRepository,
    },
    {
      provide: TRAINING_PLAN_REPOSITORY,
      useClass: MongooseTrainingPlanRepository,
    },
    {
      provide: WORKOUT_LOG_REPOSITORY,
      useClass: MongooseWorkoutLogRepository,
    },
    {
      provide: DAILY_CHECK_IN_REPOSITORY,
      useClass: MongooseDailyCheckInRepository,
    },
    {
      provide: COACH_FEEDBACK_REPOSITORY,
      useClass: MongooseCoachFeedbackRepository,
    },
    {
      provide: COACH_CONVERSATION_REPOSITORY,
      useClass: MongooseCoachConversationRepository,
    },
    {
      provide: COACH_CONVERSATION_MEMORY_REPOSITORY,
      useClass: MongooseCoachConversationMemoryRepository,
    },
    {
      provide: COACH_MESSAGE_REPOSITORY,
      useClass: MongooseCoachMessageRepository,
    },
    {
      provide: AI_LLM_PROVIDER,
      useClass: OpenAiLlmProvider,
    },
  ],
})
export class AiModule {}
