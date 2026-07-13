import { createHash } from 'crypto';

import { CoachChatReplyGenerator } from '../../services/chat/coach-chat-reply-generator.service';
import { CoachChatContextLoaderService } from '../../services/chat/coach-chat-context-loader.service';
import { CoachChatMemoryUpdaterService } from '../../services/chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../../services/chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from '../../services/chat/coach-chat-reply-orchestrator.service';
import { AgentRuntimeService } from '../../services/agent/agent-runtime.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import { AiRolloutService } from '../../services/governance/ai-rollout.service';
import { AiLlmService } from '../../services/llm/ai-llm.service';
import { AiPromptBuilder } from '../../services/llm/ai-prompt-builder.service';
import { CoachConversationMemorySummarizer } from '../../services/memory/coach-conversation-memory-summarizer.service';
import { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import { CoachDecisionInfluence } from '../../../domain/value-objects/coach-decision-influence.value-object';
import { NotificationDecision } from '../../../../notifications/domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../../notifications/domain/value-objects/notification-influence.value-object';
import { CoachConversationRepository } from '../../../domain/repositories/coach-conversation.repository';
import { CoachConversationMemoryRepository } from '../../../domain/repositories/coach-conversation-memory.repository';
import { CoachMessageRepository } from '../../../domain/repositories/coach-message.repository';
import type { AgentResponse } from '../../services/agent/agent.types';
import { GetCurrentCoachDecisionUseCase } from '../get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetRecoveryHistoryUseCase } from '../../../../recovery/application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetDailyCheckInHistoryUseCase } from '../../../../progress/application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import { GetWorkoutHistoryUseCase } from '../../../../progress/application/use-cases/get-workout-history/get-workout-history.use-case';
import { GetProgressSummaryUseCase } from '../../../../progress/application/use-cases/get-progress-summary/get-progress-summary.use-case';
import { GetCurrentNutritionPlanUseCase } from '../../../../../nutrition/application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import { GetTodayNutritionUseCase } from '../../../../../nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitHistoryUseCase } from '../../../../habits/application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { NutritionLogRepository } from '../../../../../nutrition/domain/repositories/nutrition-log.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { CreateCoachChatUseCase } from './create-coach-chat.use-case';

