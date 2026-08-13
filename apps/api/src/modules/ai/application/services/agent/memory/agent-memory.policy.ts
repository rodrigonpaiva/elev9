import { Injectable } from '@nestjs/common';

import { AgentRuntimeConfigService } from '../agent-runtime.config';
import type {
  AgentConversationMemory,
  AgentMemoryMetadata,
  AgentMemoryLifecycleEvent,
  AgentMemoryScope,
  SessionMemory,
  SessionMemoryEntry,
  WorkingMemory,
} from './agent-memory.types';

@Injectable()
export class AgentMemoryPolicy {
  constructor(private readonly config: AgentRuntimeConfigService) {}

  getSessionMemoryMaxItems(): number {
    return this.config.getSessionMemoryMaxItems();
  }

  getSessionMemoryTtlMs(): number {
    return this.config.getSessionMemoryTtlMs();
  }

  createEmptySessionMemory(
    conversationId: string,
    now = new Date(),
  ): SessionMemory {
    const timestamp = now.toISOString();

    return {
      conversationId,
      entries: [],
      recentGoals: [],
      recentCoachDecisions: [],
      recentToolResults: [],
      temporaryPreferences: {},
      recentExecutionSummaries: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(
        now.getTime() + this.getSessionMemoryTtlMs(),
      ).toISOString(),
    };
  }

  isSessionExpired(sessionMemory: SessionMemory, now = new Date()): boolean {
    return new Date(sessionMemory.expiresAt).getTime() <= now.getTime();
  }

  appendSessionEntries(
    sessionMemory: SessionMemory,
    entries: readonly SessionMemoryEntry[],
    now = new Date(),
  ): SessionMemory {
    const maxItems = this.getSessionMemoryMaxItems();
    const mergedEntries = [...sessionMemory.entries, ...entries].slice(
      -maxItems,
    );
    const timestamp = now.toISOString();

    return this.createSessionMemoryFromEntries(sessionMemory.conversationId, {
      entries: mergedEntries,
      createdAt: sessionMemory.createdAt,
      updatedAt: timestamp,
      expiresAt: new Date(
        now.getTime() + this.getSessionMemoryTtlMs(),
      ).toISOString(),
    });
  }

  createSessionMemoryFromEntries(
    conversationId: string,
    input: {
      entries: readonly SessionMemoryEntry[];
      createdAt: string;
      updatedAt: string;
      expiresAt: string;
    },
  ): SessionMemory {
    const recentGoals = input.entries
      .filter((entry) => entry.type === 'recent_goal')
      .map((entry) => String(entry.value))
      .slice(-this.getSessionMemoryMaxItems());
    const recentCoachDecisions = input.entries
      .filter((entry) => entry.type === 'recent_coach_decision')
      .map(
        (entry) => entry.value as SessionMemory['recentCoachDecisions'][number],
      )
      .slice(-this.getSessionMemoryMaxItems());
    const recentToolResults = input.entries
      .filter((entry) => entry.type === 'recent_tool_result')
      .map((entry) => entry.value as SessionMemory['recentToolResults'][number])
      .slice(-this.getSessionMemoryMaxItems());
    const temporaryPreferences = input.entries
      .filter((entry) => entry.type === 'temporary_preference')
      .reduce<Record<string, unknown>>((accumulator, entry) => {
        if (entry.value && typeof entry.value === 'object') {
          return {
            ...accumulator,
            ...(entry.value as Record<string, unknown>),
          };
        }

        return accumulator;
      }, {});
    const recentExecutionSummaries = input.entries
      .filter((entry) => entry.type === 'recent_execution_summary')
      .map((entry) => String(entry.value))
      .slice(-this.getSessionMemoryMaxItems());

    return {
      conversationId,
      entries: [...input.entries],
      recentGoals,
      recentCoachDecisions,
      recentToolResults,
      temporaryPreferences,
      recentExecutionSummaries,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      expiresAt: input.expiresAt,
    };
  }

  buildSessionEntries(input: {
    goal?: string;
    coachDecision?: {
      priority?: string;
      headline?: string;
      summary: string;
    };
    toolResults: readonly {
      toolId: string;
      status: string;
      summary: string;
      durationMs: number;
      errorCode?: string;
      metadata?: Record<string, unknown>;
    }[];
    executionSummary: string;
    temporaryPreferences?: Record<string, unknown>;
    now?: Date;
  }): SessionMemoryEntry[] {
    const timestamp = (input.now ?? new Date()).toISOString();
    const entries: SessionMemoryEntry[] = [];

    if (typeof input.goal === 'string' && input.goal.trim() !== '') {
      entries.push({
        type: 'recent_goal',
        value: input.goal.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (input.coachDecision) {
      entries.push({
        type: 'recent_coach_decision',
        value: {
          priority: input.coachDecision.priority,
          headline: input.coachDecision.headline,
          summary: input.coachDecision.summary,
          createdAt: timestamp,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    for (const toolResult of input.toolResults) {
      entries.push({
        type: 'recent_tool_result',
        value: {
          toolId: toolResult.toolId,
          status: toolResult.status,
          summary: toolResult.summary,
          durationMs: toolResult.durationMs,
          ...(toolResult.errorCode ? { errorCode: toolResult.errorCode } : {}),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (input.temporaryPreferences) {
      entries.push({
        type: 'temporary_preference',
        value: { ...input.temporaryPreferences },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (input.executionSummary.trim() !== '') {
      entries.push({
        type: 'recent_execution_summary',
        value: input.executionSummary.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return entries;
  }

  getWorkingMemorySize(workingMemory: WorkingMemory): number {
    let size = 0;

    if (workingMemory.request) {
      size += 1;
    }

    if (workingMemory.intent) {
      size += 1;
    }

    if (workingMemory.selectedDomains.length > 0) {
      size += 1;
    }

    if (workingMemory.selectedTools.length > 0) {
      size += 1;
    }

    if (workingMemory.executionPlan) {
      size += 1;
    }

    if (workingMemory.toolResults.length > 0) {
      size += 1;
    }

    if (workingMemory.runtimeMetadata) {
      size += 1;
    }

    return size;
  }

  getSessionMemorySize(sessionMemory: SessionMemory): number {
    return sessionMemory.entries.length;
  }

  getConversationMemorySize(
    conversationMemory?: AgentConversationMemory,
  ): number {
    if (!conversationMemory) {
      return 0;
    }

    return conversationMemory.metadata?.generatedFromMessageCount ?? 0;
  }

  buildMetadata(input: {
    workingMemory: WorkingMemory;
    sessionMemory: SessionMemory;
    conversationMemory?: AgentConversationMemory;
    lifecycleEvents: readonly AgentMemoryLifecycleEvent[];
    expired: boolean;
  }): AgentMemoryMetadata {
    return {
      workingMemorySize: this.getWorkingMemorySize(input.workingMemory),
      sessionMemorySize: this.getSessionMemorySize(input.sessionMemory),
      conversationMemorySize: this.getConversationMemorySize(
        input.conversationMemory,
      ),
      snapshotCreated: true,
      expired: input.expired,
      lifecycleEvents: [...input.lifecycleEvents],
    };
  }

  buildLifecycleEvent(input: {
    scope: AgentMemoryScope;
    event: AgentMemoryLifecycleEvent['event'];
    memoryId: string;
    summary: string;
    metadata?: Record<string, unknown>;
    now?: Date;
  }): AgentMemoryLifecycleEvent {
    return {
      scope: input.scope,
      event: input.event,
      memoryId: input.memoryId,
      timestamp: (input.now ?? new Date()).toISOString(),
      summary: input.summary,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };
  }
}
