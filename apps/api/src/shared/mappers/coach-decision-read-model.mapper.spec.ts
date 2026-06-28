import { CoachDecisionReadModelMapper } from './coach-decision-read-model.mapper';

describe('CoachDecisionReadModelMapper', () => {
  const coachDecision = {
    id: 'decision_1',
    priority: 'consistency',
    headline: 'Focus on consistency today',
    summary: 'Keep the routine simple and complete the planned work.',
    actionItems: ['Complete the planned session', 'Keep the routine simple'],
    influences: [
      {
        toJSON: () => ({
          code: 'LOW_TRAINING_ADHERENCE',
          label: 'Low training adherence',
          impact: 'negative',
          source: 'progress',
          weight: 0.7,
          value: 2,
        }),
      },
    ],
    sourceContext: {
      prompt: 'hidden',
    },
  } as never;

  it('maps a coach decision to safe dashboard/feedback/chat/prompt payloads without sourceContext', () => {
    const result =
      CoachDecisionReadModelMapper.toDashboardPayload(coachDecision);

    expect(result).toEqual({
      priority: 'consistency',
      headline: 'Focus on consistency today',
      summary: 'Keep the routine simple and complete the planned work.',
      actionItems: ['Complete the planned session', 'Keep the routine simple'],
      influences: [
        {
          code: 'LOW_TRAINING_ADHERENCE',
          label: 'Low training adherence',
          impact: 'negative',
          source: 'progress',
          weight: 0.7,
          value: 2,
        },
      ],
    });
    expect(result).not.toHaveProperty('sourceContext');

    expect(CoachDecisionReadModelMapper.toPromptPayload(coachDecision)).toEqual(
      result,
    );
    expect(CoachDecisionReadModelMapper.toChatPayload(coachDecision)).toEqual(
      result,
    );
    expect(
      CoachDecisionReadModelMapper.toFeedbackPayload(coachDecision),
    ).toEqual(result);
  });

  it('builds a reduced feedback context snapshot with coachDecision-prefixed fields', () => {
    const result = CoachDecisionReadModelMapper.toFeedbackContextSnapshot(
      coachDecision as never,
    );

    expect(result).toEqual({
      coachDecisionId: 'decision_1',
      coachDecisionPriority: 'consistency',
      coachDecisionHeadline: 'Focus on consistency today',
      coachDecisionSummary:
        'Keep the routine simple and complete the planned work.',
      coachDecisionActionItems: [
        'Complete the planned session',
        'Keep the routine simple',
      ],
      coachDecisionInfluences: [
        {
          code: 'LOW_TRAINING_ADHERENCE',
          label: 'Low training adherence',
          impact: 'negative',
          source: 'progress',
          weight: 0.7,
          value: 2,
        },
      ],
    });
    expect(result).not.toHaveProperty('sourceContext');
  });
});