describe('CreateCoachChatUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let coachConversationMemoryRepository: jest.Mocked<CoachConversationMemoryRepository>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let getCurrentGoalUseCase: {
    execute: jest.MockedFunction<GetCurrentGoalUseCase['execute']>;
  };
  let getGoalHistoryUseCase: {
    execute: jest.MockedFunction<GetGoalHistoryUseCase['execute']>;
  };
  let getGoalMilestonesUseCase: {
    execute: jest.MockedFunction<GetGoalMilestonesUseCase['execute']>;
  };
  let getGoalAchievementHistoryUseCase: {
    execute: jest.MockedFunction<GetGoalAchievementHistoryUseCase['execute']>;
  };
  let aiRolloutService: {
    resolveCoachChatAssignment: jest.MockedFunction<
      AiRolloutService['resolveCoachChatAssignment']
    >;
  };
  let aiPromptBuilder: jest.Mocked<AiPromptBuilder>;
  let aiLlmService: jest.Mocked<AiLlmService>;
  let replyGenerator: jest.Mocked<CoachChatReplyGenerator>;
  let coachConversationMemorySummarizer: jest.Mocked<CoachConversationMemorySummarizer>;
  let getCurrentCoachDecisionUseCase: {
    execute: jest.MockedFunction<GetCurrentCoachDecisionUseCase['execute']>;
  };
  let getRecoveryHistoryUseCase: {
    execute: jest.MockedFunction<GetRecoveryHistoryUseCase['execute']>;
  };
  let getDailyCheckInHistoryUseCase: {
    execute: jest.MockedFunction<GetDailyCheckInHistoryUseCase['execute']>;
  };
  let getWorkoutHistoryUseCase: {
    execute: jest.MockedFunction<GetWorkoutHistoryUseCase['execute']>;
  };
  let getProgressSummaryUseCase: {
    execute: jest.MockedFunction<GetProgressSummaryUseCase['execute']>;
  };
  let getCurrentNotificationUseCase: {
    execute: jest.MockedFunction<GetCurrentNotificationUseCase['execute']>;
  };
  let getEngagementSummaryUseCase: {
    execute: jest.MockedFunction<GetEngagementSummaryUseCase['execute']>;
  };
  let getCurrentHabitsUseCase: {
    execute: jest.MockedFunction<GetCurrentHabitsUseCase['execute']>;
  };
  let getHabitHistoryUseCase: {
    execute: jest.MockedFunction<GetHabitHistoryUseCase['execute']>;
  };
  let getConsistencySummaryUseCase: {
    execute: jest.MockedFunction<GetConsistencySummaryUseCase['execute']>;
  };
  let getHabitRiskSignalsUseCase: {
    execute: jest.MockedFunction<GetHabitRiskSignalsUseCase['execute']>;
  };
  let getCurrentPersonalizationUseCase: {
    execute: jest.MockedFunction<GetCurrentPersonalizationUseCase['execute']>;
  };
  let getUserBehaviorProfileUseCase: {
    execute: jest.MockedFunction<GetUserBehaviorProfileUseCase['execute']>;
  };
  let getBehavioralPatternsUseCase: {
    execute: jest.MockedFunction<GetBehavioralPatternsUseCase['execute']>;
  };
  let getCurrentNutritionPlanUseCase: {
    execute: jest.MockedFunction<GetCurrentNutritionPlanUseCase['execute']>;
  };
  let getTodayNutritionUseCase: {
    execute: jest.MockedFunction<GetTodayNutritionUseCase['execute']>;
  };
  let nutritionLogRepository: {
    findByUserProfileIdAndDate: jest.MockedFunction<
      NutritionLogRepository['findByUserProfileIdAndDate']
    >;
  };
  let coachChatContextLoaderService: CoachChatContextLoaderService;
  let coachChatPersistenceService: CoachChatPersistenceService;
  let coachChatReplyOrchestratorService: CoachChatReplyOrchestratorService;
  let coachChatMemoryUpdaterService: CoachChatMemoryUpdaterService;
  let agentRuntimeService: jest.Mocked<
    Pick<AgentRuntimeService, 'isEnabled' | 'execute'>
  >;
  let useCase: CreateCoachChatUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationRepository>;
    coachMessageRepository = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachMessageRepository>;
    coachConversationMemoryRepository = {
      findByConversationId: jest.fn(),
      upsertByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemoryRepository>;
    buildUserHealthContextService = {
      build: jest.fn(),
    } as unknown as {
      build: jest.MockedFunction<BuildUserHealthContextService['build']>;
    };
    getCurrentGoalUseCase = {
      execute: jest.fn().mockResolvedValue({
        goal: undefined,
        progressSnapshot: undefined,
        forecast: undefined,
      }),
    };
    getGoalHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({
        goalProgressSnapshots: [],
        limit: 7,
      }),
    };
    getGoalMilestonesUseCase = {
      execute: jest.fn().mockResolvedValue({
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        goalMilestones: [],
      }),
    };
    getGoalAchievementHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({
        goalAchievements: [],
        limit: 20,
      }),
    };
    aiRolloutService = {
      resolveCoachChatAssignment: jest.fn().mockReturnValue({
        experimentId: 'coach-chat-evaluation-rollout',
        promptId: 'coach-chat',
        currentPromptVersion: 'coach-chat-prompt-v1',
        previousPromptVersion: 'coach-chat-prompt-v0',
        selectedPromptVersion: 'coach-chat-prompt-v1',
        currentProvider: 'openai',
        previousProvider: 'openai',
        selectedProvider: 'openai',
        currentModel: 'gpt-4.1-mini',
        previousModel: 'gpt-4.1-mini',
        selectedModel: 'gpt-4.1-mini',
        canaryBucket: 12,
        canaryPercentage: 100,
        streamingEnabled: false,
        structuredOutputsEnabled: true,
        toolCallingEnabled: false,
        futureMemoryEnabled: false,
        rolloutVariant: 'current',
      }),
    } as unknown as {
      resolveCoachChatAssignment: jest.MockedFunction<
        AiRolloutService['resolveCoachChatAssignment']
      >;
    };
    aiPromptBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<AiPromptBuilder>;
    aiLlmService = {
      generateReply: jest.fn(),
      streamReply: jest.fn(),
      canStream: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<AiLlmService>;
    replyGenerator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<CoachChatReplyGenerator>;
    coachConversationMemorySummarizer = {
      summarize: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemorySummarizer>;
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn().mockResolvedValue({ coachDecision: undefined }),
    };
    getRecoveryHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({ recoverySnapshots: [] }),
    };
    getDailyCheckInHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({ dailyCheckIns: [] }),
    };
    getWorkoutHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({ workoutLogs: [] }),
    };
    getProgressSummaryUseCase = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          summary: {
            period: 'week',
            workoutsCompleted: 0,
            totalDurationMinutes: 0,
            averageDurationMinutes: 0,
            lastWorkoutDate: null,
            currentStreak: 0,
          },
        })
        .mockResolvedValueOnce({
          summary: {
            period: 'month',
            workoutsCompleted: 0,
            totalDurationMinutes: 0,
            averageDurationMinutes: 0,
            lastWorkoutDate: null,
            currentStreak: 0,
          },
        }),
    };
    getCurrentNotificationUseCase = {
      execute: jest.fn().mockResolvedValue({
        notificationDecision: undefined,
      }),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn().mockResolvedValue({
        engagementSummary: undefined,
      }),
    };
    getCurrentHabitsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    getHabitHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({ history: [] } as never),
    };
    getConsistencySummaryUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    getHabitRiskSignalsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    getCurrentPersonalizationUseCase = {
      execute: jest.fn().mockResolvedValue({
        personalizationSnapshot: undefined,
      }),
    };
    getUserBehaviorProfileUseCase = {
      execute: jest.fn().mockResolvedValue({
        userBehaviorProfile: undefined,
      }),
    };
    getBehavioralPatternsUseCase = {
      execute: jest.fn().mockResolvedValue({
        behavioralPatterns: [],
      }),
    };
    getCurrentNutritionPlanUseCase = {
      execute: jest.fn().mockResolvedValue({
        nutritionPlan: {
          id: 'nutrition_plan_123',
          userProfileId: 'profile_123',
          nutritionProfileId: 'nutrition_profile_123',
          fitnessProfileId: 'fitness_profile_123',
          status: 'active',
          weekStartDate: '2026-07-06',
          weekEndDate: '2026-07-12',
          macroTargets: {
            calories: 2200,
            proteinGrams: 150,
            carbsGrams: 240,
            fatGrams: 70,
          },
          days: [],
          generatedBy: 'deterministic',
          createdAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      } as never),
    };
    getTodayNutritionUseCase = {
      execute: jest.fn().mockResolvedValue({
        todayNutrition: {
          date: '2026-07-07',
          macroTargets: {
            calories: 2200,
            proteinGrams: 150,
            carbsGrams: 240,
            fatGrams: 70,
          },
          meals: [],
          progress: {
            consumedCalories: 1800,
            consumedProteinGrams: 120,
            consumedCarbsGrams: 190,
            consumedFatGrams: 55,
            targetCalories: 2200,
            targetProteinGrams: 150,
            targetCarbsGrams: 240,
            targetFatGrams: 70,
            adherencePercentage: 82,
          },
          nextMeal: null,
          nutritionFocus:
            'Focus on consistency and balanced meals across the day.',
        },
      } as never),
    };
    nutritionLogRepository = {
      findByUserProfileIdAndDate: jest.fn().mockResolvedValue([]),
    };
    coachChatContextLoaderService = new CoachChatContextLoaderService(
      userProfileRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentGoalUseCase as unknown as GetCurrentGoalUseCase,
      getGoalHistoryUseCase as unknown as GetGoalHistoryUseCase,
      getGoalMilestonesUseCase as unknown as GetGoalMilestonesUseCase,
      getGoalAchievementHistoryUseCase as unknown as GetGoalAchievementHistoryUseCase,
      getCurrentCoachDecisionUseCase as unknown as GetCurrentCoachDecisionUseCase,
      getRecoveryHistoryUseCase as unknown as GetRecoveryHistoryUseCase,
      getCurrentNotificationUseCase as unknown as GetCurrentNotificationUseCase,
      getEngagementSummaryUseCase as unknown as GetEngagementSummaryUseCase,
      getCurrentHabitsUseCase as unknown as GetCurrentHabitsUseCase,
      getHabitHistoryUseCase as unknown as GetHabitHistoryUseCase,
      getConsistencySummaryUseCase as unknown as GetConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase as unknown as GetHabitRiskSignalsUseCase,
      getCurrentPersonalizationUseCase as unknown as GetCurrentPersonalizationUseCase,
      getUserBehaviorProfileUseCase as unknown as GetUserBehaviorProfileUseCase,
      getBehavioralPatternsUseCase as unknown as GetBehavioralPatternsUseCase,
      getCurrentNutritionPlanUseCase as unknown as GetCurrentNutritionPlanUseCase,
      getTodayNutritionUseCase as unknown as GetTodayNutritionUseCase,
      getDailyCheckInHistoryUseCase as unknown as GetDailyCheckInHistoryUseCase,
      getWorkoutHistoryUseCase as unknown as GetWorkoutHistoryUseCase,
      getProgressSummaryUseCase as unknown as GetProgressSummaryUseCase,
      nutritionLogRepository as unknown as NutritionLogRepository,
    );
    coachChatPersistenceService = new CoachChatPersistenceService(
      coachConversationRepository,
      coachMessageRepository,
      coachConversationMemoryRepository,
    );
    coachChatReplyOrchestratorService = new CoachChatReplyOrchestratorService(
      aiLlmService as unknown as AiLlmService,
      replyGenerator as unknown as CoachChatReplyGenerator,
    );
    coachChatMemoryUpdaterService = new CoachChatMemoryUpdaterService(
      coachConversationMemorySummarizer as unknown as CoachConversationMemorySummarizer,
      coachConversationMemoryRepository,
    );
    agentRuntimeService = {
      isEnabled: jest.fn().mockReturnValue(false),
      execute: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<AgentRuntimeService, 'isEnabled' | 'execute'>
    >;
    coachConversationMemorySummarizer.summarize.mockReturnValue(
      buildMemorySummary({
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; notification=type:coach_nudge,suppressed:true,fatigue:high,engagement:84; user_concern=general',
        generatedFromMessageCount: 2,
      }),
    );

    useCase = new CreateCoachChatUseCase(
      coachChatContextLoaderService,
      coachChatPersistenceService,
      coachChatReplyOrchestratorService,
      coachChatMemoryUpdaterService,
      aiPromptBuilder,
      aiRolloutService as unknown as AiRolloutService,
      agentRuntimeService as unknown as AgentRuntimeService,
    );
  });

  it('uses the LLM reply when enabled and persists both messages', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision({
        priority: 'training',
        headline: 'Training adaptation recommended',
        summary: 'Signals are stable and ready for progression.',
        actionItems: ['Follow the adaptive recommendation', 'Monitor fatigue'],
      }),
    } as never);
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue({
      content: 'OpenAI coach reply',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary:
        'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
      metadata: {
        generatedFromMessageCount: 2,
        version: 'memory-v1',
      },
    });
    replyGenerator.generate.mockReturnValue('Fallback reply');
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(aiPromptBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Should I train today?',
        healthContext: expect.objectContaining({
          authUserId: 'auth_user_123',
        }),
        conversationHistory: [],
        trace: expect.objectContaining({
          conversationId: 'conversation_123',
          userIdHash: hashValue('profile_123'),
        }),
        experiment: expect.objectContaining({
          promptId: 'coach-chat',
        }),
        coachDecision: {
          priority: 'training',
          headline: 'Training adaptation recommended',
          summary: 'Signals are stable and ready for progression.',
          actionItems: [
            'Follow the adaptive recommendation',
            'Monitor fatigue',
          ],
          influences: [],
        },
      }),
    );
    expect(aiLlmService.generateReply).toHaveBeenCalledWith({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    expect(replyGenerator.generate).not.toHaveBeenCalled();
    expect(coachConversationMemorySummarizer.summarize).toHaveBeenCalled();
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation_123',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
      }),
    );
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(1, {
      conversationId: 'conversation_123',
      role: 'user',
      content: 'Should I train today?',
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_123',
      role: 'assistant',
      content: 'OpenAI coach reply',
      metadata: {
        source: 'llm',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      },
    });
    expect(result).toEqual({
      conversationId: 'conversation_123',
      reply: 'OpenAI coach reply',
    });
  });

  it('streams deltas when streaming is enabled', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision({
        priority: 'training',
        headline: 'Training adaptation recommended',
        summary: 'Signals are stable and ready for progression.',
        actionItems: ['Follow the adaptive recommendation', 'Monitor fatigue'],
      }),
    } as never);
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.canStream.mockReturnValue(true);
    aiLlmService.streamReply.mockImplementation(async (_prompt, onDelta) => {
      onDelta?.('OpenAI coach reply');

      return {
        content: 'OpenAI coach reply',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      };
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary:
        'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
      metadata: {
        generatedFromMessageCount: 2,
        version: 'memory-v1',
      },
    });
    replyGenerator.generate.mockReturnValue('Fallback reply');
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    const onDelta = jest.fn();
    const result = await useCase.executeStream(
      {
        authUserId: 'auth_user_123',
        message: 'Should I train today?',
      },
      {
        onDelta,
      },
    );

    expect(aiLlmService.streamReply).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersion: 'coach-chat-prompt-v1',
      }),
      expect.any(Function),
    );
    expect(onDelta).toHaveBeenCalledWith('OpenAI coach reply');
    expect(result).toEqual({
      conversationId: 'conversation_123',
      reply: 'OpenAI coach reply',
    });
  });

  it('includes reduced notification context in the prompt and memory flow', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision({
        priority: 'consistency',
        headline: 'Focus on consistency',
        summary: 'Signals are stable.',
      }),
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: buildNotificationDecision(),
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 84,
        fatigueLevel: 'high',
        openedCount: 2,
        clickedCount: 1,
        dismissedCount: 2,
        completedCount: 1,
        recentEventsCount: 6,
      },
    } as never);
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue({
      content: 'OpenAI coach reply',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationMemorySummarizer.summarize.mockReturnValue(
      buildMemorySummary({
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; notification=type:coach_nudge,suppressed:true,fatigue:high,engagement:84; user_concern=general',
        generatedFromMessageCount: 2,
      }),
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; notification=type:coach_nudge,suppressed:true,fatigue:high,engagement:84; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(aiPromptBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        experiment: expect.objectContaining({
          promptId: 'coach-chat',
        }),
        notification: expect.objectContaining({
          current: expect.objectContaining({
            type: 'coach_nudge',
            suppressed: true,
            fatigueLevel: 'high',
          }),
          engagementSummary: expect.objectContaining({
            engagementScore: 84,
          }),
        }),
      }),
    );
    expect(replyGenerator.generate).not.toHaveBeenCalled();
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining(
          'notification=type:coach_nudge,suppressed:true,fatigue:high,engagement:84',
        ),
      }),
    );
  });

  it('includes reduced habit context in the prompt and memory flow', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-05-18',
        consistencyScore: 38,
        streakDays: 1,
        adherenceScore: 42,
        trend: 'declining',
        sourceContext: {
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-05-18T10:00:00.000Z',
        },
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-05-18T10:00:00.000Z',
      } as never,
    });
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        userProfileId: 'profile_123',
        score: 38,
        trend: 'declining',
        currentStreak: 1,
        longestStreak: 4,
        adherenceRate: 42,
        riskLevel: 'high',
        updatedAt: '2026-05-18T10:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      } as never,
    });
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [
        {
          userProfileId: 'profile_123',
          type: 'dropout_risk',
          level: 'high',
          title: 'Dropout risk',
          description: 'Consistency is trending down.',
          generatedAt: '2026-05-18T10:00:00.000Z',
          formulaVersion: 'habit-engine-v1',
        } as never,
      ],
    });
    coachConversationMemorySummarizer.summarize.mockReturnValue(
      buildMemorySummary({
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; habit=score:38,trend:declining,streak:1,risk:high; user_concern=general',
        generatedFromMessageCount: 2,
      }),
    );
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue({
      content: 'OpenAI coach reply',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; habit=score:38,trend:declining,streak:1,risk:high; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(aiPromptBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        experiment: expect.objectContaining({
          promptId: 'coach-chat',
        }),
        habit: expect.objectContaining({
          summary: expect.objectContaining({
            trend: 'declining',
            riskLevel: 'high',
          }),
          riskSignals: expect.arrayContaining([
            expect.objectContaining({
              type: 'dropout_risk',
            }),
          ]),
        }),
      }),
    );
    expect(coachConversationMemorySummarizer.summarize).toHaveBeenCalledWith(
      expect.objectContaining({
        habit: expect.objectContaining({
          habitConsistencyScore: 38,
          habitTrend: 'declining',
          habitCurrentStreak: 1,
          habitRiskLevel: 'high',
        }),
      }),
    );
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining(
          'habit=score:38,trend:declining,streak:1,risk:high',
        ),
      }),
    );
  });

  it('falls back to the heuristic reply when LLM is disabled', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_456',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([
      {
        id: 'message_002',
        conversationId: 'conversation_456',
        role: 'assistant',
        content: 'Try keeping the session lighter.',
        createdAt: new Date('2026-05-17T10:00:01.000Z'),
      },
      {
        id: 'message_001',
        conversationId: 'conversation_456',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
      },
    ]);
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_456',
        conversationId: 'conversation_456',
        summary:
          'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:1; user_concern=recovery',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-17T10:00:02.000Z'),
        updatedAt: new Date('2026-05-17T10:00:02.000Z'),
      }),
    );
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: 'HIGH',
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 2,
          createdAt: new Date('2026-05-18T09:00:00.000Z'),
        },
      }),
    );
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue(null);
    replyGenerator.generate.mockReturnValue(
      "Your recovery signals suggest keeping today's session lighter.",
    );
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:2; user_concern=recovery',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v1',
      },
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_456',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_456',
        role: 'assistant',
        content:
          "Your recovery signals suggest keeping today's session lighter.",
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: 'conversation_456',
      limit: 12,
    });
    expect(aiPromptBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Should I train today?',
        healthContext: expect.objectContaining({
          fatigueLevel: 'HIGH',
        }),
        conversationHistory: [
          {
            role: 'user',
            content: 'Should I train today?',
            createdAt: '2026-05-17T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Try keeping the session lighter.',
            createdAt: '2026-05-17T10:00:01.000Z',
          },
        ],
        conversationMemory: {
          summary:
            'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:1; user_concern=recovery',
          metadata: {
            generatedFromMessageCount: 2,
            version: 'memory-v1',
          },
        },
        trace: expect.objectContaining({
          conversationId: 'conversation_456',
          userIdHash: hashValue('profile_123'),
        }),
        experiment: expect.objectContaining({
          promptId: 'coach-chat',
        }),
      }),
    );
    expect(replyGenerator.generate).toHaveBeenCalledWith({
      message: 'Should I train today?',
      healthContext: expect.objectContaining({
        fatigueLevel: 'HIGH',
      }),
    });
    expect(result.reply).toBe(
      "Your recovery signals suggest keeping today's session lighter.",
    );
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith({
      conversationId: 'conversation_456',
      summary:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:2; user_concern=recovery',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v1',
      },
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_456',
      role: 'assistant',
      content: "Your recovery signals suggest keeping today's session lighter.",
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('falls back to the heuristic reply when the provider fails', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockRejectedValue(new Error('OpenAI is down'));
    replyGenerator.generate.mockReturnValue(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_789',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_789',
        role: 'user',
        content: 'What should I do today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_789',
        role: 'assistant',
        content:
          'Your context looks steady. Keep the routine consistent and check in after your session.',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'What should I do today?',
    });

    expect(replyGenerator.generate).toHaveBeenCalledTimes(1);
    expect(result.reply).toBe(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_789',
      role: 'assistant',
      content:
        'Your context looks steady. Keep the routine consistent and check in after your session.',
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('keeps the deterministic fallback when health context is sparse', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        latestCheckIn: undefined,
        nutritionProfile: undefined,
        fatigueLevel: 'MODERATE',
      }),
    );
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue(null);
    replyGenerator.generate.mockReturnValue(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_999',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_999',
        role: 'user',
        content: 'What should I do today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_999',
        role: 'assistant',
        content:
          'Your context looks steady. Keep the routine consistent and check in after your session.',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'What should I do today?',
    });

    expect(result.reply).toContain('Keep the routine consistent');
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_999',
      role: 'assistant',
      content:
        'Your context looks steady. Keep the routine consistent and check in after your session.',
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('uses the coach decision when fallback reply generation is needed', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: 'HIGH',
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 2,
          createdAt: new Date('2026-05-18T09:00:00.000Z'),
        },
      }),
    );
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision({
        priority: 'recovery',
        headline: 'Recovery should be your focus today',
        summary: 'Reduce load and recover before pushing again.',
        actionItems: [
          'Reduce training intensity today',
          'Prioritize sleep tonight',
        ],
        influences: [
          new CoachDecisionInfluence({
            code: 'LOW_READINESS',
            label: 'Low readiness',
            impact: 'negative',
            source: 'recovery',
          }),
        ],
      }),
    } as never);
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue(null);
    replyGenerator.generate.mockReturnValue(
      'Recovery should be your focus today. Reduce load and recover before pushing again. The strongest signals point to recovery. Keep the session lighter and prioritize sleep, hydration, and recovery work.',
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_999',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_999',
        role: 'user',
        content: 'What should I do today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_999',
        role: 'assistant',
        content:
          'Recovery should be your focus today. Reduce load and recover before pushing again. The strongest signals point to recovery. Keep the session lighter and prioritize sleep, hydration, and recovery work.',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'What should I do today?',
    });

    expect(replyGenerator.generate).toHaveBeenCalledWith({
      message: 'What should I do today?',
      healthContext: expect.objectContaining({
        fatigueLevel: 'HIGH',
      }),
      coachDecision: expect.objectContaining({
        priority: 'recovery',
      }),
    });
    expect(result.reply).toContain('Recovery should be your focus today.');
    expect(coachConversationMemorySummarizer.summarize).toHaveBeenCalledWith(
      expect.objectContaining({
        coachDecision: expect.objectContaining({
          priority: 'recovery',
          headline: 'Recovery should be your focus today',
        }),
      }),
    );
  });

  it('keeps the legacy flow when the agent runtime is disabled', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue({
      content: 'OpenAI coach reply',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary: 'goal=gain_muscle; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(agentRuntimeService.isEnabled).toHaveBeenCalled();
    expect(agentRuntimeService.execute).not.toHaveBeenCalled();
    expect(aiPromptBuilder.build).toHaveBeenCalled();
    expect(result).toEqual({
      conversationId: 'conversation_123',
      reply: 'OpenAI coach reply',
    });
  });

  it('routes through the agent runtime when enabled and preserves the reply shape', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    aiRolloutService.resolveCoachChatAssignment.mockReturnValue({
      experimentId: 'coach-chat-evaluation-rollout',
      promptId: 'coach-chat',
      currentPromptVersion: 'coach-chat-prompt-v1',
      previousPromptVersion: 'coach-chat-prompt-v0',
      selectedPromptVersion: 'coach-chat-prompt-v1',
      currentProvider: 'openai',
      previousProvider: 'openai',
      selectedProvider: 'openai',
      currentModel: 'gpt-4.1-mini',
      previousModel: 'gpt-4.1-mini',
      selectedModel: 'gpt-4.1-mini',
      canaryBucket: 12,
      canaryPercentage: 100,
      streamingEnabled: false,
      structuredOutputsEnabled: true,
      toolCallingEnabled: false,
      futureMemoryEnabled: false,
      rolloutVariant: 'current',
    });
    agentRuntimeService.isEnabled.mockReturnValue(true);
    agentRuntimeService.execute.mockResolvedValue({
      conversationId: 'conversation_123',
      assistantText: 'Agent runtime reply',
      fallbackUsed: false,
      planSummary:
        'intent=TRAINING; strategy=MULTI_CONTEXT; mode=standard; domains=user_profile,conversation_memory,recent_messages,coach_decision,training,recovery,goals,progress; tools=TrainingTool,RecoveryTool,GoalTool,ProgressTool,HealthContextTool,CoachDecisionTool,ConversationMemoryTool,UserProfileTool; maxDepth=4; cost=14; latencyMs=127',
      executedSteps: [],
      actionResults: [],
      metadata: {
        enabled: true,
        detectedIntent: 'TRAINING',
        planIntent: 'TRAINING',
        responseMode: 'standard',
        executionStrategy: 'MULTI_CONTEXT',
        stepCount: 0,
        fallbackUsed: false,
        selectedDomains: [
          'user_profile',
          'conversation_memory',
          'recent_messages',
          'coach_decision',
          'training',
          'recovery',
          'goals',
          'progress',
        ],
        selectedDomainCount: 8,
        candidateToolIds: [
          'UserProfileTool',
          'ConversationMemoryTool',
          'CoachDecisionTool',
          'HealthContextTool',
          'TrainingTool',
          'RecoveryTool',
          'GoalTool',
          'ProgressTool',
        ],
        selectedToolIds: [
          'TrainingTool',
          'RecoveryTool',
          'GoalTool',
          'ProgressTool',
          'HealthContextTool',
          'CoachDecisionTool',
          'ConversationMemoryTool',
          'UserProfileTool',
        ],
        candidateToolCount: 8,
        selectedToolCount: 8,
        estimatedToolCost: 14,
        estimatedToolLatencyMs: 127,
        planningStepCount: 10,
        planningDurationMs: 1,
        planningValidationPassed: true,
        durationMs: 1,
        orchestrationDurationMs: 1,
        stepLimitReached: false,
        promptVersion: 'coach-chat-prompt-v1',
        experimentId: 'coach-chat-evaluation-rollout',
        streamingPreference: false,
        rolloutVariant: 'current',
        selectedPromptVersion: 'coach-chat-prompt-v1',
        plan: {
          executionStrategy: 'MULTI_CONTEXT',
          maximumExecutionDepth: 4,
        } as never,
        toolExecutionEnabled: true,
        toolExecutionMetrics: {
          enabled: true,
          maxToolCalls: 4,
          timeoutMs: 3000,
          selectedToolCount: 8,
          executedToolCount: 3,
          skippedToolCount: 5,
          failedToolCount: 0,
          timeoutCount: 0,
          totalDurationMs: 9,
          selectedToolIds: [
            'TrainingTool',
            'RecoveryTool',
            'GoalTool',
            'ProgressTool',
            'HealthContextTool',
            'CoachDecisionTool',
            'ConversationMemoryTool',
            'UserProfileTool',
          ],
          executedToolIds: ['TrainingTool', 'RecoveryTool', 'GoalTool'],
          skippedToolIds: [
            'ProgressTool',
            'HealthContextTool',
            'CoachDecisionTool',
            'ConversationMemoryTool',
            'UserProfileTool',
          ],
          failedToolIds: [],
          timeoutToolIds: [],
          perToolDurationMs: [
            { toolId: 'TrainingTool', durationMs: 2 },
            { toolId: 'RecoveryTool', durationMs: 3 },
            { toolId: 'GoalTool', durationMs: 4 },
            { toolId: 'ProgressTool', durationMs: 0 },
            { toolId: 'HealthContextTool', durationMs: 0 },
            { toolId: 'CoachDecisionTool', durationMs: 0 },
            { toolId: 'ConversationMemoryTool', durationMs: 0 },
            { toolId: 'UserProfileTool', durationMs: 0 },
          ],
        },
        toolExecutionResults: [
          {
            toolId: 'TrainingTool',
            status: 'SUCCESS',
            summary: 'Loaded training context.',
            data: { training: true },
            durationMs: 2,
            metadata: { readOnly: true },
          },
        ],
        toolExecutionDurationMs: 9,
        memory: {
          workingMemorySize: 4,
          sessionMemorySize: 3,
          conversationMemorySize: 12,
          snapshotCreated: true,
          expired: false,
          lifecycleEvents: [],
        },
      },
      observabilityTraceReference: {
        requestId: 'agent-request-123',
        conversationId: 'conversation_123',
        userIdHash: hashValue('profile_123'),
        experimentId: 'coach-chat-evaluation-rollout',
        promptVersion: 'coach-chat-prompt-v1',
      },
    } as unknown as AgentResponse);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(agentRuntimeService.isEnabled).toHaveBeenCalled();
    expect(agentRuntimeService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: 'auth_user_123',
        message: 'Should I train today?',
      }),
      expect.objectContaining({
        streaming: false,
      }),
    );
    expect(aiPromptBuilder.build).not.toHaveBeenCalled();
    expect(aiLlmService.generateReply).not.toHaveBeenCalled();
    expect(coachMessageRepository.create).not.toHaveBeenCalled();
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      conversationId: 'conversation_123',
      reply: 'Agent runtime reply',
    });
  });
});

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

