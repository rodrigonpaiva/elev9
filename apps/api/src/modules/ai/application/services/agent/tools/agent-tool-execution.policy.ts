import { Injectable } from '@nestjs/common';

import type { AgentToolDescriptor } from './agent-tool.types';
import type {
  AgentToolExecutionErrorCode,
  AgentToolExecutionStatus,
} from './agent-tool-execution.types';

type AgentToolExecutionPolicyDecision = {
  status: 'execute' | 'skipped';
  resultStatus: AgentToolExecutionStatus;
  errorCode?: AgentToolExecutionErrorCode;
  summary: string;
};

const SUPPORTED_TOOL_IDS = new Set([
  'UserProfileTool',
  'TrainingTool',
  'NutritionTool',
  'RecoveryTool',
  'GoalTool',
  'ConversationMemoryTool',
]);

@Injectable()
export class AgentToolExecutionPolicy {
  evaluate(input: {
    tool: AgentToolDescriptor;
    enabled: boolean;
    executedToolCount: number;
    maxToolCalls: number;
  }): AgentToolExecutionPolicyDecision {
    if (!input.enabled) {
      return this.skip('TOOLS_DISABLED', 'Agent tools are disabled.');
    }

    if (!input.tool.enabled) {
      return this.skip('TOOL_DISABLED', 'Tool is disabled in the registry.');
    }

    if (!SUPPORTED_TOOL_IDS.has(input.tool.id)) {
      return this.skip(
        'TOOL_NOT_SUPPORTED',
        'Tool is not supported by the execution pipeline.',
      );
    }

    if (!this.isReadOnly(input.tool)) {
      return this.skip(
        'TOOL_NOT_READ_ONLY',
        'Tool is not read-only and cannot execute.',
      );
    }

    if (input.executedToolCount >= input.maxToolCalls) {
      return this.skip(
        'MAX_TOOL_CALLS_REACHED',
        'Maximum tool call count reached.',
      );
    }

    return {
      status: 'execute',
      resultStatus: 'SUCCESS',
      summary: 'Tool execution permitted.',
    };
  }

  private isReadOnly(tool: AgentToolDescriptor): boolean {
    return tool.metadata.capabilities.every((capability) =>
      capability.startsWith('READ_'),
    );
  }

  private skip(
    errorCode: AgentToolExecutionErrorCode,
    summary: string,
  ): AgentToolExecutionPolicyDecision {
    return {
      status: 'skipped',
      resultStatus: 'SKIPPED',
      errorCode,
      summary,
    };
  }
}
