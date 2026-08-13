import { Inject, Injectable } from '@nestjs/common';

import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from '../../../../domain/repositories/coach-conversation-memory.repository';
import type { CoachConversationMemory } from '../../../../domain/entities/coach-conversation-memory.entity';
import { AgentTraceService } from '../observability/agent-trace.service';
import { AgentMemoryPolicy } from './agent-memory.policy';
import type {
  AgentConversationMemory,
  AgentMemoryExecutionInput,
  AgentMemoryLifecycleEvent,
  AgentMemoryRequest,
  AgentMemorySessionUpdateInput,
  AgentMemorySnapshot,
  AgentMemorySnapshotInput,
  SessionMemory,
  WorkingMemory,
} from './agent-memory.types';

type InternalMemoryState<T> = {
  value: T;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AgentMemoryService {
  private readonly workingMemoryStore = new Map<
    string,
    InternalMemoryState<WorkingMemory>
  >();
  private readonly sessionMemoryStore = new Map<
    string,
    InternalMemoryState<SessionMemory>
  >();
  private readonly lifecycleEvents: AgentMemoryLifecycleEvent[] = [];

  constructor(
    private readonly policy: AgentMemoryPolicy,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  createWorkingMemory(
    input: AgentMemoryExecutionInput,
    now = new Date(),
  ): WorkingMemory {
    const timestamp = now.toISOString();
    const request = this.sanitizeRequest(input.request);
    const workingMemory: WorkingMemory = {
      request,
      intent: input.intent,
      selectedDomains: [...input.selectedDomains],
      selectedTools: [...input.selectedTools],
      executionPlan: input.executionPlan,
      toolResults: [...(input.toolResults ?? [])],
      ...(input.runtimeMetadata
        ? { runtimeMetadata: this.cloneValue(input.runtimeMetadata) }
        : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.workingMemoryStore.set(request.sessionMetadata.requestId, {
      value: workingMemory,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'WORKING',
        event: 'CREATE',
        memoryId: request.sessionMetadata.requestId,
        summary: 'Created working memory for the current agent execution.',
        now,
      }),
    );

    return this.freezeDeep(this.cloneValue(workingMemory));
  }

  updateWorkingMemory(
    requestId: string,
    input: Partial<
      Pick<
        WorkingMemory,
        | 'intent'
        | 'selectedDomains'
        | 'selectedTools'
        | 'executionPlan'
        | 'toolResults'
        | 'runtimeMetadata'
      >
    >,
    now = new Date(),
  ): WorkingMemory {
    const current = this.workingMemoryStore.get(requestId);

    if (!current) {
      throw new Error('Working memory not found.');
    }

    const nextWorkingMemory: WorkingMemory = {
      ...current.value,
      ...(input.intent ? { intent: input.intent } : {}),
      ...(input.selectedDomains
        ? { selectedDomains: [...input.selectedDomains] }
        : {}),
      ...(input.selectedTools
        ? { selectedTools: [...input.selectedTools] }
        : {}),
      ...(input.executionPlan ? { executionPlan: input.executionPlan } : {}),
      ...(input.toolResults ? { toolResults: [...input.toolResults] } : {}),
      ...(input.runtimeMetadata
        ? { runtimeMetadata: this.cloneValue(input.runtimeMetadata) }
        : {}),
      updatedAt: now.toISOString(),
    };

    this.workingMemoryStore.set(requestId, {
      value: nextWorkingMemory,
      createdAt: current.createdAt,
      updatedAt: nextWorkingMemory.updatedAt,
    });
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'WORKING',
        event: 'UPDATE',
        memoryId: requestId,
        summary: 'Updated working memory during the agent execution.',
        now,
      }),
    );

    return this.freezeDeep(this.cloneValue(nextWorkingMemory));
  }

  loadSessionMemory(conversationId: string, now = new Date()): SessionMemory {
    const current = this.sessionMemoryStore.get(conversationId);

    if (!current) {
      const sessionMemory = this.policy.createEmptySessionMemory(
        conversationId,
        now,
      );

      this.sessionMemoryStore.set(conversationId, {
        value: sessionMemory,
        createdAt: sessionMemory.createdAt,
        updatedAt: sessionMemory.updatedAt,
      });
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'SESSION',
          event: 'CREATE',
          memoryId: conversationId,
          summary: 'Created session memory for the conversation.',
          now,
        }),
      );
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'SESSION',
          event: 'READ',
          memoryId: conversationId,
          summary: 'Loaded session memory for the conversation.',
          now,
        }),
      );

      return this.freezeDeep(this.cloneValue(sessionMemory));
    }

    if (this.policy.isSessionExpired(current.value, now)) {
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'SESSION',
          event: 'EXPIRE',
          memoryId: conversationId,
          summary: 'Session memory expired and was refreshed.',
          now,
          metadata: {
            expiresAt: current.value.expiresAt,
          },
        }),
      );

      const refreshedSessionMemory = this.policy.createEmptySessionMemory(
        conversationId,
        now,
      );

      this.sessionMemoryStore.set(conversationId, {
        value: refreshedSessionMemory,
        createdAt: refreshedSessionMemory.createdAt,
        updatedAt: refreshedSessionMemory.updatedAt,
      });
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'SESSION',
          event: 'CREATE',
          memoryId: conversationId,
          summary: 'Created refreshed session memory for the conversation.',
          now,
        }),
      );
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'SESSION',
          event: 'READ',
          memoryId: conversationId,
          summary: 'Loaded refreshed session memory for the conversation.',
          now,
        }),
      );

      return this.freezeDeep(this.cloneValue(refreshedSessionMemory));
    }

    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'SESSION',
        event: 'READ',
        memoryId: conversationId,
        summary: 'Loaded session memory for the conversation.',
        now,
      }),
    );

    return this.freezeDeep(this.cloneValue(current.value));
  }

  updateSessionMemory(
    input: AgentMemorySessionUpdateInput,
    now = new Date(),
  ): SessionMemory {
    const currentSession = this.loadSessionMemory(input.conversationId, now);
    const entries = this.policy.buildSessionEntries({
      goal: input.goal,
      coachDecision: input.coachDecision,
      toolResults: input.toolResults,
      executionSummary: input.executionSummary,
      temporaryPreferences: input.temporaryPreferences,
      now,
    });
    const updatedSession = this.policy.appendSessionEntries(
      currentSession,
      entries,
      now,
    );

    this.sessionMemoryStore.set(input.conversationId, {
      value: updatedSession,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
    });
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'SESSION',
        event: 'UPDATE',
        memoryId: input.conversationId,
        summary: 'Updated session memory after completing the agent turn.',
        now,
        metadata: {
          entryCount: entries.length,
        },
      }),
    );

    return this.freezeDeep(this.cloneValue(updatedSession));
  }

  async loadConversationMemory(
    input: {
      conversationId: string;
      conversationMemory?: AgentConversationMemory;
    },
    now = new Date(),
  ): Promise<AgentConversationMemory> {
    const fromInput = input.conversationMemory;
    const resolvedConversationMemory =
      fromInput ?? (await this.findConversationMemory(input.conversationId));
    let snapshotConversationMemory: AgentConversationMemory;

    if (fromInput) {
      snapshotConversationMemory = fromInput;
    } else if (resolvedConversationMemory) {
      snapshotConversationMemory = this.toConversationMemory(
        resolvedConversationMemory,
      );
    } else {
      snapshotConversationMemory = undefined;
    }

    if (!snapshotConversationMemory) {
      this.recordLifecycleEvent(
        this.policy.buildLifecycleEvent({
          scope: 'CONVERSATION',
          event: 'READ',
          memoryId: input.conversationId,
          summary: 'Conversation memory is unavailable for this conversation.',
          now,
        }),
      );

      return undefined;
    }

    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'CONVERSATION',
        event: 'READ',
        memoryId: input.conversationId,
        summary: 'Loaded conversation memory for the current execution.',
        now,
        metadata: {
          version: snapshotConversationMemory.metadata.version,
        },
      }),
    );

    return this.freezeDeep(this.cloneValue(snapshotConversationMemory));
  }

  createSnapshot(
    input: AgentMemorySnapshotInput,
    now = new Date(),
  ): AgentMemorySnapshot {
    const startedAt = Date.now();
    const workingMemory = this.workingMemoryStore.get(input.requestId)?.value;
    const sessionMemory = this.sessionMemoryStore.get(
      input.conversationId,
    )?.value;

    if (!workingMemory) {
      throw new Error('Working memory not found.');
    }

    if (!sessionMemory) {
      throw new Error('Session memory not found.');
    }

    const snapshotConversationMemory = input.conversationMemory
      ? this.freezeDeep(this.cloneValue(input.conversationMemory))
      : undefined;
    const lifecycleEvents = this.collectLifecycleEvents({
      requestId: input.requestId,
      conversationId: input.conversationId,
    });
    const metadata = this.policy.buildMetadata({
      workingMemory,
      sessionMemory,
      conversationMemory: snapshotConversationMemory,
      lifecycleEvents,
      expired: this.policy.isSessionExpired(sessionMemory, now),
    });
    const snapshot: AgentMemorySnapshot = {
      workingMemory: this.freezeDeep(this.cloneValue(workingMemory)),
      sessionMemory: this.freezeDeep(this.cloneValue(sessionMemory)),
      ...(snapshotConversationMemory
        ? { conversationMemory: snapshotConversationMemory }
        : {}),
      metadata: this.freezeDeep(this.cloneValue(metadata)),
    };

    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'WORKING',
        event: 'SNAPSHOT',
        memoryId: input.requestId,
        summary: 'Created a working memory snapshot for observability.',
        now,
        metadata: {
          conversationId: input.conversationId,
        },
      }),
    );
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'SESSION',
        event: 'SNAPSHOT',
        memoryId: input.conversationId,
        summary: 'Created a session memory snapshot for observability.',
        now,
      }),
    );
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'CONVERSATION',
        event: 'SNAPSHOT',
        memoryId: input.conversationId,
        summary: 'Created a conversation memory snapshot for observability.',
        now,
      }),
    );

    const durationMs = Date.now() - startedAt;
    this.agentTraceService?.recordMemorySnapshot(input.requestId, {
      metadata: this.freezeDeep(this.cloneValue(snapshot.metadata)),
    });
    this.agentTraceService?.recordEvent(input.requestId, {
      event: 'MEMORY_SNAPSHOT_CREATED',
      timestamp: now.toISOString(),
      summary: 'Created an internal memory snapshot.',
      metadata: {
        durationMs,
        workingMemorySize: snapshot.metadata.workingMemorySize,
        sessionMemorySize: snapshot.metadata.sessionMemorySize,
        conversationMemorySize: snapshot.metadata.conversationMemorySize,
        snapshotCreated: snapshot.metadata.snapshotCreated,
        expired: snapshot.metadata.expired,
      },
    });

    return this.freezeDeep(this.cloneValue(snapshot));
  }

  clearWorkingMemory(requestId: string, now = new Date()): void {
    const current = this.workingMemoryStore.get(requestId);

    if (!current) {
      return;
    }

    this.workingMemoryStore.delete(requestId);
    this.recordLifecycleEvent(
      this.policy.buildLifecycleEvent({
        scope: 'WORKING',
        event: 'CLEAR',
        memoryId: requestId,
        summary: 'Cleared working memory after completing the agent execution.',
        now,
      }),
    );
  }

  private async findConversationMemory(
    conversationId: string,
  ): Promise<CoachConversationMemory | undefined> {
    const memory =
      await this.coachConversationMemoryRepository.findByConversationId(
        conversationId,
      );

    if (!memory) {
      return undefined;
    }

    return memory;
  }

  private toConversationMemory(
    memory: Pick<CoachConversationMemory, 'summary' | 'metadata'>,
  ): AgentConversationMemory {
    const payload = {
      summary: memory.summary,
      metadata: {
        generatedFromMessageCount:
          memory.metadata.generatedFromMessageCount ?? 0,
        version: memory.metadata.version,
      },
    };

    return this.freezeDeep(this.cloneValue(payload));
  }

  private sanitizeRequest(
    request: AgentMemoryExecutionInput['request'],
  ): AgentMemoryRequest {
    const { signal: _signal, onDelta: _onDelta, ...sanitizedRequest } = request;

    return this.freezeDeep(this.cloneValue(sanitizedRequest));
  }

  private recordLifecycleEvent(event: AgentMemoryLifecycleEvent): void {
    this.lifecycleEvents.push(event);
  }

  private collectLifecycleEvents(input: {
    requestId: string;
    conversationId: string;
  }): readonly AgentMemoryLifecycleEvent[] {
    return this.lifecycleEvents.filter(
      (event) =>
        event.memoryId === input.requestId ||
        event.memoryId === input.conversationId,
    );
  }

  private cloneValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }

  private freezeDeep<T>(value: T): Readonly<T> {
    if (value === null || typeof value !== 'object') {
      return value as Readonly<T>;
    }

    const stack: unknown[] = [value];
    const seen = new WeakSet<object>();

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current || typeof current !== 'object' || seen.has(current)) {
        continue;
      }

      seen.add(current);
      Object.freeze(current);

      for (const key of Reflect.ownKeys(current)) {
        const nested = (current as Record<PropertyKey, unknown>)[key];

        if (nested && typeof nested === 'object') {
          stack.push(nested);
        }
      }
    }

    return value as Readonly<T>;
  }
}