function buildHealthContext(
  overrides: Partial<
    Awaited<ReturnType<BuildUserHealthContextService['build']>>
  > = {},
): Awaited<ReturnType<BuildUserHealthContextService['build']>> {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Rodrigo Paiva',
    goal: 'gain_muscle',
    activityLevel: 'medium',
    weeklyFrequency: 4,
    adherenceScore: 75,
    currentStreak: 5,
    averageWorkoutDuration: 48,
    fatigueLevel: 'LOW',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_123',
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-05-18T10:00:00.000Z'),
    latestCheckIn: {
      energyLevel: 4,
      sleepQuality: 4,
      muscleSoreness: 1,
      motivationLevel: 4,
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    },
    nutritionProfile: {
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
    },
    ...overrides,
  };
}

function buildMemorySummary(
  overrides: Partial<{
    summary: string;
    generatedFromMessageCount: number;
    version: string;
  }> = {},
): {
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
} {
  const {
    summary = 'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
    generatedFromMessageCount = 2,
    version = 'memory-v1',
  } = overrides;

  return {
    summary,
    metadata: {
      generatedFromMessageCount,
      version,
    },
  };
}

function buildCoachDecision(
  overrides: Partial<CoachDecision> = {},
): CoachDecision {
  return new CoachDecision({
    id: 'decision_123',
    userProfileId: 'profile_123',
    date: '2026-05-18',
    priority: 'motivation',
    headline: 'Keep building momentum',
    summary: 'Signals are stable.',
    actionItems: ['Continue the current plan', 'Stay consistent'],
    influences: [],
    sourceContext: { generatedAt: '2026-05-18T10:00:00.000Z' },
    formulaVersion: 'coach-decision-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-05-18T10:00:00.000Z'),
    updatedAt: new Date('2026-05-18T10:00:00.000Z'),
    ...overrides,
  });
}

