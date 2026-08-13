import { Injectable } from '@nestjs/common';

import type {
  AgentExecutionLifecycle,
  AgentExecutionLifecycleEvent,
  AgentExecutionStep,
  AgentExecutionStepName,
} from './agent-execution.types';
import type { AgentPlan } from '../agent.types';

const EXECUTION_STEP_ORDER: readonly AgentExecutionStepName[] = [
  'LOAD_CONTEXT',
  'EXECUTE_TOOL',
  'BUILD_PROMPT',
  'CALL_LLM',
  'GENERATE_FALLBACK',
  'PERSIST_MESSAGES',
  'UPDATE_MEMORY',
  'UPDATE_CONVERSATION_MEMORY',
  'COMPLETE',
];

const CRITICAL_STEPS = new Set<AgentExecutionStepName>([
  'LOAD_CONTEXT',
  'EXECUTE_TOOL',
  'BUILD_PROMPT',
  'CALL_LLM',
  'GENERATE_FALLBACK',
  'PERSIST_MESSAGES',
  'UPDATE_MEMORY',
]);

@Injectable()
export class AgentExecutionPolicy {
  buildExecutionSteps(plan: AgentPlan): AgentExecutionStepName[] {
    const steps: AgentExecutionStepName[] = ['LOAD_CONTEXT', 'EXECUTE_TOOL'];

    steps.push('BUILD_PROMPT');

    if (plan.executionStrategy === 'FALLBACK_ONLY') {
      steps.push('GENERATE_FALLBACK');
    } else {
      steps.push('CALL_LLM');
    }

    steps.push('PERSIST_MESSAGES', 'UPDATE_MEMORY');

    return steps;
  }

  isCriticalStep(step: AgentExecutionStepName): boolean {
    return CRITICAL_STEPS.has(step);
  }

  isTerminalStep(step: AgentExecutionStepName): boolean {
    return step === 'COMPLETE';
  }

  validateStepOrder(steps: readonly AgentExecutionStepName[]): string[] {
    const issues: string[] = [];
    const seen = new Set<string>();
    let previousIndex = -1;

    for (const step of steps) {
      const currentIndex = EXECUTION_STEP_ORDER.indexOf(step);

      if (currentIndex === -1) {
        issues.push(`Unsupported execution step "${step}".`);
        continue;
      }

      if (seen.has(step)) {
        issues.push(`Duplicate execution step "${step}".`);
      }

      seen.add(step);

      if (currentIndex < previousIndex) {
        issues.push(`Invalid step order around "${step}".`);
      }

      previousIndex = Math.max(previousIndex, currentIndex);
    }

    if (steps.length === 0) {
      issues.push('Execution must include at least one step.');
    }

    if (!steps.includes('LOAD_CONTEXT')) {
      issues.push('Execution must include a load-context step.');
    }

    if (!steps.includes('EXECUTE_TOOL')) {
      issues.push('Execution must include a tool-execution step.');
    }

    if (!steps.includes('BUILD_PROMPT')) {
      issues.push('Execution must include a prompt-building step.');
    }

    if (!steps.includes('CALL_LLM') && !steps.includes('GENERATE_FALLBACK')) {
      issues.push('Execution must include a reply-generation step.');
    }

    if (!steps.includes('PERSIST_MESSAGES')) {
      issues.push('Execution must include message persistence.');
    }

    if (!steps.includes('UPDATE_MEMORY')) {
      issues.push('Execution must include a memory update step.');
    }

    return issues;
  }

  buildLifecycleEvent(input: {
    event: AgentExecutionLifecycle;
    summary: string;
    now?: Date;
    step?: AgentExecutionStepName;
    metadata?: Record<string, unknown>;
  }): AgentExecutionLifecycleEvent {
    return {
      event: input.event,
      ...(input.step ? { step: input.step } : {}),
      timestamp: (input.now ?? new Date()).toISOString(),
      summary: input.summary,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };
  }

  buildStep(
    step: AgentExecutionStepName,
    status: AgentExecutionStep['status'],
    summary?: string,
    metadata?: Record<string, unknown>,
    now = new Date(),
  ): AgentExecutionStep {
    return {
      step,
      status,
      startedAt: now.toISOString(),
      completedAt: status === 'pending' ? undefined : now.toISOString(),
      ...(summary ? { summary } : {}),
      ...(metadata ? { metadata } : {}),
    };
  }
}
