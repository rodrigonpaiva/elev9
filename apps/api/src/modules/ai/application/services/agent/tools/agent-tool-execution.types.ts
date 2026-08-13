import type { AgentPlan, AgentRequest } from '../agent.types';
import type { AgentToolDescriptor } from './agent-tool.types';

export type AgentToolExecutionStatus =
  | 'SUCCESS'
  | 'SKIPPED'
  | 'FAILED'
  | 'TIMEOUT';

export type AgentToolExecutionErrorCode =
  | 'TOOLS_DISABLED'
  | 'TOOL_NOT_REGISTERED'
  | 'TOOL_NOT_SUPPORTED'
  | 'TOOL_DISABLED'
  | 'TOOL_NOT_READ_ONLY'
  | 'MAX_TOOL_CALLS_REACHED'
  | 'TIMEOUT'
  | 'EXECUTION_FAILED';

export type AgentToolExecutionResult = {
  toolId: string;
  status: AgentToolExecutionStatus;
  summary: string;
  data: unknown;
  durationMs: number;
  errorCode?: AgentToolExecutionErrorCode;
  metadata: Record<string, unknown>;
};

export type AgentToolExecutionMetrics = {
  enabled: boolean;
  maxToolCalls: number;
  timeoutMs: number;
  selectedToolCount: number;
  executedToolCount: number;
  skippedToolCount: number;
  failedToolCount: number;
  timeoutCount: number;
  totalDurationMs: number;
  selectedToolIds: readonly string[];
  executedToolIds: readonly string[];
  skippedToolIds: readonly string[];
  failedToolIds: readonly string[];
  timeoutToolIds: readonly string[];
  perToolDurationMs: ReadonlyArray<{
    toolId: string;
    durationMs: number;
  }>;
};

export type AgentToolExecutionContext = {
  request: AgentRequest;
  plan: AgentPlan;
  conversationState: {
    conversationId: string;
    conversationHistory: readonly {
      role: 'user' | 'assistant' | 'system';
      content: string;
      createdAt: string;
    }[];
    conversationMemory?: {
      summary: string;
      metadata: {
        generatedFromMessageCount: number;
        version: string;
      };
    };
  };
};

export type AgentToolExecutionOutcome = {
  results: readonly AgentToolExecutionResult[];
  metrics: AgentToolExecutionMetrics;
};
