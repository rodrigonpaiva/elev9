import type { AiRolloutAssignment } from '../../governance/ai-governance.types';
import type {
  AiPromptBuilderConversationMemory,
  AiPromptBuilderConversationMessage,
} from '../../llm/ai-prompt-builder.service';
import type {
  AgentContextDomain,
  AgentIntent,
  AgentPlan,
  AgentRequest,
} from '../agent.types';
import type { AgentToolDescriptor } from '../tools/agent-tool.types';
import type {
  AgentToolExecutionMetrics,
  AgentToolExecutionResult,
} from '../tools/agent-tool-execution.types';

export type AgentMemoryLifecycle =
  | 'CREATE'
  | 'UPDATE'
  | 'READ'
  | 'SNAPSHOT'
  | 'CLEAR'
  | 'EXPIRE';

export type AgentMemoryScope = 'WORKING' | 'SESSION' | 'CONVERSATION';

export type AgentMemoryLifecycleEvent = {
  scope: AgentMemoryScope;
  event: AgentMemoryLifecycle;
  memoryId: string;
  timestamp: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type WorkingMemory = {
  request: AgentMemoryRequest;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  selectedTools: readonly AgentToolDescriptor[];
  executionPlan?: AgentPlan;
  toolResults: readonly AgentToolExecutionResult[];
  runtimeMetadata?: AgentMemoryRuntimeMetadata;
  createdAt: string;
  updatedAt: string;
};

export type AgentMemoryRequest = Omit<AgentRequest, 'signal' | 'onDelta'>;

export type SessionMemoryEntryType =
  | 'recent_goal'
  | 'recent_coach_decision'
  | 'recent_tool_result'
  | 'temporary_preference'
  | 'recent_execution_summary';

export type SessionMemoryEntry = {
  type: SessionMemoryEntryType;
  value: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SessionMemory = {
  conversationId: string;
  entries: readonly SessionMemoryEntry[];
  recentGoals: readonly string[];
  recentCoachDecisions: readonly {
    priority?: string;
    headline?: string;
    summary: string;
    createdAt: string;
  }[];
  recentToolResults: readonly {
    toolId: string;
    status: string;
    summary: string;
    durationMs: number;
  }[];
  temporaryPreferences: Readonly<Record<string, unknown>>;
  recentExecutionSummaries: readonly string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type AgentConversationMemory =
  | AiPromptBuilderConversationMemory
  | undefined;

export type AgentMemoryRuntimeMetadata = {
  enabled: boolean;
  detectedIntent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  selectedToolIds: readonly string[];
  toolExecutionEnabled: boolean;
  toolExecutionMetrics: AgentToolExecutionMetrics;
  currentStep?: string;
  currentStepStatus?: 'completed' | 'failed';
  executionStepCount?: number;
  executionDurationMs?: number;
  fallbackUsed?: boolean;
};

export type AgentMemoryMetadata = {
  workingMemorySize: number;
  sessionMemorySize: number;
  conversationMemorySize: number;
  snapshotCreated: boolean;
  expired: boolean;
  lifecycleEvents: readonly AgentMemoryLifecycleEvent[];
};

export type AgentMemorySnapshot = {
  workingMemory: Readonly<WorkingMemory>;
  sessionMemory: Readonly<SessionMemory>;
  conversationMemory?: Readonly<NonNullable<AgentConversationMemory>>;
  metadata: Readonly<AgentMemoryMetadata>;
};

export type AgentMemorySnapshotInput = {
  requestId: string;
  conversationId: string;
  conversationMemory?: AgentConversationMemory;
};

export type AgentMemoryExecutionInput = {
  request: AgentRequest;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  selectedTools: readonly AgentToolDescriptor[];
  executionPlan?: AgentPlan;
  toolResults?: readonly AgentToolExecutionResult[];
  runtimeMetadata?: AgentMemoryRuntimeMetadata;
};

export type AgentMemorySessionUpdateInput = {
  conversationId: string;
  goal?: string;
  coachDecision?: {
    priority?: string;
    headline?: string;
    summary: string;
  };
  toolResults: readonly AgentToolExecutionResult[];
  executionSummary: string;
  temporaryPreferences?: Record<string, unknown>;
};

export type AgentMemoryConversationContext = {
  conversationId: string;
  conversationMemory?: AiPromptBuilderConversationMemory;
  conversationHistory?: readonly AiPromptBuilderConversationMessage[];
};
