import type { AiLlmPrompt } from '../../llm/ai-llm.types';
import type {
  CoachChatConversationState,
  CoachChatReply,
} from '../../../use-cases/create-coach-chat/create-coach-chat.types';
import type {
  AgentActionResult,
  AgentContext,
  AgentPlan,
  AgentRequest,
  AgentToolExecutionMetrics,
  AgentToolExecutionOutcome,
  AgentToolExecutionResult,
} from '../agent.types';
import type { AgentPolicyEvaluation } from '../policies/agent-policy.types';
import type { AgentPlanningValidationResult } from '../planning/agent-planning.types';
import type {
  AgentMemoryMetadata,
  AgentMemorySnapshot,
} from '../memory/agent-memory.types';
import type { CoachExpertCompositionResult } from '../../experts/composition/coach-expert-composition';
import type { CoachExplanation } from '../../explainability/coach-explainability';
import type { CoachPersonaGuidance } from '../../persona/coach-persona-engine';

export type AgentExecutionLifecycle =
  | 'START'
  | 'STEP_START'
  | 'STEP_COMPLETE'
  | 'STEP_SKIP'
  | 'STEP_FAIL'
  | 'MEMORY_UPDATE'
  | 'SNAPSHOT'
  | 'COMPLETE'
  | 'ABORT';

export type AgentExecutionStepName =
  | 'LOAD_CONTEXT'
  | 'EXECUTE_TOOL'
  | 'UPDATE_MEMORY'
  | 'BUILD_PROMPT'
  | 'CALL_LLM'
  | 'GENERATE_FALLBACK'
  | 'PERSIST_MESSAGES'
  | 'UPDATE_CONVERSATION_MEMORY'
  | 'COMPLETE';

export type AgentExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type AgentExecutionStep = {
  step: AgentExecutionStepName;
  status: AgentExecutionStepStatus;
  startedAt: string;
  completedAt?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type AgentExecutionLifecycleEvent = {
  event: AgentExecutionLifecycle;
  step?: AgentExecutionStepName;
  timestamp: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type AgentExecutionValidationStatus = 'valid' | 'invalid';

export type AgentExecutionValidationResult = {
  status: AgentExecutionValidationStatus;
  issues: string[];
};

export type AgentExecutionState = {
  requestId: string;
  conversationId: string;
  currentStep?: AgentExecutionStepName;
  completedSteps: readonly AgentExecutionStep[];
  failedSteps: readonly AgentExecutionStep[];
  skippedSteps: readonly AgentExecutionStep[];
  executionDurationMs: number;
  toolResults: readonly AgentToolExecutionResult[];
  memorySnapshot?: AgentMemorySnapshot;
  planningMetadata: {
    plan: AgentPlan;
    validation: AgentPlanningValidationResult;
    selectedDomainCount: number;
    selectedToolCount: number;
    candidateToolCount: number;
  };
  runtimeMetadata: {
    enabled: boolean;
    detectedIntent: AgentContext['intent'];
    selectedDomains: AgentContext['selectedDomains'];
    toolExecutionEnabled: boolean;
    toolExecutionMetrics?: AgentToolExecutionMetrics;
    fallbackUsed: boolean;
    promptAssemblyDurationMs?: number;
  };
  lifecycleEvents: readonly AgentExecutionLifecycleEvent[];
};

export type AgentExecutionContext = {
  request: AgentRequest;
  context: AgentContext;
  plan: AgentPlan;
  policyEvaluation: AgentPolicyEvaluation;
  conversationState: CoachChatConversationState;
  streaming: boolean;
  onDelta?: (delta: string) => void;
  planningDurationMs: number;
  orchestrationDurationMs: number;
  composition?: CoachExpertCompositionResult;
  personaGuidance?: CoachPersonaGuidance;
  explanation?: CoachExplanation;
};

export type AgentExecutionResult = {
  assistantText: string;
  fallbackUsed: boolean;
  executedSteps: readonly AgentExecutionStep[];
  actionResults: readonly AgentActionResult[];
  prompt: AiLlmPrompt;
  reply: CoachChatReply;
  toolExecutionOutcome: AgentToolExecutionOutcome;
  memorySnapshot: AgentMemorySnapshot;
  state: AgentExecutionState;
  lifecycleEvents: readonly AgentExecutionLifecycleEvent[];
};
