import { Injectable } from '@nestjs/common';

import type {
  AgentAction,
  AgentContext,
  AgentContextDomain,
  AgentIntent,
  AgentSafetyConstraint,
  AgentToolDescriptor,
} from '../agent.types';
import type { CoachExpertMetadata } from '../../experts/coach-expert.types';
import type {
  AgentExecutionStrategy,
  AgentPlanningPolicyDecision,
  AgentPlanningStep,
  AgentPlanningStepName,
} from './agent-planning.types';

const STRATEGY_BY_INTENT: Record<AgentIntent, AgentExecutionStrategy> = {
  GENERAL_CHAT: 'DIRECT_REPLY',
  TRAINING: 'MULTI_CONTEXT',
  NUTRITION: 'SINGLE_CONTEXT',
  RECOVERY: 'SINGLE_CONTEXT',
  GOALS: 'COACH_GUIDED',
  HABITS: 'MEMORY_ENRICHED',
  PERSONALIZATION: 'MEMORY_ENRICHED',
  PROGRESS: 'MULTI_CONTEXT',
  DASHBOARD: 'COACH_GUIDED',
  MOTIVATION: 'COACH_GUIDED',
  PLANNING: 'MULTI_CONTEXT',
  UNKNOWN: 'FALLBACK_ONLY',
};

const EXECUTION_DEPTH_BY_STRATEGY: Record<AgentExecutionStrategy, number> = {
  DIRECT_REPLY: 2,
  SINGLE_CONTEXT: 3,
  MULTI_CONTEXT: 4,
  MEMORY_ENRICHED: 4,
  COACH_GUIDED: 5,
  FALLBACK_ONLY: 1,
};

const SAFETY_CONSTRAINTS: AgentSafetyConstraint[] = [
  'deterministic_first',
  'no_tool_execution',
  'public_api_unchanged',
  'fallback_required',
];

const STEP_TEMPLATES: Record<
  AgentExecutionStrategy,
  readonly AgentPlanningStepName[]
> = {
  DIRECT_REPLY: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'BUILD_PROMPT',
    'CALL_LLM',
    'PERSIST_MESSAGES',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
  SINGLE_CONTEXT: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'LOAD_CONTEXT',
    'BUILD_PROMPT',
    'CALL_LLM',
    'PERSIST_MESSAGES',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
  MULTI_CONTEXT: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'LOAD_CONTEXT',
    'BUILD_PROMPT',
    'CALL_LLM',
    'PERSIST_MESSAGES',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
  MEMORY_ENRICHED: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'LOAD_CONTEXT',
    'BUILD_PROMPT',
    'CALL_LLM',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
  COACH_GUIDED: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'LOAD_CONTEXT',
    'BUILD_PROMPT',
    'CALL_LLM',
    'PERSIST_MESSAGES',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
  FALLBACK_ONLY: [
    'CLASSIFY_INTENT',
    'SELECT_CONTEXT',
    'SELECT_TOOLS',
    'VALIDATE_PLAN',
    'GENERATE_FALLBACK',
    'PERSIST_MESSAGES',
    'UPDATE_MEMORY',
    'COMPLETE',
  ],
};

const TOOL_PRIORITY_BY_STRATEGY: Record<
  AgentExecutionStrategy,
  readonly string[]
> = {
  DIRECT_REPLY: [
    'ConversationMemoryTool',
    'UserProfileTool',
    'CoachDecisionTool',
  ],
  SINGLE_CONTEXT: [
    'NutritionTool',
    'RecoveryTool',
    'GoalTool',
    'ConversationMemoryTool',
    'UserProfileTool',
    'CoachDecisionTool',
    'HealthContextTool',
  ],
  MULTI_CONTEXT: [
    'TrainingTool',
    'RecoveryTool',
    'GoalTool',
    'ProgressTool',
    'HealthContextTool',
    'CoachDecisionTool',
    'ConversationMemoryTool',
    'UserProfileTool',
  ],
  MEMORY_ENRICHED: [
    'ConversationMemoryTool',
    'UserProfileTool',
    'PersonalizationTool',
    'HabitTool',
    'CoachDecisionTool',
    'HealthContextTool',
  ],
  COACH_GUIDED: [
    'CoachDecisionTool',
    'ConversationMemoryTool',
    'UserProfileTool',
    'GoalTool',
    'ProgressTool',
    'HealthContextTool',
    'TrainingTool',
    'RecoveryTool',
  ],
  FALLBACK_ONLY: [
    'ConversationMemoryTool',
    'UserProfileTool',
    'CoachDecisionTool',
  ],
};

