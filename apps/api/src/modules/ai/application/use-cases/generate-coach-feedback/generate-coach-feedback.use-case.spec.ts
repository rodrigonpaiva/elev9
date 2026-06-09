import { CoachFeedbackRepository } from '../../../domain/repositories/coach-feedback.repository';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  COACH_FEEDBACK_GENERATOR_VERSION,
  CoachFeedbackGenerator,
  CoachFeedbackGeneratorInput,
} from '../../services/coach-feedback/coach-feedback-generator.service';
import {
  BuildUserHealthContextService,
  UserHealthContext,
} from '../../services/context-builder/build-user-health-context.service';
import { GetCurrentCoachDecisionUseCase } from '../get-current-coach-decision/get-current-coach-decision.use-case';
import { NotificationDecision } from '../../../../notifications/domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../../notifications/domain/value-objects/notification-influence.value-object';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { GENERATE_COACH_FEEDBACK_ERROR_CODES } from './generate-coach-feedback.errors';
import { GenerateCoachFeedbackUseCase } from './generate-coach-feedback.use-case';

describe('GenerateCoachFeedbackUseCase', () => {
  let coachFeedbackRepository: jest.Mocked<CoachFeedbackRepository>;
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
  let coachFeedbackGenerator: CoachFeedbackGenerator;
  let generateSpy: jest.SpiedFunction<CoachFeedbackGenerator['generate']>;
  let useCase: GenerateCoachFeedbackUseCase;

  beforeEach(() => {
    coachFeedbackRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserProfileId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
    };
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
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
    coachFeedbackGenerator = new CoachFeedbackGenerator();
    generateSpy = jest.spyOn(coachFeedbackGenerator, 'generate');

    useCase = new GenerateCoachFeedbackUseCase(
      coachFeedbackRepository,
      coachFeedbackGenerator,
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

  it('calls BuildUserHealthContextService and returns deterministic feedback with full data', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        weeklyFrequency: 4,
        averageWorkoutDuration: 38.75,
        currentStreak: 4,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [
          buildWorkoutLog('2026-05-01', 30, '2026-05-01T08:00:00.000Z'),
          buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
          buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
          buildWorkoutLog('2026-05-04', 50, '2026-05-04T08:00:00.000Z'),
        ],
      }),
    );
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

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(buildUserHealthContextService.build).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fatigueLevel: 'MODERATE',
        latestCheckIn: undefined,
        nutritionProfile: undefined,
        notification: expect.objectContaining({
          current: expect.objectContaining({
            type: 'coach_nudge',
            suppressed: false,
          }),
          engagementSummary: expect.objectContaining({
            engagementScore: 84,
          }),
        }),
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      message: "Great consistency this week. You're on a 4-day streak.",
      insights: expect.any(Array),
      recommendations: expect.any(Array),
      influences: expect.any(Array),
      generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
      contextSnapshot: expect.any(Object),
    });
    expect(result.message).toBe(
      "Great consistency this week. You're on a 4-day streak.",
    );
    expect(result).not.toHaveProperty('influences');
  });

  it('continues generating feedback with partial context', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        weeklyFrequency: 3,
        averageWorkoutDuration: 0,
        currentStreak: 0,
        activeTrainingPlanId: undefined,
        recentWorkoutLogs: [],
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.message).toBe(
      'You are ready to start your first training streak today.',
    );
  });

  it('uses activity-level fallback when weekly frequency is absent from context', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        activityLevel: 'high',
        weeklyFrequency: undefined,
        averageWorkoutDuration: 35,
        currentStreak: 1,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [
          buildWorkoutLog('2026-04-28', 30),
          buildWorkoutLog('2026-05-01', 35),
          buildWorkoutLog('2026-05-04', 40),
        ],
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.message).toBe(
      'You have room to rebuild your rhythm this week.',
    );
    expect(result.recommendations).toContain(
      'Schedule your next session within the next 24 hours',
    );
  });

  it('uses habit context as supporting coaching input', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        weeklyFrequency: 3,
        averageWorkoutDuration: 0,
        currentStreak: 0,
        activeTrainingPlanId: undefined,
        recentWorkoutLogs: [],
      }),
    );
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-05-04',
        consistencyScore: 38,
        streakDays: 1,
        adherenceScore: 42,
        trend: 'declining',
        sourceContext: {
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-05-04T10:00:00.000Z',
        },
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-05-04T10:00:00.000Z',
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
        updatedAt: '2026-05-04T10:00:00.000Z',
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
          generatedAt: '2026-05-04T10:00:00.000Z',
          formulaVersion: 'habit-engine-v1',
        } as never,
      ],
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
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
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          habitConsistencyScore: 38,
          habitTrend: 'declining',
          habitCurrentStreak: 1,
          habitRiskLevel: 'high',
        }),
      }),
    );
    expect(result.message).toBe(
      'You are ready to start your first training streak today.',
    );
  });

  it('returns USER_PROFILE_NOT_FOUND when user profile is missing', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        userProfileId: undefined,
        userName: undefined,
        goal: undefined,
        activityLevel: undefined,
        weeklyFrequency: undefined,
      }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns FITNESS_PROFILE_NOT_FOUND when fitness profile is missing', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        goal: undefined,
        activityLevel: undefined,
        weeklyFrequency: undefined,
      }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it('returns AUTH_INVALID_SESSION when authUserId is blank', async () => {
    await expect(
      useCase.execute({
        authUserId: '   ',
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('maps unexpected failures to AI_COACH_INTERNAL_ERROR', async () => {
    buildUserHealthContextService.build.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
    });
  });

  it('fails when coach feedback persistence fails', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
      }),
    );
    coachFeedbackRepository.create.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
    });
  });

  it('passes fatigueLevel from health context to the generator', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: 'HIGH',
        currentStreak: 6,
        averageWorkoutDuration: 80,
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fatigueLevel: 'HIGH',
      }) as CoachFeedbackGeneratorInput,
    );
  });

  it('passes latestCheckIn from health context to the generator', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 5,
          createdAt: new Date('2026-05-04T09:00:00.000Z'),
        },
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 5,
          createdAt: new Date('2026-05-04T09:00:00.000Z'),
        },
      }) as CoachFeedbackGeneratorInput,
    );
  });

  it('passes nutritionProfile from health context to the generator', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        nutritionProfile: {
          goal: 'muscle_gain',
          mealsPerDay: 4,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: ['rice', 'eggs'],
        },
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nutritionProfile: {
          goal: 'muscle_gain',
          mealsPerDay: 4,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: ['rice', 'eggs'],
        },
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      message: expect.any(String),
      insights: expect.any(Array),
      recommendations: expect.any(Array),
      influences: expect.any(Array),
      generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
      contextSnapshot: expect.any(Object),
    });
  });

  it('persists influences generated from context signals', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: 'HIGH',
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 3,
          createdAt: new Date('2026-05-04T09:00:00.000Z'),
        },
        nutritionProfile: {
          goal: 'fat_loss',
          mealsPerDay: 2,
          dietaryRestrictions: ['vegetarian'],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: [],
        },
        recentWorkoutLogs: [
          buildWorkoutLog('2026-05-02', 40),
          buildWorkoutLog('2026-05-04', 44),
        ],
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        influences: expect.arrayContaining([
          'fatigue:high',
          'recovery:needs_recovery',
          'checkin:low_energy',
          'checkin:poor_sleep',
          'checkin:high_soreness',
          'nutrition:fat_loss',
          'nutrition:low_meal_frequency',
          'nutrition:dietary_restrictions',
          'training:low_consistency',
        ]),
        contextSnapshot: expect.objectContaining({
          goal: 'gain_muscle',
          activityLevel: 'medium',
          hasTrainingPlan: true,
          fatigueLevel: 'HIGH',
          recoveryTrend: 'needs_recovery',
          weeklyFrequency: 4,
          currentStreak: 0,
          averageWorkoutDuration: 0,
          latestCheckIn: {
            energyLevel: 2,
            sleepQuality: 2,
            muscleSoreness: 4,
            motivationLevel: 3,
          },
          nutritionProfile: {
            goal: 'fat_loss',
            mealsPerDay: 2,
          },
          recentWorkoutLogs: [
            {
              date: '2026-05-02',
              durationMinutes: 40,
              createdAt: '2026-05-02T10:00:00.000Z',
            },
            {
              date: '2026-05-04',
              durationMinutes: 44,
              createdAt: '2026-05-04T10:00:00.000Z',
            },
          ],
        }),
        generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
      }),
    );
  });

  it('persists adaptive training recommendation fields in contextSnapshot', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        adaptiveTrainingRecommendation: {
          recommendationType: 'recovery_workout',
          recommendedIntensity: 'light',
          volumeAction: 'decrease',
          reasoning: 'Recovery is the best option today.',
          influences: [
            {
              code: 'HIGH_FATIGUE',
              label: 'Fatigue is elevated.',
              impact: 'negative',
            },
          ],
        },
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          adaptiveTrainingRecommendation: expect.objectContaining({
            recommendationType: 'recovery_workout',
            recommendedIntensity: 'light',
            volumeAction: 'decrease',
            reasoning: 'Recovery is the best option today.',
          }),
          adaptiveRecommendationType: 'recovery_workout',
          adaptiveRecommendedIntensity: 'light',
          adaptiveVolumeAction: 'decrease',
          adaptiveTrainingReasoning: 'Recovery is the best option today.',
        }),
      }),
    );
  });

  it('persists coach decision fields in contextSnapshot and passes them to the generator', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        currentStreak: 3,
      }),
    );
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: {
        id: 'decision_123',
        priority: 'recovery',
        headline: 'Recovery should be your focus today',
        summary: 'Recovery is the main priority because readiness is low.',
        actionItems: ['Reduce training intensity today', 'Prioritize sleep tonight'],
        influences: [
          {
            code: 'LOW_READINESS',
            label: 'Readiness is low.',
            impact: 'negative',
            source: 'recovery',
          },
        ],
        date: '2026-05-04',
        userProfileId: 'profile_123',
        formulaVersion: 'coach-decision-v1',
        generatedBy: 'deterministic',
        sourceContext: {
          readinessScore: 32,
          generatedAt: '2026-05-04T10:00:00.000Z',
        },
        createdAt: new Date('2026-05-04T10:00:00.000Z'),
        updatedAt: new Date('2026-05-04T10:00:00.000Z'),
      } as never,
    } as never);

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        coachDecision: expect.objectContaining({
          priority: 'recovery',
          headline: 'Recovery should be your focus today',
        }),
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          coachDecisionId: 'decision_123',
          coachDecisionPriority: 'recovery',
          coachDecisionHeadline: 'Recovery should be your focus today',
          coachDecisionActionItems: [
            'Reduce training intensity today',
            'Prioritize sleep tonight',
          ],
          coachDecisionInfluences: expect.arrayContaining([
            expect.objectContaining({
              code: 'LOW_READINESS',
            }),
          ]),
        }),
      }),
    );
  });

  it('does not persist sensitive fields in contextSnapshot', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        userName: 'Rodrigo Paiva',
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 5,
          createdAt: new Date('2026-05-04T09:00:00.000Z'),
        },
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.not.objectContaining({
          authUserId: expect.anything(),
          userProfileId: expect.anything(),
          userName: expect.anything(),
          latestCheckIn: expect.not.objectContaining({
            createdAt: expect.anything(),
          }),
        }),
      }),
    );
  });

  it('falls back when coach decision resolution fails', async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        currentStreak: 2,
      }),
    );
    getCurrentCoachDecisionUseCase.execute.mockRejectedValue(
      new Error('decision unavailable'),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.message).toBe(
      'You are ready to start your first training streak today.',
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.not.objectContaining({
          coachDecisionId: expect.anything(),
          coachDecisionPriority: expect.anything(),
        }),
      }),
    );
  });
});

