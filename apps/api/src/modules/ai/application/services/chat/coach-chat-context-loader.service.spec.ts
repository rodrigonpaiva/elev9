import { CreateCoachChatError } from '../../use-cases/create-coach-chat/create-coach-chat.errors';
import { CoachChatContextLoaderService } from './coach-chat-context-loader.service';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import { GetCurrentCoachDecisionUseCase } from '../../use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('CoachChatContextLoaderService', () => {
  let userProfileRepository: {
    findByAuthUserId: jest.MockedFunction<
      UserProfileRepository['findByAuthUserId']
    >;
  };
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let getCurrentCoachDecisionUseCase: {
    execute: jest.MockedFunction<GetCurrentCoachDecisionUseCase['execute']>;
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
  let service: CoachChatContextLoaderService;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
    };
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
    };
    getCurrentNotificationUseCase = {
      execute: jest.fn(),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn(),
    };
    getCurrentHabitsUseCase = {
      execute: jest.fn(),
    };
    getConsistencySummaryUseCase = {
      execute: jest.fn(),
    };
    getHabitRiskSignalsUseCase = {
      execute: jest.fn(),
    };
    getCurrentPersonalizationUseCase = {
      execute: jest.fn(),
    };
    getUserBehaviorProfileUseCase = {
      execute: jest.fn(),
    };
    getBehavioralPatternsUseCase = {
      execute: jest.fn(),
    };

    service = new CoachChatContextLoaderService(
      userProfileRepository as unknown as UserProfileRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentCoachDecisionUseCase as unknown as GetCurrentCoachDecisionUseCase,
      getCurrentNotificationUseCase as unknown as GetCurrentNotificationUseCase,
      getEngagementSummaryUseCase as unknown as GetEngagementSummaryUseCase,
      getCurrentHabitsUseCase as unknown as GetCurrentHabitsUseCase,
      getConsistencySummaryUseCase as unknown as GetConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase as unknown as GetHabitRiskSignalsUseCase,
      getCurrentPersonalizationUseCase as unknown as GetCurrentPersonalizationUseCase,
      getUserBehaviorProfileUseCase as unknown as GetUserBehaviorProfileUseCase,
      getBehavioralPatternsUseCase as unknown as GetBehavioralPatternsUseCase,
    );
  });

  it('loads context from the existing coach and profile sources', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    buildUserHealthContextService.build.mockResolvedValue({
      goal: 'muscle_gain',
      fatigueLevel: 'LOW',
      recoveryTrend: 'improving',
      nutritionProfile: { goal: 'muscle_gain', mealsPerDay: 4 },
      recentWorkoutLogs: [],
      currentStreak: 3,
    } as never);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: {
        priority: 'training',
        headline: 'Train today',
        summary: 'You are ready.',
        actionItems: ['Train'],
        influences: [],
      },
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: {
        type: 'coach_nudge',
        priority: 'low',
        status: 'planned',
        suppressed: false,
        fatigueLevel: 'low',
      },
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 80,
        fatigueLevel: 'low',
        dismissedCount: 1,
        recentEventsCount: 5,
      },
    } as never);
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-07-05',
        consistencyScore: 72,
        streakDays: 3,
        adherenceScore: 78,
        trend: 'improving',
        sourceContext: {
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-07-05T08:00:00.000Z',
        },
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-07-05T08:00:00.000Z',
      },
    } as never);
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        userProfileId: 'profile_123',
        score: 72,
        trend: 'improving',
        currentStreak: 3,
        longestStreak: 7,
        adherenceRate: 78,
        riskLevel: 'low',
        updatedAt: '2026-07-05T08:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      },
    } as never);
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [],
    } as never);
    getCurrentPersonalizationUseCase.execute.mockResolvedValue({
      personalizationSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-07-05',
        preferredCoachingStyle: 'motivational',
        engagementProfile: 'high',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'high',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'high',
        riskOfDisengagement: 'low',
        trend: 'improving',
        sourceContext: {
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-07-05T08:00:00.000Z',
        },
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-07-05T08:00:00.000Z',
      },
    } as never);
    getUserBehaviorProfileUseCase.execute.mockResolvedValue({
      userBehaviorProfile: {
        userProfileId: 'profile_123',
        preferredCoachingStyle: 'motivational',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'high',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'high',
        engagementProfile: 'high',
        riskOfDisengagement: 'low',
        formulaVersion: 'personalization-engine-v1',
      },
    } as never);
    getBehavioralPatternsUseCase.execute.mockResolvedValue({
      behavioralPatterns: [
        {
          userProfileId: 'profile_123',
          type: 'responds_to_goals',
          confidence: 'high',
          evidenceCount: 3,
          lastObservedAt: '2026-07-05T08:00:00.000Z',
          formulaVersion: 'personalization-engine-v1',
        },
      ],
    } as never);

    const result = await service.load('auth_123');

    expect(result.userProfileId).toBe('profile_123');
    expect(result.healthContext.goal).toBe('muscle_gain');
    expect(result.coachDecision).toMatchObject({ priority: 'training' });
    expect(result.notification).toMatchObject({
      current: { type: 'coach_nudge', suppressed: false },
    });
    expect(result.habit).toBeDefined();
    expect(result.personalization).toMatchObject({
      preferredCoachingStyle: 'motivational',
    });
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(service.load('auth_123')).rejects.toBeInstanceOf(
      CreateCoachChatError,
    );
  });
});
