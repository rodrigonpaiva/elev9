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
import { HabitsModule } from '../habits/habits.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { TrainingModule } from '../training/training.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { BuildUserHealthContextService } from './application/services/context-builder/build-user-health-context.service';
import { CoachChatContextLoaderService } from './application/services/chat/coach-chat-context-loader.service';
import { CoachChatMemoryUpdaterService } from './application/services/chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from './application/services/chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from './application/services/chat/coach-chat-reply-orchestrator.service';
import { AgentRuntimeConfigService } from './application/services/agent/agent-runtime.config';
import { AgentContextOrchestratorService } from './application/services/agent/agent-context-orchestrator.service';
import { AgentContextSelectionPolicy } from './application/services/agent/agent-context-selection.policy';
import { AgentIntentClassifierService } from './application/services/agent/agent-intent-classifier.service';
import { AgentExecutionEngineService } from './application/services/agent/execution/agent-execution.engine.service';
import { AgentExecutionPolicy } from './application/services/agent/execution/agent-execution.policy';
import { AgentExecutionValidator } from './application/services/agent/execution/agent-execution.validator';
import { AgentMemoryPolicy } from './application/services/agent/memory/agent-memory.policy';
import { AgentMemoryService } from './application/services/agent/memory/agent-memory.service';
import { AgentTraceService } from './application/services/agent/observability/agent-trace.service';
import { AgentPlanningEngineService } from './application/services/agent/planning/agent-planning-engine.service';
import { AgentPlanningPolicy } from './application/services/agent/planning/agent-planning.policy';
import { AgentPlanValidator } from './application/services/agent/planning/agent-plan-validator.service';
import { AgentPolicyEngineService } from './application/services/agent/policies/agent-policy.engine.service';
import { AgentPolicyRegistry } from './application/services/agent/policies/agent-policy.registry';
import { CoachExpertRegistry } from './application/services/experts/coach-expert.registry';
import {
  CoachExpertRoutingPolicy,
  CoachExpertRouterService,
} from './application/services/experts/coach-expert-router';
import {
  CoachExpertCompositionPolicy,
  CoachExpertCompositionService,
} from './application/services/experts/composition/coach-expert-composition';
import { CoachExpertObservabilityService } from './application/services/experts/observability/coach-expert-observability';
import {
  CoachExplainabilityPolicy,
  CoachExplainabilityService,
} from './application/services/explainability/coach-explainability';
import {
  CoachPersonaEnginePolicy,
  CoachPersonaEngineService,
} from './application/services/persona/coach-persona-engine';
import { CoachIntelligenceConfigService } from './application/services/coach-intelligence/coach-intelligence.config';
import { CoachIntelligenceContextAssemblerService } from './application/services/coach-intelligence/coach-intelligence.context-assembler.service';
import { CoachIntelligenceFreshnessPolicy } from './application/services/coach-intelligence/coach-intelligence.policy';
import { CoachIntelligenceObservabilityService } from './application/services/coach-intelligence/coach-intelligence.observability.service';
import { CoachIntelligenceMapperService } from './application/services/coach-intelligence/coach-intelligence.mapper.service';
import { CoachIntelligenceSourceAdaptersService } from './application/services/coach-intelligence/coach-intelligence.source-adapters.service';
import { CoachIntelligenceAggregationService } from './application/services/coach-intelligence/coach-intelligence.aggregation.service';
import { AgentToolRegistryService } from './application/services/agent/tools/agent-tool-registry.service';
import { AgentToolExecutionPolicy } from './application/services/agent/tools/agent-tool-execution.policy';
import { AgentToolExecutorService } from './application/services/agent/tools/agent-tool-executor.service';
import { AgentRuntimeService } from './application/services/agent/agent-runtime.service';
import { CoachDecisionCalculatorService } from './application/services/coach-decision-calculator.service';
import { CoachDecisionDateService } from './application/services/coach-decision-date.service';
import { AiLlmConfigService } from './application/services/llm/ai-llm-config.service';
import { AiLlmService } from './application/services/llm/ai-llm.service';
import { AiLlmReliabilityService } from './application/services/llm/ai-llm-reliability.service';
import { AiPromptBuilder } from './application/services/llm/ai-prompt-builder.service';
import { OpenAiResponseParserService } from './application/services/llm/openai-response-parser.service';
import { AI_LLM_PROVIDER } from './application/services/llm/ai-llm.types';
import {
  AI_LLM_OBSERVABILITY_METRICS,
  NoopAiLlmObservabilityMetrics,
} from './application/services/observability/ai-llm-observability-metrics';
import { AiLlmObservabilityService } from './application/services/observability/ai-llm-observability.service';
import {
  AI_SAFETY_METRICS,
  NoopAiSafetyMetrics,
} from './application/services/safety/ai-safety-metrics';
import { AiPromptInjectionDetectorService } from './application/services/safety/ai-prompt-injection-detector.service';
import { AiSafetyService } from './application/services/safety/ai-safety.service';
import { CoachFeedbackGenerator } from './application/services/coach-feedback/coach-feedback-generator.service';
import { CoachChatReplyGenerator } from './application/services/chat/coach-chat-reply-generator.service';
import { CoachConversationMemorySummarizer } from './application/services/memory/coach-conversation-memory-summarizer.service';
import { AiPromptRegistryService } from './application/services/governance/ai-prompt-registry.service';
import { AiRolloutService } from './application/services/governance/ai-rollout.service';
import { AiEvaluationDatasetService } from './application/services/governance/ai-evaluation-dataset.service';
import { AiEvaluationRunnerService } from './application/services/governance/ai-evaluation-runner.service';
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
import { GetCoachIntelligenceUseCase } from './application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case';
import { ReplayCoachDecisionUseCase } from './application/use-cases/replay-coach-decision/replay-coach-decision.use-case';
import { GenerateCoachFeedbackUseCase } from './application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case';
import { ReplayCoachFeedbackUseCase } from './application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case';
import { AiController } from './presentation/http/ai.controller';
import { CoachDecisionController } from './presentation/http/coach-decision.controller';
import { CoachIntelligenceController } from './presentation/http/coach-intelligence.controller';
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
    forwardRef(() => HabitsModule),
    RecoveryModule,
    TrainingModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => PersonalizationModule),
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
  controllers: [AiController, CoachDecisionController, CoachIntelligenceController],
  providers: [
    AuthSessionGuard,
    PlatformDateService,
    BuildUserHealthContextService,
    CoachIntelligenceConfigService,
    CoachIntelligenceFreshnessPolicy,
    CoachIntelligenceObservabilityService,
    CoachIntelligenceMapperService,
    CoachIntelligenceSourceAdaptersService,
    CoachIntelligenceContextAssemblerService,
    CoachIntelligenceAggregationService,
    GetCoachIntelligenceUseCase,
    BuildCoachDecisionUseCase,
    GetTodayCoachDecisionUseCase,
    GetCurrentCoachDecisionUseCase,
    GetCoachDecisionHistoryUseCase,
    ReplayCoachDecisionUseCase,
    CoachDecisionCalculatorService,
    CoachDecisionDateService,
    AiLlmConfigService,
    AiPromptBuilder,
    OpenAiResponseParserService,
    AiPromptInjectionDetectorService,
    AiSafetyService,
    AiLlmObservabilityService,
    AiLlmReliabilityService,
    AiLlmService,
    AiPromptRegistryService,
    AiRolloutService,
    AiEvaluationDatasetService,
    AiEvaluationRunnerService,
    AgentRuntimeConfigService,
    AgentIntentClassifierService,
    AgentContextSelectionPolicy,
    AgentPolicyRegistry,
    CoachExpertRegistry,
    AgentPolicyEngineService,
    AgentContextOrchestratorService,
    AgentExecutionPolicy,
    AgentExecutionValidator,
    AgentExecutionEngineService,
    AgentMemoryPolicy,
    AgentMemoryService,
    AgentTraceService,
    AgentPlanningPolicy,
    AgentPlanValidator,
    AgentPlanningEngineService,
    CoachExpertRoutingPolicy,
    CoachExpertRouterService,
    CoachExpertCompositionPolicy,
    CoachExpertCompositionService,
    CoachExpertObservabilityService,
    CoachExplainabilityPolicy,
    CoachExplainabilityService,
    CoachPersonaEnginePolicy,
    CoachPersonaEngineService,
    AgentToolExecutionPolicy,
    AgentToolRegistryService,
    AgentToolExecutorService,
    AgentRuntimeService,
    CoachConversationMemorySummarizer,
    CoachFeedbackGenerator,
    CoachChatReplyGenerator,
    CoachChatContextLoaderService,
    CoachChatPersistenceService,
    CoachChatReplyOrchestratorService,
    CoachChatMemoryUpdaterService,
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
    {
      provide: AI_LLM_OBSERVABILITY_METRICS,
      useClass: NoopAiLlmObservabilityMetrics,
    },
    {
      provide: AI_SAFETY_METRICS,
      useClass: NoopAiSafetyMetrics,
    },
  ],
  exports: [
    BuildUserHealthContextService,
    GetCoachIntelligenceUseCase,
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
