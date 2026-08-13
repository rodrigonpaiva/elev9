import { Injectable, Optional } from '@nestjs/common';

import type { AgentContextDomain, AgentIntent } from '../agent.types';
import type {
  AgentToolDescriptor,
  AgentToolMetadata,
} from './agent-tool.types';

const AGENT_TOOL_VERSION = '1.0.0';

const DEFAULT_AGENT_TOOLS: AgentToolDescriptor[] = [
  {
    id: 'UserProfileTool',
    displayName: 'User Profile Tool',
    description: 'Reads normalized user profile data for personalization.',
    category: 'READ_PROFILE',
    supportedIntents: [
      'GENERAL_CHAT',
      'TRAINING',
      'NUTRITION',
      'RECOVERY',
      'GOALS',
      'HABITS',
      'PERSONALIZATION',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
      'UNKNOWN',
    ],
    supportedContextDomains: ['user_profile', 'personalization'],
    estimatedCost: 1,
    estimatedLatencyMs: 10,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_USER_PROFILE', 'READ_PROFILE'],
    },
  },
  {
    id: 'ConversationMemoryTool',
    displayName: 'Conversation Memory Tool',
    description: 'Reads recent coach conversation state and stored memory.',
    category: 'READ_HISTORY',
    supportedIntents: [
      'GENERAL_CHAT',
      'TRAINING',
      'NUTRITION',
      'RECOVERY',
      'GOALS',
      'HABITS',
      'PERSONALIZATION',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
      'UNKNOWN',
    ],
    supportedContextDomains: ['conversation_memory', 'recent_messages'],
    estimatedCost: 1,
    estimatedLatencyMs: 12,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_CONVERSATION_MEMORY', 'READ_RECENT_MESSAGES'],
    },
  },
  {
    id: 'CoachDecisionTool',
    displayName: 'Coach Decision Tool',
    description: 'Reads the current coaching decision and rationale.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'GENERAL_CHAT',
      'TRAINING',
      'NUTRITION',
      'RECOVERY',
      'GOALS',
      'HABITS',
      'PERSONALIZATION',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
      'UNKNOWN',
    ],
    supportedContextDomains: ['coach_decision'],
    estimatedCost: 1,
    estimatedLatencyMs: 8,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_COACH_DECISION'],
    },
  },
  {
    id: 'HealthContextTool',
    displayName: 'Health Context Tool',
    description: 'Reads the normalized health context summary.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'GENERAL_CHAT',
      'TRAINING',
      'NUTRITION',
      'RECOVERY',
      'GOALS',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
      'UNKNOWN',
    ],
    supportedContextDomains: [
      'health',
      'training',
      'nutrition',
      'recovery',
      'goals',
      'progress',
    ],
    estimatedCost: 2,
    estimatedLatencyMs: 25,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_HEALTH_CONTEXT'],
    },
  },
  {
    id: 'TrainingTool',
    displayName: 'Training Tool',
    description: 'Reads training context, programming, and workout signals.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'TRAINING',
      'GOALS',
      'PROGRESS',
      'PLANNING',
      'MOTIVATION',
    ],
    supportedContextDomains: ['training', 'goals', 'progress'],
    estimatedCost: 2,
    estimatedLatencyMs: 18,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_TRAINING_CONTEXT'],
    },
  },
  {
    id: 'NutritionTool',
    displayName: 'Nutrition Tool',
    description: 'Reads nutrition context, targets, and restrictions.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'NUTRITION',
      'GOALS',
      'RECOVERY',
      'PLANNING',
      'MOTIVATION',
    ],
    supportedContextDomains: ['nutrition', 'goals', 'recovery'],
    estimatedCost: 2,
    estimatedLatencyMs: 18,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_NUTRITION_CONTEXT'],
    },
  },
  {
    id: 'RecoveryTool',
    displayName: 'Recovery Tool',
    description: 'Reads recovery context, readiness, and fatigue signals.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'RECOVERY',
      'TRAINING',
      'GOALS',
      'PLANNING',
      'MOTIVATION',
    ],
    supportedContextDomains: ['recovery', 'goals', 'training'],
    estimatedCost: 2,
    estimatedLatencyMs: 18,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_RECOVERY_CONTEXT'],
    },
  },
  {
    id: 'GoalTool',
    displayName: 'Goal Tool',
    description: 'Reads goal context and related progression signals.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'GOALS',
      'TRAINING',
      'NUTRITION',
      'RECOVERY',
      'HABITS',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
    ],
    supportedContextDomains: ['goals', 'progress', 'training', 'recovery'],
    estimatedCost: 2,
    estimatedLatencyMs: 16,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_GOALS_CONTEXT'],
    },
  },
  {
    id: 'HabitTool',
    displayName: 'Habit Tool',
    description: 'Reads habit consistency and behavior signals.',
    category: 'READ_CONTEXT',
    supportedIntents: [
      'HABITS',
      'PERSONALIZATION',
      'PROGRESS',
      'DASHBOARD',
      'MOTIVATION',
      'PLANNING',
    ],
    supportedContextDomains: ['habits', 'progress', 'personalization'],
    estimatedCost: 2,
    estimatedLatencyMs: 14,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_HABITS_CONTEXT'],
    },
  },
  {
    id: 'ProgressTool',
    displayName: 'Progress Tool',
    description: 'Reads progress analytics and tracking summaries.',
    category: 'READ_ANALYTICS',
    supportedIntents: [
      'PROGRESS',
      'GOALS',
      'TRAINING',
      'HABITS',
      'DASHBOARD',
      'MOTIVATION',
    ],
    supportedContextDomains: ['progress', 'goals', 'habits'],
    estimatedCost: 3,
    estimatedLatencyMs: 20,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_PROGRESS_CONTEXT', 'READ_ANALYTICS'],
    },
  },
  {
    id: 'DashboardTool',
    displayName: 'Dashboard Tool',
    description: 'Reads high-level dashboard signals and summaries.',
    category: 'READ_ANALYTICS',
    supportedIntents: [
      'DASHBOARD',
      'GENERAL_CHAT',
      'PROGRESS',
      'GOALS',
      'NUTRITION',
      'RECOVERY',
      'HABITS',
      'PERSONALIZATION',
      'MOTIVATION',
      'PLANNING',
    ],
    supportedContextDomains: [
      'health',
      'progress',
      'goals',
      'notifications',
      'training',
      'nutrition',
      'recovery',
      'habits',
      'personalization',
    ],
    estimatedCost: 3,
    estimatedLatencyMs: 22,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_DASHBOARD_CONTEXT', 'READ_ANALYTICS'],
    },
  },
  {
    id: 'PersonalizationTool',
    displayName: 'Personalization Tool',
    description: 'Reads personalization state and user behavior signals.',
    category: 'READ_PROFILE',
    supportedIntents: [
      'PERSONALIZATION',
      'GENERAL_CHAT',
      'DASHBOARD',
      'HABITS',
      'MOTIVATION',
    ],
    supportedContextDomains: ['personalization', 'user_profile', 'habits'],
    estimatedCost: 2,
    estimatedLatencyMs: 15,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_PERSONALIZATION_CONTEXT', 'READ_PROFILE'],
    },
  },
  {
    id: 'NotificationTool',
    displayName: 'Notification Tool',
    description: 'Reads notification decisions and engagement signals.',
    category: 'READ_HISTORY',
    supportedIntents: [
      'DASHBOARD',
      'GENERAL_CHAT',
      'RECOVERY',
      'HABITS',
      'MOTIVATION',
    ],
    supportedContextDomains: [
      'notifications',
      'user_profile',
      'coach_decision',
    ],
    estimatedCost: 1,
    estimatedLatencyMs: 12,
    enabled: true,
    version: AGENT_TOOL_VERSION,
    metadata: {
      capabilities: ['READ_NOTIFICATION_CONTEXT', 'READ_HISTORY'],
    },
  },
];