@Injectable()
export class AgentPlanningPolicy {
  selectExecutionStrategy(input: {
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
  }): AgentExecutionStrategy {
    const strategy = STRATEGY_BY_INTENT[input.intent];

    if (strategy === 'COACH_GUIDED' && input.selectedDomains.length <= 5) {
      return 'MEMORY_ENRICHED';
    }

    if (strategy === 'MULTI_CONTEXT' && input.selectedDomains.length <= 4) {
      return 'SINGLE_CONTEXT';
    }

    return strategy;
  }

  buildDecision(input: {
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
    selectedTools: readonly AgentToolDescriptor[];
    responseMode: 'standard' | 'stream';
  }): AgentPlanningPolicyDecision {
    void input.responseMode;
    const executionStrategy = this.selectExecutionStrategy({
      intent: input.intent,
      selectedDomains: input.selectedDomains,
    });

    return {
      executionStrategy,
      planningSteps: this.buildPlanningSteps(executionStrategy),
      safetyConstraints: SAFETY_CONSTRAINTS,
      maximumExecutionDepth: EXECUTION_DEPTH_BY_STRATEGY[executionStrategy],
      expectedCost: this.sumCost(input.selectedTools),
      expectedLatencyMs: this.sumLatency(input.selectedTools),
    };
  }

  orderTools(
    executionStrategy: AgentExecutionStrategy,
    tools: readonly AgentToolDescriptor[],
  ): AgentToolDescriptor[] {
    const priority = TOOL_PRIORITY_BY_STRATEGY[executionStrategy];
    const prioritizedToolIds = new Set(priority);
    const ordered = priority
      .map((toolId) => tools.find((tool) => tool.id === toolId))
      .filter((tool): tool is AgentToolDescriptor => Boolean(tool));
    const remaining = tools.filter((tool) => !prioritizedToolIds.has(tool.id));

    return [...ordered, ...remaining];
  }

  buildActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const selectedDomains = new Set(context.selectedDomains);

    if (selectedDomains.has('user_profile')) {
      actions.push({
        type: 'READ_USER_PROFILE',
        domain: 'user_profile',
        summary: 'Inspect the user profile context selected by the policy.',
      });
    }

    if (selectedDomains.has('health')) {
      actions.push({
        type: 'READ_HEALTH_CONTEXT',
        domain: 'health',
        summary: 'Inspect the broad health context selected by the policy.',
      });
    }

    if (selectedDomains.has('training')) {
      actions.push({
        type: 'READ_TRAINING_CONTEXT',
        domain: 'training',
        summary: 'Inspect the training context selected by the policy.',
      });
    }

    if (selectedDomains.has('nutrition')) {
      actions.push({
        type: 'READ_NUTRITION_CONTEXT',
        domain: 'nutrition',
        summary: 'Inspect the nutrition context selected by the policy.',
      });
    }

    if (selectedDomains.has('recovery')) {
      actions.push({
        type: 'READ_RECOVERY_CONTEXT',
        domain: 'recovery',
        summary: 'Inspect the recovery context selected by the policy.',
      });
    }

    if (selectedDomains.has('goals')) {
      actions.push({
        type: 'READ_GOALS_CONTEXT',
        domain: 'goals',
        summary: 'Inspect the goals context selected by the policy.',
      });
    }

    if (selectedDomains.has('progress')) {
      actions.push({
        type: 'READ_PROGRESS_CONTEXT',
        domain: 'progress',
        summary: 'Inspect the progress context selected by the policy.',
      });
    }

    if (selectedDomains.has('habits')) {
      actions.push({
        type: 'READ_HABIT_CONTEXT',
        domain: 'habits',
        summary: 'Inspect the habits context selected by the policy.',
      });
    }

    if (selectedDomains.has('personalization')) {
      actions.push({
        type: 'READ_PERSONALIZATION_CONTEXT',
        domain: 'personalization',
        summary: 'Inspect the personalization context selected by the policy.',
      });
    }

