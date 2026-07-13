import { Injectable } from '@nestjs/common';

import type { AgentPlan } from '../agent.types';
import type {
  AgentExecutionStepName,
  AgentExecutionValidationResult,
} from './agent-execution.types';
import { AgentExecutionPolicy } from './agent-execution.policy';

@Injectable()
export class AgentExecutionValidator {
  constructor(private readonly policy: AgentExecutionPolicy) {}

  validate(input: {
    plan: AgentPlan;
    steps: readonly AgentExecutionStepName[];
  }): AgentExecutionValidationResult {
    const issues: string[] = [];

    if (!input.plan.intent) {
      issues.push('Execution plan must declare an intent.');
    }

    if (input.plan.requiredContextDomains.length === 0) {
      issues.push('Execution plan must include at least one context domain.');
    }

    if (input.plan.selectedTools.length === 0) {
      issues.push('Execution plan must include at least one selected tool.');
    }

    if (input.plan.planningSteps.length === 0) {
      issues.push('Execution plan must include planning steps.');
    }

    if (input.plan.maximumExecutionDepth < 1) {
      issues.push('Execution plan must declare a positive maximum depth.');
    }

    if (input.plan.maximumExecutionDepth > input.plan.maxSteps) {
      issues.push('Maximum execution depth cannot exceed max steps.');
    }

    issues.push(...this.policy.validateStepOrder(input.steps));

    return {
      status: issues.length > 0 ? 'invalid' : 'valid',
      issues,
    };
  }

  ensureValid(input: {
    plan: AgentPlan;
    steps: readonly AgentExecutionStepName[];
  }): AgentExecutionValidationResult {
    const validation = this.validate(input);

    if (validation.status === 'invalid') {
      throw new Error(
        `Invalid agent execution: ${validation.issues.join('; ')}`,
      );
    }

    return validation;
  }

  validateCompletion(input: {
    steps: readonly AgentExecutionStepName[];
  }): AgentExecutionValidationResult {
    const issues: string[] = [];

    if (!input.steps.includes('COMPLETE')) {
      issues.push('Execution must finish with a COMPLETE step.');
    }

    return {
      status: issues.length > 0 ? 'invalid' : 'valid',
      issues,
    };
  }
}