@Injectable()
export class AgentToolRegistryService {
  constructor(
    @Optional()
    private readonly tools: readonly AgentToolDescriptor[] = DEFAULT_AGENT_TOOLS,
  ) {
    this.validateCatalog(this.tools);
  }

  listTools(): AgentToolDescriptor[] {
    return this.cloneTools(this.tools);
  }

  getTool(id: string): AgentToolDescriptor | undefined {
    const tool = this.tools.find((entry) => entry.id === id);

    return tool ? this.cloneTool(tool) : undefined;
  }

  getToolsForIntent(intent: AgentIntent): AgentToolDescriptor[] {
    return this.cloneTools(
      this.tools.filter(
        (tool) => tool.enabled && tool.supportedIntents.includes(intent),
      ),
    );
  }

  getToolsForContextDomains(
    domains: readonly AgentContextDomain[],
  ): AgentToolDescriptor[] {
    const selectedDomains = new Set(domains);

    return this.cloneTools(
      this.tools.filter(
        (tool) =>
          tool.enabled &&
          tool.supportedContextDomains.some((domain) =>
            selectedDomains.has(domain),
          ),
      ),
    );
  }

  getEnabledTools(): AgentToolDescriptor[] {
    return this.cloneTools(this.tools.filter((tool) => tool.enabled));
  }

  private validateCatalog(tools: readonly AgentToolDescriptor[]): void {
    const ids = new Set<string>();

    for (const tool of tools) {
      if (ids.has(tool.id)) {
        throw new Error(`Duplicate agent tool id detected: ${tool.id}`);
      }

      ids.add(tool.id);
    }
  }

  private cloneTools(
    tools: readonly AgentToolDescriptor[],
  ): AgentToolDescriptor[] {
    return tools.map((tool) => this.cloneTool(tool));
  }

  private cloneTool(tool: AgentToolDescriptor): AgentToolDescriptor {
    return {
      ...tool,
      supportedIntents: [...tool.supportedIntents],
      supportedContextDomains: [...tool.supportedContextDomains],
      metadata: this.cloneMetadata(tool.metadata),
    };
  }

  private cloneMetadata(metadata: AgentToolMetadata): AgentToolMetadata {
    return {
      capabilities: [...metadata.capabilities],
    };
  }
}