function buildWorkoutLog(
  date: string,
  durationMinutes: number,
  createdAt = `${date}T10:00:00.000Z`,
): WorkoutLog {
  return new WorkoutLog({
    id: `${date}-${durationMinutes}`,
    trainingPlanId: 'training_123',
    workoutDayIndex: 1,
    durationMinutes,
    completedExercises: [],
    date,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}

function buildNotificationDecision(): NotificationDecision {
  return new NotificationDecision({
    id: 'notification_123',
    userProfileId: 'profile_123',
    date: '2026-05-04',
    type: 'coach_nudge',
    priority: 'low',
    channel: 'in_app',
    status: 'planned',
    title: 'Small action, big progress',
    message: 'Keep the next step simple and consistent.',
    influences: [
      new NotificationInfluence({
        code: 'COACH_CONSISTENCY_NUDGE',
        label: 'Coach consistency nudge',
        impact: 'neutral',
        source: 'coach',
      }),
    ],
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
      generatedAt: '2026-05-04T10:00:00.000Z',
    },
    suppressed: false,
    suppressionReasons: [],
    fatigueLevel: 'low',
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  });
}

function buildNotificationDecision(): NotificationDecision {
  return new NotificationDecision({
    id: 'notification_123',
    userProfileId: 'profile_123',
    date: '2026-05-04',
    type: 'coach_nudge',
    priority: 'low',
    channel: 'in_app',
    status: 'planned',
    title: 'Small action, big progress',
    message: 'Keep the next step simple and consistent.',
    influences: [
      new NotificationInfluence({
        code: 'COACH_CONSISTENCY_NUDGE',
        label: 'Coach consistency nudge',
        impact: 'neutral',
        source: 'coach',
      }),
    ],
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
      generatedAt: '2026-05-04T10:00:00.000Z',
    },
    suppressed: false,
    suppressionReasons: [],
    fatigueLevel: 'low',
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  });
}

function buildHealthContext(
  overrides: Partial<UserHealthContext> = {},
): UserHealthContext {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Rodrigo Paiva',
    goal: 'gain_muscle',
    activityLevel: 'medium',
    weeklyFrequency: 4,
    adherenceScore: 0,
    currentStreak: 0,
    averageWorkoutDuration: 0,
    fatigueLevel: 'MODERATE',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_123',
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-05-04T10:00:00.000Z'),
    ...overrides,
  };
}
