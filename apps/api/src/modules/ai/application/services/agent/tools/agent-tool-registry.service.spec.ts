import { AgentToolRegistryService } from './agent-tool-registry.service';
import type { AgentToolDescriptor } from './agent-tool.types';

describe('AgentToolRegistryService', () => {
  it('initializes the default catalog without duplicate tool ids', () => {
    const registry = new AgentToolRegistryService();
    const tools = registry.listTools();

    expect(tools).toHaveLength(13);
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
  });

  it('returns tool metadata by identifier', () => {
    const registry = new AgentToolRegistryService();
    const tool = registry.getTool('TrainingTool');

    expect(tool).toMatchObject({
      id: 'TrainingTool',
      displayName: 'Training Tool',
      category: 'READ_CONTEXT',
      enabled: true,
      version: '1.0.0',
      metadata: {
        capabilities: ['READ_TRAINING_CONTEXT'],
      },
    });
  });

  it('filters tools by intent deterministically', () => {
    const registry = new AgentToolRegistryService();

    expect(
      registry.getToolsForIntent('TRAINING').map((tool) => tool.id),
    ).toEqual([
      'UserProfileTool',
      'ConversationMemoryTool',
      'CoachDecisionTool',
      'HealthContextTool',
      'TrainingTool',
      'RecoveryTool',
      'GoalTool',
      'ProgressTool',
    ]);
  });

  it('filters tools by selected context domains deterministically', () => {
    const registry = new AgentToolRegistryService();

    expect(
      registry
        .getToolsForContextDomains(['training', 'recovery'])
        .map((tool) => tool.id),
    ).toEqual([
      'HealthContextTool',
      'TrainingTool',
      'NutritionTool',
      'RecoveryTool',
      'GoalTool',
      'DashboardTool',
    ]);
  });

  it('excludes disabled tools from enabled and filtered views', () => {
    const disabledTool = createTool({
      id: 'DisabledTrainingTool',
      enabled: false,
      supportedIntents: ['TRAINING'],
      supportedContextDomains: ['training'],
    });
    const registry = new AgentToolRegistryService([
      disabledTool,
      createTool({ id: 'EnabledTrainingTool', supportedIntents: ['TRAINING'] }),
    ]);

    expect(registry.getEnabledTools().map((tool) => tool.id)).toEqual([
      'EnabledTrainingTool',
    ]);
    expect(
      registry.getToolsForIntent('TRAINING').map((tool) => tool.id),
    ).toEqual(['EnabledTrainingTool']);
    expect(
      registry.getToolsForContextDomains(['training']).map((tool) => tool.id),
    ).toEqual(['EnabledTrainingTool']);
  });

  it('rejects duplicate tool ids', () => {
    const duplicate = createTool({ id: 'DuplicateTool' });

    expect(
      () => new AgentToolRegistryService([duplicate, { ...duplicate }]),
    ).toThrow('Duplicate agent tool id detected: DuplicateTool');
  });
});

function createTool(
  overrides: Partial<AgentToolDescriptor> & Pick<AgentToolDescriptor, 'id'>,
): AgentToolDescriptor {
  return {
    id: overrides.id,
    displayName: overrides.displayName ?? overrides.id,
    description: overrides.description ?? `${overrides.id} description`,
    category: overrides.category ?? 'READ_CONTEXT',
    supportedIntents: overrides.supportedIntents ?? ['GENERAL_CHAT'],
    supportedContextDomains: overrides.supportedContextDomains ?? ['training'],
    estimatedCost: overrides.estimatedCost ?? 1,
    estimatedLatencyMs: overrides.estimatedLatencyMs ?? 1,
    enabled: overrides.enabled ?? true,
    version: overrides.version ?? '1.0.0',
    metadata: overrides.metadata ?? {
      capabilities: ['READ_TRAINING_CONTEXT'],
    },
  };
}
