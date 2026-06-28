import { BuildUserBehaviorProfileError } from './build-user-behavior-profile.errors';
import { BuildUserBehaviorProfileUseCase } from './build-user-behavior-profile.use-case';

describe('BuildUserBehaviorProfileUseCase', () => {
  let useCase: BuildUserBehaviorProfileUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let personalizationSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let behavioralPatternRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let userBehaviorProfileRepository: {
    upsertByUserProfileId: jest.Mock;
  };
  let personalizationCalculatorService: {
    calculate: jest.Mock;
  };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    personalizationSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    behavioralPatternRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    userBehaviorProfileRepository = {
      upsertByUserProfileId: jest.fn(),
    };
    personalizationCalculatorService = {
      calculate: jest.fn(),
    };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([]);
    personalizationCalculatorService.calculate.mockReturnValue({
      preferredCoachingStyle: 'balanced',
      engagementProfile: 'medium',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'medium',
      behavioralPatterns: [],
      trend: 'stable',
      compositeScore: 50,
      formulaVersion: 'personalization-engine-v1',
    });
    userBehaviorProfileRepository.upsertByUserProfileId.mockImplementation(
      async (input: unknown) => input,
    );

    useCase = new BuildUserBehaviorProfileUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
      behavioralPatternRepository as never,
      userBehaviorProfileRepository as never,
      personalizationCalculatorService as never,
    );
  });

  it('creates or updates a profile from the latest snapshot and patterns', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      {
        preferredCoachingStyle: { value: 'balanced' },
        engagementProfile: { value: 'medium' },
        notificationResponsiveness: { value: 'medium' },
        goalResponsiveness: { value: 'medium' },
        recoveryResponsiveness: { value: 'medium' },
        habitResponsiveness: { value: 'medium' },
        riskOfDisengagement: { value: 'low' },
        formulaVersion: 'personalization-engine-v1',
      },
    );
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([
      {
        type: { value: 'high_dismissal_behavior' },
        confidence: { value: 'high' },
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(
      userBehaviorProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      preferredCoachingStyle: 'balanced',
      engagementProfile: 'medium',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'high',
      formulaVersion: 'personalization-engine-v1',
    });
    expect(result.userBehaviorProfile).toEqual({
      userProfileId: 'profile_123',
      preferredCoachingStyle: 'balanced',
      engagementProfile: 'medium',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'high',
      formulaVersion: 'personalization-engine-v1',
    });
  });

  it('falls back to patterns when there is no snapshot', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([
      {
        type: { value: 'responds_to_goals' },
        confidence: { value: 'high' },
      },
      {
        type: { value: 'responds_to_streaks' },
        confidence: { value: 'high' },
      },
      {
        type: { value: 'consistent_check_in_behavior' },
        confidence: { value: 'high' },
      },
    ]);

    await useCase.execute({ authUserId: 'auth_123' });

    expect(
      userBehaviorProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      preferredCoachingStyle: 'motivational',
      engagementProfile: 'high',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'medium',
      formulaVersion: 'personalization-engine-v1',
    });
  });

  it('uses the neutral fallback when snapshot and patterns are missing', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([]);

    await useCase.execute({ authUserId: 'auth_123' });

    expect(personalizationCalculatorService.calculate).toHaveBeenCalledWith({});
    expect(
      userBehaviorProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredCoachingStyle: 'balanced',
        engagementProfile: 'medium',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'medium',
        formulaVersion: 'personalization-engine-v1',
      }),
    );
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });
});
