import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { COACH_FEEDBACK_REPOSITORY } from './domain/repositories/coach-feedback.repository';
import { MongooseCoachFeedbackRepository } from './infrastructure/mongoose/mongoose-coach-feedback.repository';
import {
  COACH_FEEDBACK_MODEL_NAME,
  CoachFeedbackSchema,
} from './infrastructure/mongoose/coach-feedback.schema';
import { COACH_DECISION_REPOSITORY } from './domain/repositories/coach-decision.repository';
import { MongooseCoachDecisionRepository } from './infrastructure/mongoose/mongoose-coach-decision.repository';
import {
  COACH_DECISION_MODEL_NAME,
  CoachDecisionSchema,
} from './infrastructure/mongoose/coach-decision.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FitnessModule } from '../fitness/fitness.module';
import { ProgressModule } from '../progress/progress.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { GoalsModule } from '../goals/goals.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { TrainingModule } from '../training/training.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { BuildUserHealthContextService } from './application/services/context-builder/build-user-health-context.service';
import { CoachDecisionCalculatorService } from './application/services/coach-decision-calculator.service';
import { CoachDecisionDateService } from './application/services/coach-decision-date.service';
import { AiLlmConfigService } from './application/services/llm/ai-llm-config.service';
import { AiLlmService } from './application/services/llm/ai-llm.service';
import { AiPromptBuilder } from './application/services/llm/ai-prompt-builder.service';
import { AI_LLM_PROVIDER } from './application/services/llm/ai-llm.types';
import { CoachFeedbackGenerator } from './application/services/coach-feedback/coach-feedback-generator.service';
import { CoachChatReplyGenerator } from './application/services/chat/coach-chat-reply-generator.service';
import { CoachConversationMemorySummarizer } from './application/services/memory/coach-conversation-memory-summarizer.service';
import { CreateCoachChatUseCase } from './application/use-cases/create-coach-chat/create-coach-chat.use-case';
import { GetCoachChatDebugHistoryUseCase } from './application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.use-case';
import { GetCoachChatMemoryDebugUseCase } from './application/use-cases/get-coach-chat-memory-debug/get-coach-chat-memory-debug.use-case';
import { GetCoachChatPromptDebugUseCase } from './application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case';
import { GetCoachChatReplyPathDebugUseCase } from './application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case';
import { GetCoachChatDebugIndexUseCase } from './application/use-cases/get-coach-chat-debug-index/get-coach-chat-debug-index.use-case';
import { GetCoachFeedbackDebugHistoryUseCase } from './application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.use-case';
import { GetCoachFeedbackHistoryUseCase } from './application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case';
import { GetCoachChatHistoryUseCase } from './application/use-cases/get-coach-chat-history/get-coach-chat-history.use-case';
import { BuildCoachDecisionUseCase } from './application/use-cases/build-coach-decision/build-coach-decision.use-case';
import { GetCurrentCoachDecisionUseCase } from './application/use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCoachDecisionHistoryUseCase } from './application/use-cases/get-coach-decision-history/get-coach-decision-history.use-case';
import { GetTodayCoachDecisionUseCase } from './application/use-cases/get-today-coach-decision/get-today-coach-decision.use-case';
import { ReplayCoachDecisionUseCase } from './application/use-cases/replay-coach-decision/replay-coach-decision.use-case';
import { GenerateCoachFeedbackUseCase } from './application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case';
import { ReplayCoachFeedbackUseCase } from './application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case';
import { AiController } from './presentation/http/ai.controller';
import { CoachDecisionController } from './presentation/http/coach-decision.controller';
import { COACH_CONVERSATION_REPOSITORY } from './domain/repositories/coach-conversation.repository';
import { MongooseCoachConversationRepository } from './infrastructure/mongoose/mongoose-coach-conversation.repository';
import { COACH_CONVERSATION_MEMORY_REPOSITORY } from './domain/repositories/coach-conversation-memory.repository';
import { MongooseCoachConversationMemoryRepository } from './infrastructure/mongoose/mongoose-coach-conversation-memory.repository';
import {
  COACH_CONVERSATION_MODEL_NAME,
  CoachConversationSchema,
} from './infrastructure/mongoose/coach-conversation.schema';
import {
  COACH_CONVERSATION_MEMORY_MODEL_NAME,
  CoachConversationMemorySchema,
} from './infrastructure/mongoose/coach-conversation-memory.schema';
import { COACH_MESSAGE_REPOSITORY } from './domain/repositories/coach-message.repository';
import { MongooseCoachMessageRepository } from './infrastructure/mongoose/mongoose-coach-message.repository';
import {
  COACH_MESSAGE_MODEL_NAME,
  CoachMessageSchema,
} from './infrastructure/mongoose/coach-message.schema';
import { OpenAiLlmProvider } from './infrastructure/llm/openai-llm.provider';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    ProgressModule,
    NutritionModule,
    GoalsModule,
    RecoveryModule,
    TrainingModule,
    forwardRef(() => NotificationsModule),
    MongooseModule.forFeature([
      {
        name: COACH_FEEDBACK_MODEL_NAME,
        schema: CoachFeedbackSchema,
      },
      {
        name: COACH_DECISION_MODEL_NAME,
        schema: CoachDecisionSchema,
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
  controllers: [AiController, CoachDecisionController],
  providers: [
    AuthSessionGuard,
    PlatformDateService,
    BuildUserHealthContextService,
    BuildCoachDecisionUseCase,
    GetTodayCoachDecisionUseCase,
    GetCurrentCoachDecisionUseCase,
    GetCoachDecisionHistoryUseCase,
    ReplayCoachDecisionUseCase,
    CoachDecisionCalculatorService,
    CoachDecisionDateService,
    AiLlmConfigService,
    AiPromptBuilder,
    AiLlmService,
    CoachConversationMemorySummarizer,
    CoachFeedbackGenerator,
    CoachChatReplyGenerator,
    CreateCoachChatUseCase,
    GetCoachChatDebugHistoryUseCase,
    GetCoachChatMemoryDebugUseCase,
    GetCoachChatPromptDebugUseCase,
    GetCoachChatReplyPathDebugUseCase,
    GetCoachChatDebugIndexUseCase,
    GetCoachFeedbackDebugHistoryUseCase,
    GetCoachFeedbackHistoryUseCase,
    GetCoachChatHistoryUseCase,
    GenerateCoachFeedbackUseCase,
    ReplayCoachFeedbackUseCase,
    {
      provide: COACH_FEEDBACK_REPOSITORY,
      useClass: MongooseCoachFeedbackRepository,
    },
    {
      provide: COACH_DECISION_REPOSITORY,
      useClass: MongooseCoachDecisionRepository,
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
  exports: [
    BuildUserHealthContextService,
    COACH_DECISION_REPOSITORY,
    GetCurrentCoachDecisionUseCase,
    GenerateCoachFeedbackUseCase,
    CreateCoachChatUseCase,
    AiPromptBuilder,
    CoachChatReplyGenerator,
    CoachConversationMemorySummarizer,
  ],
})
export class AiModule {}