function buildNotificationDecision(): NotificationDecision {
  return new NotificationDecision({
    id: 'notification_123',
    userProfileId: 'profile_123',
    date: '2026-05-18',
    type: 'coach_nudge',
    priority: 'low',
    channel: 'in_app',
    status: 'planned',
    title: 'Small action, big progress',
    message: 'Keep the next step simple and consistent.',
    influences: [
      {
        code: 'COACH_CONSISTENCY_NUDGE',
        label: 'Coach consistency nudge',
        impact: 'neutral',
        source: 'coach',
      } as NotificationInfluence,
    ] as never,
    sourceContext: {
      coachDecisionId: 'decision_123',
      coachDecisionPriority: 'consistency',
      coachDecisionHeadline: 'Focus on consistency',
      readinessScore: 64,
      fatigueScore: 38,
      fatigueLevel: 'low',
      adaptiveRecommendationType: 'maintain',
      goalProgressTrend: 'stable',
      goalMilestoneClose: false,
      goalAchievementReached: false,
      nutritionAdherence: 72,
      missedWorkouts: 0,
      noRecentActivity: false,
      recentEngagementEventsCount: 2,
      formulaVersion: 'notification-engine-v1',
      generatedAt: '2026-05-18T10:00:00.000Z',
    },
    suppressed: true,
    suppressionReasons: ['same_type_cooldown'],
    fatigueLevel: 'high',
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-05-18T10:00:00.000Z'),
    updatedAt: new Date('2026-05-18T10:00:00.000Z'),
  });
}
