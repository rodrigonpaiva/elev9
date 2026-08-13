import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentTraceService } from './agent-trace.service';
import type { AgentRequest } from '../agent.types';

describe('AgentTraceService', () => {
  const originalEnv = { ...process.env };
  const originalNow = Date.now;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AI_AGENT_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    Date.now = originalNow;
  });

  it('creates a sanitized trace without raw prompt or message payloads', () => {
    const service = createService();
    const request = buildRequest();

    const trace = service.startTrace({
      request,
      runtimeEnabled: true,
      toolsEnabled: false,
      requestTimestamp: '2026-07-05T10:00:00.000Z',
    });

    expect(trace.traceId).toBe(request.sessionMetadata.requestId);
    expect(trace.status).toBe('RUNNING');
    expect(trace.events[0]?.event).toBe('AGENT_STARTED');
    expect(JSON.stringify(trace)).not.toContain(request.userMessage);
    expect(JSON.stringify(trace)).not.toContain('raw prompt');
  });

  it('records policy, tool, execution, and memory snapshots with aggregated metrics', () => {
    const service = createService();
    const request = buildRequest();
    const traceId = request.sessionMetadata.requestId;

    service.startTrace({
      request,
      runtimeEnabled: true,
      toolsEnabled: true,
      requestTimestamp: '2026-07-05T10:00:00.000Z',
    });
    service.recordEvent(traceId, {
      event: 'INTENT_CLASSIFIED',
      timestamp: '2026-07-05T10:00:01.000Z',
      summary: 'Classified intent.',
      metadata: {
        intent: 'TRAINING',
        rationale: 'keyword match',
      },
    });
    service.recordEvent(traceId, {
      event: 'CONTEXT_SELECTED',
      timestamp: '2026-07-05T10:00:02.000Z',
      summary: 'Selected context.',
      metadata: {
        selectedDomains: ['training', 'goals'],
        orchestrationDurationMs: 12,
      },
    });
    service.recordEvent(traceId, {
      event: 'PLAN_CREATED',
      timestamp: '2026-07-05T10:00:03.000Z',
      summary: 'Created plan.',
      metadata: {
        executionStrategy: 'MULTI_CONTEXT',
        selectedDomains: ['training', 'goals'],
        candidateToolIds: ['TrainingTool'],
        selectedToolIds: ['TrainingTool'],
        planningDurationMs: 7,
      },
    });
    service.recordPolicySnapshot(traceId, {
      stage: 'PLANNING',
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedLLM: true,
      allowedDomains: ['training', 'goals'],
      blockedDomains: [],
      allowedTools: ['TrainingTool'],
      blockedTools: [],
      reason: 'Approved.',
      actions: ['ALLOW'],
      violations: [],
      policyEvaluation: buildPolicyEvaluation(),
    });
    service.recordToolSnapshot(traceId, {
      enabled: true,
      maxToolCalls: 4,
      timeoutMs: 3000,
      candidateToolIds: ['TrainingTool'],
      selectedToolIds: ['TrainingTool'],
      executedToolIds: ['TrainingTool'],
      skippedToolIds: [],
      failedToolIds: [],
      timeoutToolIds: [],
      estimatedCost: 2,
      estimatedLatencyMs: 12,
      metrics: {
        enabled: true,
        maxToolCalls: 4,
        timeoutMs: 3000,
        selectedToolCount: 1,
        executedToolCount: 1,
        skippedToolCount: 0,
        failedToolCount: 0,
        timeoutCount: 0,
        totalDurationMs: 12,
        selectedToolIds: ['TrainingTool'],
        executedToolIds: ['TrainingTool'],
        skippedToolIds: [],
        failedToolIds: [],
        timeoutToolIds: [],
        perToolDurationMs: [{ toolId: 'TrainingTool', durationMs: 12 }],
      },
      results: [
        {
          toolId: 'TrainingTool',
          status: 'SUCCESS',
          summary: 'Loaded training context.',
          durationMs: 12,
          metadata: { source: 'training-repository' },
        },
      ],
    });
    service.recordEvent(traceId, {
      event: 'MEMORY_SNAPSHOT_CREATED',
      timestamp: '2026-07-05T10:00:04.000Z',
      summary: 'Captured memory snapshot.',
      metadata: {
        durationMs: 3,
      },
    });
    service.recordMemorySnapshot(traceId, {
      metadata: {
        workingMemorySize: 7,
        sessionMemorySize: 11,
        conversationMemorySize: 1,
        snapshotCreated: true,
        expired: false,
        lifecycleEvents: [],
      },
    });
    service.recordExecutionSnapshot(traceId, {
      strategy: 'MULTI_CONTEXT',
      currentStep: 'CALL_LLM',
      completedStepCount: 4,
      failedStepCount: 0,
      skippedStepCount: 0,
      executedStepCount: 4,
      stepCount: 6,
      fallbackUsed: false,
      executionDurationMs: 41,
      steps: [
        {
          step: 'LOAD_CONTEXT',
          status: 'completed',
          startedAt: '2026-07-05T10:00:00.000Z',
          completedAt: '2026-07-05T10:00:00.010Z',
          summary: 'Loaded context.',
        },
      ],
      lifecycleEvents: [
        {
          event: 'STEP_START',
          timestamp: '2026-07-05T10:00:00.000Z',
          summary: 'Started step.',
        },
      ],
      toolExecutionMetrics: {
        enabled: true,
        maxToolCalls: 4,
        timeoutMs: 3000,
        selectedToolCount: 1,
        executedToolCount: 1,
        skippedToolCount: 0,
        failedToolCount: 0,
        timeoutCount: 0,
        totalDurationMs: 12,
        selectedToolIds: ['TrainingTool'],
        executedToolIds: ['TrainingTool'],
        skippedToolIds: [],
        failedToolIds: [],
        timeoutToolIds: [],
        perToolDurationMs: [{ toolId: 'TrainingTool', durationMs: 12 }],
      },
    });
    service.completeTrace(traceId, {
      durationMs: 52,
      fallbackUsed: false,
      summary: {
        executionStrategy: 'MULTI_CONTEXT',
      },
    });

    const trace = service.getTrace(traceId);

    expect(trace).toBeDefined();
    expect(trace?.status).toBe('COMPLETED');
    expect(trace?.detectedIntent).toBe('TRAINING');
    expect(trace?.selectedDomains).toEqual(['training', 'goals']);
    expect(trace?.policySnapshot?.approved).toBe(true);
    expect(trace?.toolSnapshot?.results[0]?.toolId).toBe('TrainingTool');
    expect(trace?.memorySnapshot?.metadata.workingMemorySize).toBe(7);
    expect(trace?.executionSnapshot?.executionDurationMs).toBe(41);
    expect(trace?.metrics.contextOrchestrationDurationMs).toBe(12);
    expect(trace?.metrics.planningDurationMs).toBe(7);
    expect(trace?.metrics.toolExecutionDurationMs).toBe(12);
    expect(trace?.metrics.memoryDurationMs).toBe(3);
    expect(trace?.metrics.totalDurationMs).toBe(52);
    expect(
      trace?.events.some((event) => event.event === 'POLICY_EVALUATED'),
    ).toBe(true);
  });

  it('prunes traces by retention count', () => {
    process.env.AI_AGENT_TRACE_MAX_ITEMS = '2';
    process.env.AI_AGENT_TRACE_RETENTION_MS = '86400000';
    const service = createService();
    let currentNow = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentNow);

    currentNow = 1000;
    service.startTrace({
      request: buildRequest('trace-1'),
      runtimeEnabled: true,
      toolsEnabled: true,
      requestTimestamp: new Date(currentNow).toISOString(),
    });
    currentNow = 2000;
    service.startTrace({
      request: buildRequest('trace-2'),
      runtimeEnabled: true,
      toolsEnabled: true,
      requestTimestamp: new Date(currentNow).toISOString(),
    });
    currentNow = 3000;
    service.startTrace({
      request: buildRequest('trace-3'),
      runtimeEnabled: true,
      toolsEnabled: true,
      requestTimestamp: new Date(currentNow).toISOString(),
    });

    expect(service.listTraces().map((trace) => trace.traceId)).toEqual([
      'trace-2',
      'trace-3',
    ]);
  });

  it('prunes traces by retention ttl', () => {
    process.env.AI_AGENT_TRACE_MAX_ITEMS = '10';
    process.env.AI_AGENT_TRACE_RETENTION_MS = '1';
    const service = createService();
    let currentNow = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentNow);

    service.startTrace({
      request: buildRequest('trace-ttl'),
      runtimeEnabled: true,
      toolsEnabled: true,
      requestTimestamp: new Date(currentNow).toISOString(),
    });
    currentNow = 1005;

    expect(service.getTrace('trace-ttl')).toBeUndefined();
  });
});

function createService(): AgentTraceService {
  return new AgentTraceService(new AgentRuntimeConfigService());
}

function buildRequest(requestId = 'trace-request'): AgentRequest {
  return {
    userId: 'profile_123',
    conversationId: 'conversation_123',
    userMessage: 'Should I train today?',
    sessionMetadata: {
      requestId,
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: true,
    experimentMetadata: {
      experimentId: 'exp-1',
      selectedPromptVersion: 'coach-chat-prompt-v1',
      rolloutVariant: 'control',
      canaryBucket: 1,
      canaryPercentage: 0,
      toolCallingEnabled: false,
    } as AgentRequest['experimentMetadata'],
  };
}

function buildPolicyEvaluation() {
  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools: [],
      allowedDomains: ['training', 'goals'],
      allowedLLM: true,
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: ['context-authorization'],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedLlmUsage: false,
        allowedDomainCount: 2,
        allowedToolCount: 0,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 6,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'Approved.',
    actions: [],
  };
}
