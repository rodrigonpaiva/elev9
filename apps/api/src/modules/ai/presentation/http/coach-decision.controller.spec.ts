import { GetCurrentCoachDecisionUseCase } from '../../application/use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCoachDecisionHistoryUseCase } from '../../application/use-cases/get-coach-decision-history/get-coach-decision-history.use-case';
import { GetCoachDecisionHistoryError } from '../../application/use-cases/get-coach-decision-history/get-coach-decision-history.errors';
import { GetTodayCoachDecisionUseCase } from '../../application/use-cases/get-today-coach-decision/get-today-coach-decision.use-case';
import { REPLAY_COACH_DECISION_ERROR_CODES, ReplayCoachDecisionError } from '../../application/use-cases/replay-coach-decision/replay-coach-decision.errors';
import { ReplayCoachDecisionUseCase } from '../../application/use-cases/replay-coach-decision/replay-coach-decision.use-case';
import { CoachDecisionController } from './coach-decision.controller';
import { CoachDecision } from '../../domain/entities/coach-decision.entity';

describe('CoachDecisionController', () => {
  let getTodayCoachDecisionUseCase: jest.Mocked<GetTodayCoachDecisionUseCase>;
  let getCurrentCoachDecisionUseCase: jest.Mocked<GetCurrentCoachDecisionUseCase>;
  let getCoachDecisionHistoryUseCase: jest.Mocked<GetCoachDecisionHistoryUseCase>;
  let replayCoachDecisionUseCase: jest.Mocked<ReplayCoachDecisionUseCase>;
  let controller: CoachDecisionController;

  beforeEach(() => {
    getTodayCoachDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayCoachDecisionUseCase>;
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentCoachDecisionUseCase>;
    getCoachDecisionHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachDecisionHistoryUseCase>;
    replayCoachDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplayCoachDecisionUseCase>;

    controller = new CoachDecisionController(
      getTodayCoachDecisionUseCase,
      getCurrentCoachDecisionUseCase,
      getCoachDecisionHistoryUseCase,
      replayCoachDecisionUseCase,
    );
  });

  it('calls the today use case with the authenticated user', async () => {
    getTodayCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildDecision('decision_123'),
    } as never);

    const result = await controller.getTodayCoachDecision({
      authUser: { id: 'auth_123', email: 'a@b.com' },
    });

    expect(getTodayCoachDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.coachDecision.id).toBe('decision_123');
  });

  it('calls the current use case with the authenticated user', async () => {
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildDecision('decision_123'),
    } as never);

    const result = await controller.getCurrentCoachDecision({
      authUser: { id: 'auth_123', email: 'a@b.com' },
    });

    expect(getCurrentCoachDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.coachDecision.id).toBe('decision_123');
  });

  it('calls the history use case with the authenticated user and limit', async () => {
    getCoachDecisionHistoryUseCase.execute.mockResolvedValue({
      coachDecisions: [buildDecision('decision_123')],
    } as never);

    const result = await controller.getCoachDecisionHistory(
      {
        authUser: { id: 'auth_123', email: 'a@b.com' },
      },
      { limit: 14 },
    );

    expect(getCoachDecisionHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      limit: 14,
    });
    expect(result.coachDecisions).toHaveLength(1);
  });

  it('maps invalid limit errors consistently', async () => {
    getCoachDecisionHistoryUseCase.execute.mockRejectedValue(
      new GetCoachDecisionHistoryError(
        'INVALID_LIMIT',
        'limit must be between 1 and 90.',
      ),
    );

    await expect(
      controller.getCoachDecisionHistory(
        {
          authUser: { id: 'auth_123', email: 'a@b.com' },
        },
        { limit: 91 },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_LIMIT',
      },
    });
  });

  it('replays the decision using the authenticated user', async () => {
    replayCoachDecisionUseCase.execute.mockResolvedValue({
      persisted: buildDecision('decision_123'),
      recalculated: {
        priority: 'motivation',
        headline: 'Keep building momentum',
        summary: 'Signals are stable.',
        actionItems: ['Continue the current plan', 'Stay consistent'],
        influences: [],
        formulaVersion: 'coach-decision-v1',
      },
      comparison: {
        matches: true,
        differences: [],
      },
      replayedAt: '2026-06-02T10:00:00.000Z',
    } as never);

    const result = await controller.replayCoachDecision(
      {
        authUser: { id: 'auth_123', email: 'a@b.com' },
      },
      'decision_123',
    );

    expect(replayCoachDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      coachDecisionId: 'decision_123',
    });
    expect(result.persisted.id).toBe('decision_123');
    expect(result.replayedAt).toBe('2026-06-02T10:00:00.000Z');
  });

  it('rejects invalid replay ids', async () => {
    replayCoachDecisionUseCase.execute.mockRejectedValue(
      new ReplayCoachDecisionError(
        REPLAY_COACH_DECISION_ERROR_CODES.INVALID_INPUT,
        'Invalid coach decision id.',
      ),
    );

    await expect(
      controller.replayCoachDecision(
        {
          authUser: { id: 'auth_123', email: 'a@b.com' },
        },
        ' ',
      ),
    ).rejects.toMatchObject({
      response: {
        code: REPLAY_COACH_DECISION_ERROR_CODES.INVALID_INPUT,
      },
    });
  });
});

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
