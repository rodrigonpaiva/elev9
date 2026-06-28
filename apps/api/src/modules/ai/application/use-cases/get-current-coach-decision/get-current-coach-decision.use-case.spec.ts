import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { BuildCoachDecisionUseCase } from '../build-coach-decision/build-coach-decision.use-case';
import { GetCurrentCoachDecisionUseCase } from './get-current-coach-decision.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('GetCurrentCoachDecisionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let buildCoachDecisionUseCase: jest.Mocked<BuildCoachDecisionUseCase>;
  let useCase: GetCurrentCoachDecisionUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachDecisionRepository = {
      findLatestByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionRepository>;
    buildCoachDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildCoachDecisionUseCase>;

    useCase = new GetCurrentCoachDecisionUseCase(
      userProfileRepository,
      coachDecisionRepository,
      buildCoachDecisionUseCase,
    );
  });

  it('returns the latest decision when available', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDecision('decision_123'),
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(result.coachDecision.id).toBe('decision_123');
    expect(buildCoachDecisionUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds a decision when there is no latest one', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachDecisionRepository.findLatestByUserProfileId.mockResolvedValue(null);
    buildCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildDecision('decision_123'),
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(buildCoachDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.coachDecision.id).toBe('decision_123');
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
