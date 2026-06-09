import {
  REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES,
  ReplayPersonalizationSnapshotError,
} from './replay-personalization-snapshot.errors';
import { ReplayPersonalizationSnapshotUseCase } from './replay-personalization-snapshot.use-case';
import type { ReplayPersonalizationSnapshotRecalculated } from './replay-personalization-snapshot.output';

describe('ReplayPersonalizationSnapshotUseCase', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let personalizationSnapshotRepository: { findById: jest.Mock };
  let personalizationCalculatorService: { calculate: jest.Mock };
  let useCase: ReplayPersonalizationSnapshotUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    personalizationSnapshotRepository = { findById: jest.fn() };
    personalizationCalculatorService = { calculate: jest.fn() };

    userProfileRepository.findByAuthUserId.mockResolvedValue({ id: 'profile_123' });
    personalizationSnapshotRepository.findById.mockResolvedValue(
      buildSnapshot('snapshot_123'),
    );
    personalizationCalculatorService.calculate.mockReturnValue(buildRecalculated());

    useCase = new ReplayPersonalizationSnapshotUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
      personalizationCalculatorService as never,
    );
  });

  it('returns a replay result with no drift when recalculated data matches persisted data', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_123',
      personalizationSnapshotId: 'snapshot_123',
    });

    expect(personalizationCalculatorService.calculate).toHaveBeenCalledWith({
      engagementScore: 78,
      notificationDismissalRate: 12,
      notificationCompletionRate: 74,
      consistencyScore: 81,
      habitTrend: 'improving',
      habitRiskLevel: 'low',
      goalTrend: 'improving',
      goalMilestoneReached: true,
      goalAchievementReached: false,
      recoveryTrend: 'stable',
      recoveryAlertEngagement: 66,
      coachDecisionPriorityHistory: ['consistency', 'motivation'],
      activityHourDistribution: { morning: 2, afternoon: 1, evening: 0 },
      previousSnapshotScore: 72,
    });
    expect(result.comparison.matches).toBe(true);
    expect(result.comparison.differences).toHaveLength(0);
    expect(result.persisted.id).toBe('snapshot_123');
  });

  it.each([
    ['preferredCoachingStyle', { preferredCoachingStyle: 'direct' }],
    ['engagementProfile', { engagementProfile: 'low' }],
    ['notificationResponsiveness', { notificationResponsiveness: 'low' }],
    ['goalResponsiveness', { goalResponsiveness: 'low' }],
    ['recoveryResponsiveness', { recoveryResponsiveness: 'low' }],
    ['habitResponsiveness', { habitResponsiveness: 'low' }],
    ['riskOfDisengagement', { riskOfDisengagement: 'high' }],
    ['trend', { trend: 'declining' }],
    ['formulaVersion', { formulaVersion: 'personalization-engine-v0' }],
  ] as const)(
    'detects %s drift',
    async (field, recalculatedPatch) => {
      personalizationCalculatorService.calculate.mockReturnValue(
        buildRecalculated(recalculatedPatch),
      );

      const result = await useCase.execute({
        authUserId: 'auth_123',
        personalizationSnapshotId: 'snapshot_123',
      });

      expect(result.comparison.matches).toBe(false);
      expect(result.comparison.differences).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field }),
        ]),
      );
    },
  );

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        personalizationSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('throws when the snapshot is missing', async () => {
    personalizationSnapshotRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        personalizationSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.PERSONALIZATION_SNAPSHOT_NOT_FOUND,
    });
  });

  it('throws when the snapshot belongs to another user', async () => {
    personalizationSnapshotRepository.findById.mockResolvedValue(
      buildSnapshot('snapshot_123', 'profile_other'),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        personalizationSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.PERSONALIZATION_SNAPSHOT_NOT_FOUND,
    });
  });

  it('does not mutate the persisted snapshot', async () => {
    const persisted = buildSnapshot('snapshot_123');
    personalizationSnapshotRepository.findById.mockResolvedValue(persisted);

    await useCase.execute({
      authUserId: 'auth_123',
      personalizationSnapshotId: 'snapshot_123',
    });

    expect(persisted.toJSON()).toEqual(buildSnapshot('snapshot_123').toJSON());
  });

  it('uses sourceContext only when recalculating', async () => {
    await useCase.execute({
      authUserId: 'auth_123',
      personalizationSnapshotId: 'snapshot_123',
    });

    expect(personalizationCalculatorService.calculate).toHaveBeenCalledTimes(1);
  });

  it('rejects missing auth user ids', async () => {
    await expect(
      useCase.execute({
        authUserId: '   ',
        personalizationSnapshotId: 'snapshot_123',
      }),
    ).rejects.toBeInstanceOf(ReplayPersonalizationSnapshotError);
  });

  it('rejects missing snapshot ids', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        personalizationSnapshotId: '   ',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
    });
  });
});

function buildSnapshot(id: string, userProfileId = 'profile_123') {
  const snapshot = {
    id,
    userProfileId,
    date: '2026-06-03',
    preferredCoachingStyle: 'balanced',
    engagementProfile: 'high',
    notificationResponsiveness: 'high',
    goalResponsiveness: 'high',
    recoveryResponsiveness: 'medium',
    habitResponsiveness: 'high',
    riskOfDisengagement: 'low',
    trend: 'improving',
    sourceContext: {
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
      engagementScore: 78,
      notificationDismissalRate: 12,
      notificationCompletionRate: 74,
      consistencyScore: 81,
      habitTrend: 'improving',
      habitRiskLevel: 'low',
      goalTrend: 'improving',
      goalMilestoneReached: true,
      goalAchievementReached: false,
      recoveryTrend: 'stable',
      recoveryAlertEngagement: 66,
      coachDecisionPriorityHistory: ['consistency', 'motivation'],
      activityHourDistribution: {
        morning: 2,
        afternoon: 1,
        evening: 0,
      },
      previousSnapshotScore: 72,
    },
    formulaVersion: 'personalization-engine-v1',
    generatedAt: '2026-06-03T00:00:00.000Z',
  };

  return {
    ...snapshot,
    toJSON() {
      return snapshot;
    },
  } as never;
}

function buildRecalculated(
  patch: Partial<ReplayPersonalizationSnapshotRecalculated> = {},
): ReplayPersonalizationSnapshotRecalculated {
  return {
    preferredCoachingStyle: 'balanced',
    engagementProfile: 'high',
    notificationResponsiveness: 'high',
    goalResponsiveness: 'high',
    recoveryResponsiveness: 'medium',
    habitResponsiveness: 'high',
    riskOfDisengagement: 'low',
    trend: 'improving',
    formulaVersion: 'personalization-engine-v1',
    ...patch,
  } as never;
}
