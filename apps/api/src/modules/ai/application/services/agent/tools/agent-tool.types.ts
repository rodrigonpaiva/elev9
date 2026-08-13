import type { AgentContextDomain, AgentIntent } from '../agent.types';

export type AgentToolCategory =
  | 'READ_CONTEXT'
  | 'READ_HISTORY'
  | 'READ_PROFILE'
  | 'READ_ANALYTICS'
  | 'GENERATE_CONTENT'
  | 'SYSTEM';

export type AgentToolCapability =
  | 'READ_USER_PROFILE'
  | 'READ_HEALTH_CONTEXT'
  | 'READ_TRAINING_CONTEXT'
  | 'READ_NUTRITION_CONTEXT'
  | 'READ_RECOVERY_CONTEXT'
  | 'READ_GOALS_CONTEXT'
  | 'READ_HABITS_CONTEXT'
  | 'READ_PROGRESS_CONTEXT'
  | 'READ_DASHBOARD_CONTEXT'
  | 'READ_PERSONALIZATION_CONTEXT'
  | 'READ_NOTIFICATION_CONTEXT'
  | 'READ_COACH_DECISION'
  | 'READ_CONVERSATION_MEMORY'
  | 'READ_RECENT_MESSAGES'
  | 'READ_ANALYTICS'
  | 'READ_HISTORY'
  | 'READ_PROFILE'
  | 'GENERATE_REPLY'
  | 'SYSTEM_GUARDRAILS';

export type AgentToolMetadata = {
  capabilities: readonly AgentToolCapability[];
};

export type AgentToolDescriptor = {
  id: string;
  displayName: string;
  description: string;
  category: AgentToolCategory;
  supportedIntents: readonly AgentIntent[];
  supportedContextDomains: readonly AgentContextDomain[];
  estimatedCost: number;
  estimatedLatencyMs: number;
  enabled: boolean;
  version: string;
  metadata: AgentToolMetadata;
};
