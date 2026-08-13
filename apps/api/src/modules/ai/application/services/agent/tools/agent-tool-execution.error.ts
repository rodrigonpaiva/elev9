import type { AgentToolExecutionErrorCode } from './agent-tool-execution.types';

export class AgentToolExecutionError extends Error {
  constructor(
    public readonly toolId: string,
    public readonly code: AgentToolExecutionErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AgentToolExecutionError';
  }
}
