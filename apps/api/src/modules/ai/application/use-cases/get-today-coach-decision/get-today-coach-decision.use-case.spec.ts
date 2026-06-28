import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { BuildCoachDecisionUseCase } from '../build-coach-decision/build-coach-decision.use-case';
import { CoachDecisionDateService } from '../../services/coach-decision-date.service';
import { GetTodayCoachDecisionUseCase } from './get-today-coach-decision.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('GetTodayCoachDecisionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let buildCoachDecisionUseCase: jest.Mocked<BuildCoachDecisionUseCase>;
  let dateService: jest.Mocked<CoachDecisionDateService>;
  let useCase: GetTodayCoachDecisionUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachDecisionRepository = {
      findByUserProfileIdAndDate: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionRepository>;
    buildCoachDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildCoachDecisionUseCase>;
    dateService = {
      todayUtcDateString: jest.fn().mockReturnValue('2026-06-02'),
    } as unknown as jest.Mocked<CoachDecisionDateService>;

    useCase = new GetTodayCoachDecisionUseCase(
      userProfileRepository,
      coachDecisionRepository,
      buildCoachDecisionUseCase,
      dateService,
    );
  });

  it('returns an existing decision for today', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachDecisionRepository.findByUserProfileIdAndDate.mockResolvedValue(
      buildDecision(),
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(result.coachDecision.id).toBe('decision_123');
    expect(buildCoachDecisionUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds a decision when none exists for today', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachDecisionRepository.findByUserProfileIdAndDate.mockResolvedValue(null);
    buildCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildDecision(),
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(dateService.todayUtcDateString).toHaveBeenCalled();
    expect(buildCoachDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.coachDecision.id).toBe('decision_123');
  });

  it('keeps today idempotent across repeated calls', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachDecisionRepository.findByUserProfileIdAndDate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildDecision());
    buildCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildDecision(),
    } as never);

    await useCase.execute({
      authUserId: 'auth_123',
    });
    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(buildCoachDecisionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(
      coachDecisionRepository.findByUserProfileIdAndDate,
    ).toHaveBeenCalledTimes(2);
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

function buildDecision() {
  return new CoachDecision({
    id: 'decision_123',
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
