import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { NutritionExpert } from './nutrition-expert.service';

describe('NutritionExpert', () => {
  const expert = new NutritionExpert();

  it('uses canonical calorie values without recalculating remaining', () => {
    const result = expert.analyze(
      request('How many calories do I have left?'),
      context({
        calories: {
          consumed: 1500,
          target: 2000,
          remaining: 300,
          excess: null,
          state: 'in_progress',
        },
        adherenceStatus: 'above_range',
      }),
    );

    expect(result.contributions[0].summary).toContain('300 calories remaining');
    expect(result.contributions[0].summary).not.toContain('500 calories');
    expect(result.metadata.nutritionBoundary).toMatchObject({
      source: 'nutrition_read_model',
      contractVersion: expect.any(String),
      factsUsed: expect.arrayContaining(['calorie_progress']),
    });
  });

  it('preserves partial canonical data', () => {
    const result = expert.analyze(
      request('What is my protein progress?'),
      context({
        calories: null,
        macros: [
          {
            nutrient: 'protein',
            consumed: 92,
            target: null,
            remaining: null,
            unit: 'g',
            state: 'target_unavailable',
          },
        ],
        meals: null,
        adherenceStatus: 'unavailable',
      }),
    );

    expect(result.metadata.analysis.canonicalAvailability).toBe('available');
    expect(result.contributions[0].summary).toContain('92 g');
  });

  it('returns a deterministic unavailable response without raw fallback', () => {
    const result = expert.analyze(
      request('Summarize today'),
      context({
        availability: 'not_configured',
        calories: null,
        macros: [],
        meals: null,
        focus: null,
        insight: null,
        adherenceStatus: 'unavailable',
      }),
    );

    expect(result.metadata.analysis.canonicalAvailability).toBe(
      'not_configured',
    );
    expect(result.contributions[0].summary).toContain('nutrition');
  });

  it('preserves stale freshness as canonical state', () => {
    const result = expert.analyze(
      request('What should I focus on?'),
      context({ freshness: 'stale', focus: null }),
    );

    expect(result.metadata.analysis.canonicalFreshness).toBe('stale');
  });
});

function request(userMessage: string): CoachExpertRequest {
  return {
    userMessage,
    intent: 'NUTRITION',
    selectedDomains: ['nutrition'],
    selectionReason: 'intent=NUTRITION',
  } as CoachExpertRequest;
}

function context(overrides: {
  availability?:
    | 'available'
    | 'not_configured'
    | 'insufficient_data'
    | 'not_available'
    | 'processing_failed';
  freshness?: 'current' | 'stale' | 'legacy' | 'unknown';
  calories?: {
    consumed: number;
    target: number | null;
    remaining: number | null;
    excess: number | null;
    state:
      | 'in_progress'
      | 'above_target'
      | 'target_unavailable'
      | 'not_started';
  } | null;
  macros?: Array<{
    nutrient: 'protein' | 'carbs' | 'fat';
    consumed: number | null;
    target: number | null;
    remaining: number | null;
    unit: 'g';
    state:
      | 'in_progress'
      | 'above_target'
      | 'target_unavailable'
      | 'not_started';
  }>;
  meals?: {
    planned: number;
    completed: number;
    pending: number;
    nextMeal: {
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      title: string;
    } | null;
  } | null;
  adherenceStatus?:
    | 'not_started'
    | 'below_range'
    | 'within_range'
    | 'above_range'
    | 'unavailable';
  focus?: null;
  insight?: null;
}): CoachExpertContext {
  return {
    request: request('Nutrition'),
    selectionReason: 'intent=NUTRITION',
    runtimeMetadata: Object.freeze({}),
    nutritionContext: {
      source: 'nutrition_read_model',
      contractVersion: 'nutrition-read-model-v1',
      availability: overrides.availability ?? 'available',
      freshness: overrides.freshness ?? 'current',
      lastUpdatedAt: null,
      timezone: 'UTC',
      calories: overrides.calories ?? {
        consumed: 1500,
        target: 2000,
        remaining: 300,
        excess: null,
        state: 'in_progress',
      },
      macros: overrides.macros ?? [],
      meals: overrides.meals ?? null,
      adherenceStatus: overrides.adherenceStatus ?? 'within_range',
      focus: overrides.focus ?? null,
      insight: overrides.insight ?? null,
      actions: [{ type: 'none' }],
    },
  } as unknown as CoachExpertContext;
}
