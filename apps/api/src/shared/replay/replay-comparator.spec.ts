import { ReplayComparator } from './replay-comparator';

describe('ReplayComparator', () => {
  it('detects no difference', () => {
    const persisted = {
      priority: 'motivation',
      headline: 'Keep building momentum',
      summary: 'Signals are stable.',
      actionItems: ['Continue the current plan', 'Stay consistent'],
      influences: [
        {
          code: 'GOOD_CONSISTENCY',
          label: 'Consistency has been strong recently.',
          impact: 'positive',
          source: 'progress',
          weight: 0.18,
          value: 3,
        },
      ],
      ignored: 'persisted-only',
    };
    const recalculated = {
      priority: 'motivation',
      headline: 'Keep building momentum',
      summary: 'Signals are stable.',
      actionItems: ['Continue the current plan', 'Stay consistent'],
      influences: [
        {
          code: 'GOOD_CONSISTENCY',
          label: 'Consistency has been strong recently.',
          impact: 'positive',
          source: 'progress',
          weight: 0.18,
          value: 3,
        },
      ],
      ignored: 'recalculated-only',
    };

    const result = ReplayComparator.compare({
      persisted,
      recalculated,
      fields: ['priority', 'headline', 'summary', 'actionItems', 'influences'],
    });

    expect(result.matches).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it('detects a primitive difference', () => {
    const result = ReplayComparator.compare({
      persisted: { priority: 'motivation' },
      recalculated: { priority: 'recovery' },
      fields: ['priority'],
    });

    expect(result).toEqual({
      matches: false,
      differences: [
        {
          field: 'priority',
          persisted: 'motivation',
          recalculated: 'recovery',
        },
      ],
    });
  });

  it('detects array differences', () => {
    const result = ReplayComparator.compare({
      persisted: {
        actionItems: ['A', 'B'],
      },
      recalculated: {
        actionItems: ['B', 'A'],
      },
      fields: ['actionItems'],
    });

    expect(result.matches).toBe(false);
    expect(result.differences).toEqual([
      {
        field: 'actionItems',
        persisted: ['A', 'B'],
        recalculated: ['B', 'A'],
      },
    ]);
  });

  it('detects nested object differences', () => {
    const result = ReplayComparator.compare({
      persisted: {
        influences: [
          {
            code: 'LOW_READINESS',
            meta: { score: 32, details: { source: 'recovery' } },
          },
        ],
      },
      recalculated: {
        influences: [
          {
            code: 'LOW_READINESS',
            meta: { score: 50, details: { source: 'recovery' } },
          },
        ],
      },
      fields: ['influences'],
    });

    expect(result.matches).toBe(false);
  });

  it('ignores fields that were not selected', () => {
    const result = ReplayComparator.compare({
      persisted: {
        priority: 'motivation',
        ignored: 'persisted-only',
      },
      recalculated: {
        priority: 'motivation',
        ignored: 'recalculated-only',
      },
      fields: ['priority'],
    });

    expect(result.matches).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('does not mutate input', () => {
    const persisted = {
      headline: 'Keep building momentum',
      nested: { order: ['a', 'b'] },
    };
    const recalculated = {
      headline: 'Keep building momentum',
      nested: { order: ['a', 'b'] },
    };

    const persistedSnapshot = JSON.stringify(persisted);
    const recalculatedSnapshot = JSON.stringify(recalculated);

    ReplayComparator.compare({
      persisted,
      recalculated,
      fields: ['headline', 'nested'],
    });

    expect(JSON.stringify(persisted)).toBe(persistedSnapshot);
    expect(JSON.stringify(recalculated)).toBe(recalculatedSnapshot);
  });
});
