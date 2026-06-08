import { GetHabitRiskSignalsError } from './get-habit-risk-signals.errors';
import { GetHabitRiskSignalsUseCase } from './get-habit-risk-signals.use-case';

describe('GetHabitRiskSignalsUseCase', () => {
  let useCase: GetHabitRiskSignalsUseCase;

  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let habitRiskSignalRepository: { findRecentByUserProfileId: jest.Mock };
  let buildHabitRiskSignalsUseCase: { execute: jest.Mock };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitRiskSignalRepository = {
      findRecentByUserProfileId: jest.fn(),
    };
    buildHabitRiskSignalsUseCase = {
      execute: jest.fn(),
    };

    useCase = new GetHabitRiskSignalsUseCase(
      userProfileRepository as never,
      habitRiskSignalRepository as never,
      buildHabitRiskSignalsUseCase as never,
    );
  });

  it('returns existing risk signals', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitRiskSignalRepository.findRecentByUserProfileId.mockResolvedValue([
      { type: 'dropout_risk' },
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(habitRiskSignalRepository.findRecentByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 30 },
    );
    expect(buildHabitRiskSignalsUseCase.execute).not.toHaveBeenCalled();
    expect(result.habitRiskSignals).toHaveLength(1);
  });

  it('builds risk signals when missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitRiskSignalRepository.findRecentByUserProfileId.mockResolvedValue([]);
    buildHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [{ type: 'dropout_risk' }],
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(buildHabitRiskSignalsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.habitRiskSignals).toHaveLength(1);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toBeInstanceOf(GetHabitRiskSignalsError);
  });
});
