import { CoachChatReplyGenerator } from './coach-chat-reply-generator.service';

describe('CoachChatReplyGenerator', () => {
  const generator = new CoachChatReplyGenerator();

  const healthContext = {
    fatigueLevel: 'MODERATE',
    recoveryTrend: 'stable',
    latestCheckIn: {
      energyLevel: 3,
      sleepQuality: 3,
      muscleSoreness: 3,
      motivationLevel: 3,
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    },
    nutritionProfile: {
      goal: 'maintenance',
      mealsPerDay: 3,
    },
    currentStreak: 2,
  } as never;

  it.each([
    {
      priority: 'recovery' as const,
      headline: 'Recovery should be your focus today.',
      tail: 'Keep the session lighter and prioritize sleep, hydration, and recovery work.',
      cue: 'The strongest signals point to recovery.',
      influences: [
        {
          code: 'LOW_READINESS',
          label: 'Low readiness',
          impact: 'negative' as const,
          source: 'recovery' as const,
        },
      ],
    },
    {
      priority: 'nutrition' as const,
      headline: 'Nutrition is the priority today.',
      tail: 'Prioritize meals, protein, and consistent hydration.',
      cue: 'Nutrition consistency is the main signal.',
      influences: [
        {
          code: 'LOW_NUTRITION_ADHERENCE',
          label: 'Low nutrition adherence',
          impact: 'negative' as const,
          source: 'nutrition' as const,
        },
      ],
    },
    {
      priority: 'training' as const,
      headline: 'Training adaptation recommended.',
      tail: 'Follow the adaptive recommendation: Reduce training intensity today and Prioritize sleep tonight.',
      cue: 'Training adaptation is the main signal.',
      influences: [
        {
          code: 'INCREASE_INTENSITY_RECOMMENDED',
          label: 'Increase intensity recommended',
          impact: 'positive' as const,
          source: 'training' as const,
        },
      ],
    },
    {
      priority: 'consistency' as const,
      headline: 'Focus on consistency.',
      tail: 'Keep the routine simple and complete the planned work.',
      cue: 'Consistency is the main signal.',
      influences: [
        {
          code: 'LOW_TRAINING_ADHERENCE',
          label: 'Low training adherence',
          impact: 'negative' as const,
          source: 'progress' as const,
        },
      ],
    },
    {
      priority: 'motivation' as const,
      headline: 'Keep building momentum.',
      tail: 'Stay consistent and keep building on the current routine.',
      cue: 'Momentum is steady.',
      influences: [],
    },
  ])(
    'uses coach decision priority %s',
    ({ priority, headline, tail, cue, influences }) => {
      const reply = generator.generate({
        message: 'Should I train today?',
        healthContext,
        coachDecision: {
          priority,
          headline,
          summary: 'Short summary.',
          actionItems: [
            'Reduce training intensity today',
            'Prioritize sleep tonight',
          ],
          influences,
        } as never,
      });

      expect(reply).toContain(headline);
      expect(reply).toContain(cue);
      expect(reply).toContain(tail);
    },
  );

  it('falls back to the legacy heuristic when no coach decision is present', () => {
    const reply = generator.generate({
      message: 'Should I train today?',
      healthContext: {
        ...healthContext,
        fatigueLevel: 'HIGH',
        recoveryTrend: 'needs_recovery',
      },
    });

    expect(reply).toContain("Your recovery signals suggest keeping today's session lighter.");
  });
});
