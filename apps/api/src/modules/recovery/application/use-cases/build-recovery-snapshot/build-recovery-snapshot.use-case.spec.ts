import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlan } from '../../../../training/domain/entities/training-plan.entity';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import {
  RecoveryInfluence,
  RecoverySnapshot,
} from '../../../domain/entities/recovery-snapshot.entity';
import { RecoverySnapshotRepository } from '../../../domain/repositories/recovery-snapshot.repository';
import { RecoveryDateService } from '../../services/recovery-date.service';
import { RecoveryScoreCalculatorService } from '../../services/recovery-score-calculator.service';
import {
  BUILD_RECOVERY_SNAPSHOT_ERROR_CODES,
} from './build-recovery-snapshot.errors';
import { BuildRecoverySnapshotUseCase } from './build-recovery-snapshot.use-case';

describe('BuildRecoverySnapshotUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let recoveryScoreCalculatorService: jest.Mocked<RecoveryScoreCalculatorService>;
  let recoveryDateService: RecoveryDateService;
  let useCase: BuildRecoverySnapshotUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    trainingPlanRepository = buildTrainingPlanRepository();
    dailyCheckInRepository = buildDailyCheckInRepository();
    workoutLogRepository = buildWorkoutLogRepository();
    recoverySnapshotRepository = buildRecoverySnapshotRepository();
    recoveryScoreCalculatorService = buildRecoveryScoreCalculatorService();
    recoveryDateService = new RecoveryDateService();

    useCase = new BuildRecoverySnapshotUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      dailyCheckInRepository,
      workoutLogRepository,
      recoverySnapshotRepository,
      recoveryScoreCalculatorService,
      recoveryDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds and persists a snapshot from recent check-ins and workout logs', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeDailyCheckIns();
    arrangeWorkoutLogs();
    arrangePreviousSnapshots();
    arrangeCalculatorResult();
    const persistedSnapshot = buildRecoverySnapshot();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      persistedSnapshot,
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(userProfileRepository.findByAuthUserId).toHaveBeenCalledWith(
      'auth_user_123',
    );
    expect(fitnessProfileRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
    );
    expect(trainingPlanRepository.findActiveByFitnessProfileId).toHaveBeenCalledWith(
      'fitness_123',
    );
    expect(
      recoveryScoreCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sleepQuality: 4,
        energyLevel: 5,
        muscleSoreness: 2,
        adherenceScore: 100,
        recentWorkoutLoad: 80,
        currentStreak: 3,
        missedWorkouts: 0,
        previousReadinessScores: [82, 80],
      }),
    );
    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        date: '2026-06-02',
        formulaVersion: 'recovery-deterministic-v1',
        generatedBy: 'deterministic',
        sourceContext: expect.objectContaining({
          sleepQuality: 4,
          energyLevel: 5,
          muscleSoreness: 2,
          adherenceScore: 100,
          recentWorkoutLoad: 80,
          currentStreak: 3,
          missedWorkouts: 0,
          recentCheckInsCount: 2,
          recentWorkoutLogsCount: 3,
          trainingPlanId: 'training_123',
          formulaVersion: 'recovery-deterministic-v1',
          generatedAt: '2026-06-02T10:00:00.000Z',
        }),
        influences: expect.arrayContaining([
          expect.objectContaining({ code: 'HIGH_ADHERENCE' }),
        ]),
      }),
    );
    expect(result.recoverySnapshot).toBe(persistedSnapshot);
  });

  it('uses neutral fallbacks when no check-ins exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    arrangeCalculatorResult();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoveryScoreCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        sleepQuality: undefined,
        energyLevel: undefined,
        muscleSoreness: undefined,
      }),
    );
    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: expect.objectContaining({
          sleepQuality: 3,
          energyLevel: 3,
          muscleSoreness: 3,
        }),
      }),
    );
  });

  it('uses neutral fallbacks when no workout logs exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeDailyCheckIns();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    arrangeCalculatorResult();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoveryScoreCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        recentWorkoutLoad: undefined,
      }),
    );
    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: expect.objectContaining({
          recentWorkoutLoad: 50,
          recentWorkoutLogsCount: 0,
        }),
      }),
    );
  });

  it('does not fail when no training plan exists', async () => {
    arrangeUserProfile();
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    arrangeDailyCheckIns();
    arrangeCalculatorResult();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).resolves.toMatchObject({
      recoverySnapshot: expect.any(RecoverySnapshot),
    });

    expect(
      trainingPlanRepository.findActiveByFitnessProfileId,
    ).not.toHaveBeenCalled();
    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: expect.objectContaining({
          trainingPlanId: undefined,
        }),
      }),
    );
  });

  it('includes previous readiness scores in the calculator trend input', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeDailyCheckIns();
    arrangeWorkoutLogs();
    recoverySnapshotRepository.findRecentByUserProfileId.mockResolvedValue([
      buildRecoverySnapshot({ date: '2026-06-02', readinessScore: 91 }),
      buildRecoverySnapshot({ date: '2026-06-01', readinessScore: 82 }),
      buildRecoverySnapshot({ date: '2026-05-31', readinessScore: 80 }),
    ]);
    arrangeCalculatorResult();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoveryScoreCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        previousReadinessScores: [82, 80],
      }),
    );
  });

  it('persists via daily upsert and keeps the same date on repeated runs', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeDailyCheckIns();
    arrangeWorkoutLogs();
    arrangePreviousSnapshots();
    arrangeCalculatorResult();
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });
    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledTimes(
      2,
    );
    expect(
      recoverySnapshotRepository.upsertDailySnapshot.mock.calls[0][0].date,
    ).toBe('2026-06-02');
    expect(
      recoverySnapshotRepository.upsertDailySnapshot.mock.calls[1][0].date,
    ).toBe('2026-06-02');
  });

  it('uses the isolated date helper', () => {
    expect(
      recoveryDateService.todayUtcDateString(
        new Date('2026-06-02T10:00:00.000Z'),
      ),
    ).toBe(
      '2026-06-02',
    );
  });

  it('returns invalid session when auth user id is missing', async () => {
    await expect(useCase.execute({ authUserId: '  ' })).rejects.toMatchObject({
      code: BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('returns user profile not found when the authenticated user does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('includes calculator influences in the persisted snapshot', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeDailyCheckIns();
    arrangeWorkoutLogs();
    arrangePreviousSnapshots();
    arrangeCalculatorResult({
      influences: [
        new RecoveryInfluence({
          code: 'HIGH_ADHERENCE',
          label: 'Recent adherence is strong.',
          impact: 'positive',
          weight: 0.15,
          value: 100,
        }),
      ],
    });
    recoverySnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildRecoverySnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoverySnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        influences: [
          {
            code: 'HIGH_ADHERENCE',
            label: 'Recent adherence is strong.',
            impact: 'positive',
            weight: 0.15,
            value: 100,
          },
        ],
      }),
    );
  });

  function arrangeUserProfile(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
      }),
    );
  }

  function arrangeFitnessProfile(): void {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 178,
        weightKg: 78,
        goal: 'gain_muscle',
        activityLevel: 'high',
        trainingAvailability: {
          daysPerWeek: 3,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
      }),
    );
  }

  function arrangeTrainingPlan(): void {
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: 'training_123',
        fitnessProfileId: 'fitness_123',
        goal: 'gain_muscle',
        activityLevel: 'high',
        weeklySchedule: [
          {
            dayIndex: 1,
            title: 'Upper Body Strength',
            focus: 'upper_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [],
          },
          {
            dayIndex: 2,
            title: 'Lower Body Strength',
            focus: 'lower_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [],
          },
          {
            dayIndex: 3,
            title: 'Full Body Strength',
            focus: 'full_body_strength',
            format: 'strength',
            intensity: 'moderate',
            exercises: [],
          },
        ],
        status: 'active',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
  }

  function arrangeDailyCheckIns(): void {
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      new DailyCheckIn({
        id: 'checkin_today',
        userProfileId: 'profile_123',
        energyLevel: 5,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 4,
        createdAt: new Date('2026-06-02T08:00:00.000Z'),
        updatedAt: new Date('2026-06-02T08:00:00.000Z'),
      }),
      new DailyCheckIn({
        id: 'checkin_previous',
        userProfileId: 'profile_123',
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 4,
        createdAt: new Date('2026-06-01T08:00:00.000Z'),
        updatedAt: new Date('2026-06-01T08:00:00.000Z'),
      }),
    ]);
  }

  function arrangeWorkoutLogs(): void {
    const logs = [
      buildWorkoutLog('2026-05-31', 30),
      buildWorkoutLog('2026-06-01', 30),
      buildWorkoutLog('2026-06-02', 30),
    ];

    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      logs,
    );
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue(logs);
  }

  function arrangePreviousSnapshots(): void {
    recoverySnapshotRepository.findRecentByUserProfileId.mockResolvedValue([
      buildRecoverySnapshot({ date: '2026-06-02', readinessScore: 91 }),
      buildRecoverySnapshot({ date: '2026-06-01', readinessScore: 82 }),
      buildRecoverySnapshot({ date: '2026-05-31', readinessScore: 80 }),
    ]);
  }

  function arrangeCalculatorResult(
    overrides: Partial<{
      influences: RecoveryInfluence[];
    }> = {},
  ): void {
    recoveryScoreCalculatorService.calculate.mockReturnValue({
      readinessScore: 88,
      fatigueScore: 22,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences:
        overrides.influences ??
        [
          new RecoveryInfluence({
            code: 'HIGH_ADHERENCE',
            label: 'Recent adherence is strong.',
            impact: 'positive',
            weight: 0.15,
            value: 100,
          }),
        ],
    });
  }

  function buildWorkoutLog(date: string, durationMinutes: number): WorkoutLog {
    return new WorkoutLog({
      id: `workout_${date}`,
      trainingPlanId: 'training_123',
      workoutDayIndex: 1,
      durationMinutes,
      completedExercises: [
        {
          name: 'push_up',
          setsDone: 3,
          repsDone: 10,
        },
      ],
      date,
      createdAt: new Date(`${date}T18:00:00.000Z`),
      updatedAt: new Date(`${date}T18:00:00.000Z`),
    });
  }

  function buildRecoverySnapshot(
    overrides: Partial<ConstructorParameters<typeof RecoverySnapshot>[0]> = {},
  ): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile_123',
      date: '2026-06-01',
      readinessScore: 82,
      fatigueScore: 24,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [
        new RecoveryInfluence({
          code: 'HIGH_ADHERENCE',
          label: 'Recent adherence is strong.',
          impact: 'positive',
          weight: 0.15,
          value: 100,
        }),
      ],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {
        sleepQuality: 4,
        energyLevel: 5,
        muscleSoreness: 2,
        adherenceScore: 100,
        recentWorkoutLoad: 80,
        currentStreak: 3,
        missedWorkouts: 0,
        recentCheckInsCount: 2,
        recentWorkoutLogsCount: 3,
        trainingPlanId: 'training_123',
        formulaVersion: 'recovery-deterministic-v1',
        generatedAt: '2026-06-02T10:00:00.000Z',
      },
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      ...overrides,
    });
  }

  function buildUserProfileRepository(): jest.Mocked<UserProfileRepository> {
    return {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
  }

  function buildFitnessProfileRepository(): jest.Mocked<FitnessProfileRepository> {
    return {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
  }

  function buildTrainingPlanRepository(): jest.Mocked<TrainingPlanRepository> {
    return {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TrainingPlanRepository>;
  }

  function buildDailyCheckInRepository(): jest.Mocked<DailyCheckInRepository> {
    return {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<DailyCheckInRepository>;
  }

  function buildWorkoutLogRepository(): jest.Mocked<WorkoutLogRepository> {
    return {
      create: jest.fn(),
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
    } as unknown as jest.Mocked<WorkoutLogRepository>;
  }

  function buildRecoverySnapshotRepository(): jest.Mocked<RecoverySnapshotRepository> {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn().mockResolvedValue([]),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<RecoverySnapshotRepository>;
  }

  function buildRecoveryScoreCalculatorService(): jest.Mocked<RecoveryScoreCalculatorService> {
    return {
      calculate: jest.fn(),
    } as unknown as jest.Mocked<RecoveryScoreCalculatorService>;
  }
});
