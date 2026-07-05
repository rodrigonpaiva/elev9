import { ApiClientError } from '@elev9/api-client';

import {
  buildConversationContext,
  createConversationMessage,
  formatCoachMessage,
  getConversationErrorMessage,
  getSuggestedQuestions,
  normalizeHistory,
  resolveAutoSendConversationPrompt,
} from './coach-conversation-helpers';

describe('coach conversation helpers', () => {
  it('formats markdown, bullets and JSON fallbacks safely', () => {
    expect(formatCoachMessage('')).toEqual([
      { id: 'paragraph-0', type: 'paragraph', text: 'I am here with you.' },
    ]);

    expect(
      formatCoachMessage('**Keep going**\n- Train\n---\n* Recover'),
    ).toEqual([
      { id: 'paragraph-0', type: 'paragraph', text: 'Keep going' },
      { id: 'bullet-1', type: 'bullet', text: 'Train' },
      { id: 'divider-2', type: 'divider' },
      { id: 'bullet-3', type: 'bullet', text: 'Recover' },
    ]);

    expect(formatCoachMessage('{"reply":"json"}')).toEqual([
      {
        id: 'paragraph-0',
        type: 'paragraph',
        text: 'I have your coaching context ready. Ask me what you want to adjust today.',
      },
    ]);
  });

  it('classifies message kinds and normalizes history', () => {
    expect(
      createConversationMessage({
        role: 'assistant',
        content: 'Great work today',
        createdAt: '2026-07-05T08:00:00.000Z',
      }).kind,
    ).toBe('celebration');

    const history = normalizeHistory([
      {
        role: 'assistant',
        content: 'Please be careful with volume',
        createdAt: '2026-07-05T08:00:00.000Z',
      },
      {
        role: 'user',
        content: 'What should I eat after training?',
        createdAt: '2026-07-05T08:01:00.000Z',
      },
    ]);

    expect(history.map((message) => message.kind)).toEqual(['warning', 'user']);
    expect(history[0]?.localId).toContain('2026-07-05T08:00:00.000Z-0');
  });

  it('builds the coach context from available signals', () => {
    expect(
      buildConversationContext({
        coachStatus: undefined,
        hasWorkout: true,
        hasRecovery: true,
        hasNutrition: false,
        hasProgress: true,
        priority: 'recovery',
      }),
    ).toEqual({
      status: 'Ready to help',
      signals: ['Workout', 'Recovery', 'Progress', 'Goals'],
      suggestedQuestions: getSuggestedQuestions('recovery'),
    });
  });

  it('maps coach errors to the correct fallback copy', () => {
    expect(
      getConversationErrorMessage(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Offline',
          status: 0,
        }),
      ),
    ).toContain("You're offline");

    expect(getConversationErrorMessage(new Error('Nope'))).toBe(
      'Unable to reach your coach.',
    );
  });

  it('deduplicates auto-send prompts and blocks duplicates', () => {
    expect(
      resolveAutoSendConversationPrompt({
        initialPrompt: '  What should I eat after training?  ',
        promptId: undefined,
        lastAutoPromptId: null,
      }),
    ).toEqual({
      prompt: 'What should I eat after training?',
      promptId: 'What should I eat after training?',
    });

    expect(
      resolveAutoSendConversationPrompt({
        initialPrompt: 'Question',
        promptId: 'prompt-1',
        lastAutoPromptId: 'prompt-1',
      }),
    ).toBeNull();
  });
});
