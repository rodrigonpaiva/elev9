import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { GetCoachDecisionHistoryUseCase } from './get-coach-decision-history.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('GetCoachDecisionHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let useCase: GetCoachDecisionHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachDecisionRepository = {
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionRepository>;

    useCase = new GetCoachDecisionHistoryUseCase(
      userProfileRepository,
      coachDecisionRepository,
    );
  });

  it('returns the history in order', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(buildUserProfile());
    coachDecisionRepository.findManyByUserProfileId.mockResolvedValue([
      buildDecision('decision_1'),
      buildDecision('decision_2'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(result.coachDecisions).toHaveLength(2);
    expect(coachDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
  });

  it('applies the default limit of 14', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(buildUserProfile());
    coachDecisionRepository.findManyByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(coachDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
  });

  it('rejects invalid limits', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        limit: 91,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_LIMIT',
    });
  });

  it('isolates history by user', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(buildUserProfile());
    coachDecisionRepository.findManyByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'another_auth',
      limit: 2,
    });

    expect(coachDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 2 },
    );
  });

  it('throws when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });
});

function buildUserProfile() {
  return { id: 'profile_123' } as never;
}

function buildDecision(id: string) {
  return new CoachDecision({
    id,
    userProfileId: 'profile_123',
    date: '2026-06-02',
    priority: 'motivation',
    headline: 'Keep building momentum',
    summary: 'Signals are stable.',
    actionItems: ['Continue the current plan', 'Stay consistent'],
    influences: [],
    sourceContext: { generatedAt: '2026-06-02T06:00:00.000Z' },
    formulaVersion: 'coach-decision-v1',
    generatedBy: 'deterministic',
    llmMetadata: { used: false },
    createdAt: new Date('2026-06-02T06:00:00.000Z'),
    updatedAt: new Date('2026-06-02T06:00:00.000Z'),
  });
}
