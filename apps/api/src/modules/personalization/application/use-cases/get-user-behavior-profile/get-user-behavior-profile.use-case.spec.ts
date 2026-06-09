import { GetUserBehaviorProfileError } from './get-user-behavior-profile.errors';
import { GET_USER_BEHAVIOR_PROFILE_ERROR_CODES } from './get-user-behavior-profile.errors';
import { GetUserBehaviorProfileUseCase } from './get-user-behavior-profile.use-case';

describe('GetUserBehaviorProfileUseCase', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let userBehaviorProfileRepository: { findByUserProfileId: jest.Mock };
  let buildUserBehaviorProfileUseCase: { execute: jest.Mock };
  let useCase: GetUserBehaviorProfileUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    userBehaviorProfileRepository = { findByUserProfileId: jest.fn() };
    buildUserBehaviorProfileUseCase = { execute: jest.fn() };

    userProfileRepository.findByAuthUserId.mockResolvedValue({ id: 'profile_123' });
    userBehaviorProfileRepository.findByUserProfileId.mockResolvedValue(null);
    buildUserBehaviorProfileUseCase.execute.mockResolvedValue({
      userBehaviorProfile: buildProfile('profile_123'),
    });

    useCase = new GetUserBehaviorProfileUseCase(
      userProfileRepository as never,
      userBehaviorProfileRepository as never,
      buildUserBehaviorProfileUseCase as never,
    );
  });

  it('returns the existing profile', async () => {
    userBehaviorProfileRepository.findByUserProfileId.mockResolvedValue(
      buildProfile('profile_123'),
    );

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildUserBehaviorProfileUseCase.execute).not.toHaveBeenCalled();
    expect(result.userBehaviorProfile.userProfileId).toBe('profile_123');
  });

  it('builds the profile when missing', async () => {
    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildUserBehaviorProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.userBehaviorProfile.userProfileId).toBe('profile_123');
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: GET_USER_BEHAVIOR_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });
});

function buildProfile(userProfileId: string) {
  return {
    id: 'profile_123',
    userProfileId,
    preferredCoachingStyle: { value: 'balanced' },
    notificationResponsiveness: { value: 'medium' },
    goalResponsiveness: { value: 'medium' },
    recoveryResponsiveness: { value: 'medium' },
    habitResponsiveness: { value: 'medium' },
    engagementProfile: { value: 'medium' },
    riskOfDisengagement: { value: 'medium' },
    formulaVersion: 'personalization-engine-v1',
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  } as never;
}
