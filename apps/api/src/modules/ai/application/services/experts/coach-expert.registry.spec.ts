import { CoachExpertRegistry } from './coach-expert.registry';
import type { CoachExpert, CoachExpertMetadata } from './coach-expert.types';

describe('CoachExpertRegistry', () => {
  it('initializes the default catalog without duplicate ids', () => {
    const registry = new CoachExpertRegistry();
    const experts = registry.listExperts();

    expect(experts).toHaveLength(7);
    expect(new Set(experts.map((expert) => expert.metadata.id)).size).toBe(
      experts.length,
    );
  });

  it('returns experts by intent, capability, and domain in deterministic priority order', () => {
    const registry = new CoachExpertRegistry();

    expect(
      registry
        .getExpertsForIntent('TRAINING')
        .map((expert) => expert.metadata.id),
    ).toEqual([
      'WorkoutExpert',
      'RecoveryExpert',
      'GoalExpert',
      'HabitExpert',
      'ProgressExpert',
      'MotivationExpert',
    ]);
    expect(
      registry
        .getExpertsForCapability('COACH_ROUTING')
        .map((expert) => expert.metadata.id),
    ).toEqual([
      'WorkoutExpert',
      'RecoveryExpert',
      'NutritionExpert',
      'GoalExpert',
      'HabitExpert',
      'ProgressExpert',
      'MotivationExpert',
    ]);
    expect(
      registry
        .getExpertsForDomain('training')
        .map((expert) => expert.metadata.id),
    ).toEqual([
      'WorkoutExpert',
      'RecoveryExpert',
      'NutritionExpert',
      'GoalExpert',
      'HabitExpert',
      'ProgressExpert',
      'MotivationExpert',
    ]);
  });

  it('returns enabled experts only and excludes disabled catalog entries', () => {
    const registry = new CoachExpertRegistry([
      createExpert({
        id: 'EnabledExpert',
        enabled: true,
      }),
      createExpert({
        id: 'DisabledExpert',
        enabled: false,
      }),
    ]);

    expect(
      registry.getEnabledExperts().map((expert) => expert.metadata.id),
    ).toEqual(['EnabledExpert']);
    expect(
      registry
        .getExpertsForIntent('TRAINING')
        .map((expert) => expert.metadata.id),
    ).toEqual(['EnabledExpert']);
  });

  it('rejects duplicate expert ids during initialization', () => {
    const expert = createExpert({ id: 'DuplicateExpert' });

    expect(
      () => new CoachExpertRegistry([expert, { ...expert } as CoachExpert]),
    ).toThrow('Duplicate coach expert id detected: DuplicateExpert');
  });

  it('looks up experts by id', () => {
    const registry = new CoachExpertRegistry();

    expect(registry.getExpert('WorkoutExpert')).toMatchObject({
      metadata: expect.objectContaining({
        id: 'WorkoutExpert',
        displayName: 'Workout Expert',
        category: 'TRAINING',
        priority: 100,
      }),
    });
  });
});

function createExpert(
  overrides: Partial<CoachExpertMetadata> & Pick<CoachExpertMetadata, 'id'>,
): CoachExpert {
  const metadata: CoachExpertMetadata = {
    id: overrides.id,
    displayName: overrides.displayName ?? overrides.id,
    version: overrides.version ?? '1.0.0',
    category: overrides.category ?? 'TRAINING',
    supportedIntents: overrides.supportedIntents ?? ['TRAINING'],
    supportedDomains: overrides.supportedDomains ?? ['training'],
    estimatedCost: overrides.estimatedCost ?? 1,
    estimatedLatencyMs: overrides.estimatedLatencyMs ?? 1,
    priority: overrides.priority ?? 1,
    capabilities: overrides.capabilities ?? ['TRAINING_SPECIALIST'],
    enabled: overrides.enabled ?? true,
  };

  return {
    metadata,
    supports: jest.fn().mockReturnValue(metadata.enabled),
    loadContext: jest.fn().mockImplementation((request, context) => context),
    analyze: jest.fn().mockImplementation((request, context) => ({
      expertId: metadata.id,
      summary: 'noop',
      contributions: [],
      metadata: {},
    })),
    contribute: jest.fn().mockReturnValue([]),
  };
}
