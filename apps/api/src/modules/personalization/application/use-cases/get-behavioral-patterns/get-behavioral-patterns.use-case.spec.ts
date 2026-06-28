import { GetBehavioralPatternsError } from './get-behavioral-patterns.errors';
import { GET_BEHAVIORAL_PATTERNS_ERROR_CODES } from './get-behavioral-patterns.errors';
import { GetBehavioralPatternsUseCase } from './get-behavioral-patterns.use-case';

describe('GetBehavioralPatternsUseCase', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let behavioralPatternRepository: { findManyByUserProfileId: jest.Mock };
  let buildBehavioralPatternsUseCase: { execute: jest.Mock };
  let useCase: GetBehavioralPatternsUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    behavioralPatternRepository = { findManyByUserProfileId: jest.fn() };
    buildBehavioralPatternsUseCase = { execute: jest.fn() };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([]);
    buildBehavioralPatternsUseCase.execute.mockResolvedValue({
      behavioralPatterns: [buildPattern('responds_to_goals')],
    });

    useCase = new GetBehavioralPatternsUseCase(
      userProfileRepository as never,
      behavioralPatternRepository as never,
      buildBehavioralPatternsUseCase as never,
    );
  });

  it('returns existing patterns', async () => {
    behavioralPatternRepository.findManyByUserProfileId.mockResolvedValue([
      buildPattern('responds_to_goals'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildBehavioralPatternsUseCase.execute).not.toHaveBeenCalled();
    expect(result.behavioralPatterns).toHaveLength(1);
  });

  it('builds patterns when missing', async () => {
    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildBehavioralPatternsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.behavioralPatterns).toHaveLength(1);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: GET_BEHAVIORAL_PATTERNS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });
});

function buildPattern(type: string) {
  return {
    id: 'pattern_123',
    userProfileId: 'profile_123',
    type: { value: type },
    confidence: { value: 'high' },
    evidenceCount: 1,
    lastObservedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'personalization-engine-v1',
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  } as never;
}