    if (selectedDomains.has('notifications')) {
      actions.push({
        type: 'READ_NOTIFICATION_CONTEXT',
        domain: 'notifications',
        summary: 'Inspect the notification context selected by the policy.',
      });
    }

    if (selectedDomains.has('coach_decision')) {
      actions.push({
        type: 'READ_COACH_DECISION',
        domain: 'coach_decision',
        summary: 'Inspect the coach decision selected by the policy.',
      });
    }

    if (selectedDomains.has('conversation_memory')) {
      actions.push({
        type: 'READ_MEMORY',
        domain: 'conversation_memory',
        summary: 'Inspect the conversation memory selected by the policy.',
      });
    }

    if (selectedDomains.has('recent_messages')) {
      actions.push({
        type: 'READ_RECENT_MESSAGES',
        domain: 'recent_messages',
        summary: 'Inspect the recent messages selected by the policy.',
      });
    }

    actions.push({
      type: 'GENERATE_REPLY',
      domain: 'coach_decision',
      summary: 'Generate the final coaching reply after contextual inspection.',
    });

    return actions;
  }

  buildPlanningSteps(
    executionStrategy: AgentExecutionStrategy,
  ): AgentPlanningStep[] {
    return STEP_TEMPLATES[executionStrategy].map((step) =>
      this.createPlanningStep(step, executionStrategy),
    );
  }

  buildSummary(input: {
    intent: AgentIntent;
    executionStrategy: AgentExecutionStrategy;
    responseMode: 'standard' | 'stream';
    selectedDomains: readonly AgentContextDomain[];
    selectedTools: readonly AgentToolDescriptor[];
    selectedExperts: readonly CoachExpertMetadata[];
    maximumExecutionDepth: number;
    expectedCost: number;
    expectedLatencyMs: number;
  }): string {
    const selectedToolIds = input.selectedTools
      .map((tool) => tool.id)
      .join(',');
    const selectedExpertIds = input.selectedExperts
      .map((expert) => expert.id)
      .join(',');

    return `intent=${input.intent}; strategy=${input.executionStrategy}; mode=${input.responseMode}; domains=${input.selectedDomains.join(',')}; tools=${selectedToolIds}; experts=${selectedExpertIds}; maxDepth=${input.maximumExecutionDepth}; cost=${input.expectedCost}; latencyMs=${input.expectedLatencyMs}`;
  }

  orderExperts(experts: readonly CoachExpertMetadata[]): CoachExpertMetadata[] {
    return [...experts].sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }

      return left.id.localeCompare(right.id);
    });
  }

  private createPlanningStep(
    step: AgentPlanningStepName,
    executionStrategy: AgentExecutionStrategy,
  ): AgentPlanningStep {
    const summaries: Record<AgentPlanningStepName, string> = {
      CLASSIFY_INTENT: 'Classify the user request deterministically.',
      SELECT_CONTEXT:
        'Select the normalized context domains needed for planning.',
      SELECT_TOOLS: `Select the internal tools associated with ${executionStrategy.toLowerCase()} execution.`,
      VALIDATE_PLAN:
        'Validate the plan before it is attached to runtime metadata.',
      LOAD_CONTEXT: 'Load the context slices required by the plan.',
      BUILD_PROMPT: 'Build the deterministic prompt from the selected context.',
      CALL_LLM: 'Call the configured LLM with the validated prompt.',
      GENERATE_FALLBACK: 'Generate the deterministic fallback reply if needed.',
      PERSIST_MESSAGES:
        'Persist the conversation messages after reply generation.',
      UPDATE_MEMORY: 'Update the conversation memory after persistence.',
      COMPLETE: 'Complete the planning pass and freeze the execution plan.',
    };

    return {
      step,
      summary: summaries[step],
      metadata: {
        executionStrategy,
        step,
      },
    };
  }

  private sumCost(tools: readonly AgentToolDescriptor[]): number {
    return tools.reduce((sum, tool) => sum + tool.estimatedCost, 0);
  }

  private sumLatency(tools: readonly AgentToolDescriptor[]): number {
    return tools.reduce((sum, tool) => sum + tool.estimatedLatencyMs, 0);
  }
}
