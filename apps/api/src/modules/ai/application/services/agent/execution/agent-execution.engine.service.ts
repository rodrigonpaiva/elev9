import { Injectable } from '@nestjs/common';

import { AiPromptBuilder } from '../../llm/ai-prompt-builder.service';
import { CoachChatMemoryUpdaterService } from '../../chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../../chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from '../../chat/coach-chat-reply-orchestrator.service';
import { CoachChatReplyGenerator } from '../../chat/coach-chat-reply-generator.service';
import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentMemoryService } from '../memory/agent-memory.service';
import type {
  AgentActionResult,
  AgentContext,
  AgentPlan,
  AgentRequest,
} from '../agent.types';
import { AgentTraceService } from '../observability/agent-trace.service';
import { AgentToolExecutorService } from '../tools/agent-tool-executor.service';
import type { AgentToolExecutionOutcome } from '../tools/agent-tool-execution.types';
import { AgentExecutionPolicy } from './agent-execution.policy';
import { AgentExecutionValidator } from './agent-execution.validator';
import type {
  AgentExecutionContext,
  AgentExecutionLifecycleEvent,
  AgentExecutionResult,
  AgentExecutionStep,
  AgentExecutionStepName,
  AgentExecutionState,
  AgentExecutionValidationResult,
} from './agent-execution.types';
import type { AgentMemoryRuntimeMetadata } from '../memory/agent-memory.types';

@Injectable()
export class AgentExecutionEngineService {
  constructor(
    private readonly aiPromptBuilder: AiPromptBuilder,
    private readonly coachChatReplyOrchestratorService: CoachChatReplyOrchestratorService,
    private readonly coachChatPersistenceService: CoachChatPersistenceService,
    private readonly coachChatMemoryUpdaterService: CoachChatMemoryUpdaterService,
    private readonly coachChatReplyGenerator: CoachChatReplyGenerator,
    private readonly agentMemoryService: AgentMemoryService,
    private readonly agentToolExecutorService: AgentToolExecutorService,
    private readonly policy: AgentExecutionPolicy,
    private readonly validator: AgentExecutionValidator,
    private readonly config: AgentRuntimeConfigService,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  async execute(input: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startedAt = Date.now();
    const steps = this.policy.buildExecutionSteps(input.plan);
    const validation = this.validator.ensureValid({
      plan: input.plan,
      steps,
    });
    const lifecycleEvents: AgentExecutionLifecycleEvent[] = [
      this.policy.buildLifecycleEvent({
        event: 'START',
        summary: 'Started deterministic agent execution.',
        metadata: {
          requestId: input.request.sessionMetadata.requestId,
          conversationId: input.request.conversationId,
          stepCount: steps.length,
        },
      }),
    ];
    const state = this.createInitialState(input, validation, lifecycleEvents);
    const stepResults: AgentExecutionStep[] = [];
    let prompt: ReturnType<AiPromptBuilder['build']> | undefined;
    let reply = undefined as
      | Awaited<ReturnType<CoachChatReplyOrchestratorService['execute']>>
      | undefined;
    let toolExecutionOutcome = this.createEmptyToolExecutionOutcome(input.plan);
    let fallbackUsed = false;
    const policyEvaluation = input.policyEvaluation;

    for (const stepName of steps) {
      const stepStartAt = new Date();
      state.currentStep = stepName;
      this.agentTraceService?.recordEvent(
        input.request.sessionMetadata.requestId,
        {
          event: 'STEP_STARTED',
          timestamp: stepStartAt.toISOString(),
          summary: `Starting ${stepName.toLowerCase()} step.`,
          metadata: {
            stepName,
            stepIndex: stepResults.length,
          },
        },
      );
      this.recordLifecycle(
        lifecycleEvents,
        this.policy.buildLifecycleEvent({
          event: 'STEP_START',
          step: stepName,
          summary: `Starting ${stepName.toLowerCase()} step.`,
          metadata: {
            stepName,
            stepIndex: stepResults.length,
          },
        }),
      );

      try {
        if (stepName === 'LOAD_CONTEXT') {
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Loaded context and prepared execution state.',
            {
              selectedDomains: input.context.selectedDomains,
              selectedDomainCount: input.context.selectedDomains.length,
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'EXECUTE_TOOL') {
          if (
            !input.plan.selectedTools.length ||
            !input.plan.selectedTools.some((tool) =>
              policyEvaluation.decision.allowedTools.some(
                (allowedTool) => allowedTool.id === tool.id,
              ),
            ) ||
            !input.policyEvaluation.decision.approved
          ) {
            toolExecutionOutcome = this.createSkippedToolExecutionOutcome(
              input.plan,
              policyEvaluation,
            );
            await this.refreshWorkingMemory({
              lifecycleEvents,
              request: input.request,
              context: input.context,
              plan: input.plan,
              toolExecutionOutcome,
              currentStep: stepName,
              fallbackUsed,
              stepStatus: 'skipped',
              stepCount: stepResults.length + 1,
              startedAt,
            });
            this.completeStep(
              input.request.sessionMetadata.requestId,
              state,
              stepResults,
              stepName,
              'Skipped tool execution according to policy.',
              {
                skippedToolCount: toolExecutionOutcome.metrics.skippedToolCount,
                blockedToolIds:
                  policyEvaluation.decision.metadata.blockedToolIds,
              },
              stepStartAt,
            );
            continue;
          }

          toolExecutionOutcome = await this.agentToolExecutorService.execute({
            request: input.request,
            plan: input.plan,
            conversationState: input.conversationState,
          });
          state.toolResults = toolExecutionOutcome.results;
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Executed selected read-only tools.',
            {
              selectedToolIds: input.plan.selectedTools.map((tool) => tool.id),
              executedToolCount: toolExecutionOutcome.metrics.executedToolCount,
              skippedToolCount: toolExecutionOutcome.metrics.skippedToolCount,
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'BUILD_PROMPT') {
          const promptAssemblyStartedAt = Date.now();
          prompt = this.aiPromptBuilder.build({
            message: input.request.userMessage,
            healthContext: input.context.healthContext,
            conversationHistory: input.conversationState.conversationHistory,
            conversationMemory: input.conversationState.conversationMemory,
            ...(input.composition
              ? {
                  composition: input.composition,
                  unifiedCoachIntelligence: input.composition,
                }
              : {}),
            ...(input.personaGuidance
              ? { personaGuidance: input.personaGuidance }
              : {}),
            ...(input.explanation ? { explanation: input.explanation } : {}),
            ...(input.context.coachDecision
              ? { coachDecision: input.context.coachDecision }
              : {}),
            ...(input.context.notification
              ? { notification: input.context.notification }
              : {}),
            ...(input.context.habit ? { habit: input.context.habit } : {}),
            ...(input.context.personalization
              ? { personalization: input.context.personalization }
              : {}),
            trace: {
              requestId: input.request.sessionMetadata.requestId,
              conversationId: input.request.conversationId,
              userIdHash: input.request.sessionMetadata.userIdHash,
              experimentId: input.request.experimentMetadata.experimentId,
              canaryBucket: input.request.experimentMetadata.canaryBucket,
              rolloutVariant: input.request.experimentMetadata.rolloutVariant,
            },
            experiment: input.request.experimentMetadata,
          });
          const promptAssemblyDurationMs = Date.now() - promptAssemblyStartedAt;
          state.runtimeMetadata = {
            ...state.runtimeMetadata,
            promptAssemblyDurationMs,
          };
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Built the deterministic prompt.',
            {
              promptVersion: prompt.promptVersion,
              promptAssemblyDurationMs,
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'CALL_LLM' || stepName === 'GENERATE_FALLBACK') {
          if (!prompt) {
            throw new Error('Prompt is not available for reply generation.');
          }

          if (
            !policyEvaluation.decision.allowedLLM ||
            input.plan.executionStrategy === 'FALLBACK_ONLY'
          ) {
            reply = {
              content: this.coachChatReplyGenerator.generate({
                message: input.request.userMessage,
                healthContext: input.context.healthContext,
                ...(input.context.coachDecision
                  ? { coachDecision: input.context.coachDecision }
                  : {}),
                ...(input.context.notification
                  ? { notification: input.context.notification }
                  : {}),
                ...(input.context.habit ? { habit: input.context.habit } : {}),
                ...(input.context.personalization
                  ? { personalization: input.context.personalization }
                  : {}),
              }),
              source: 'heuristic',
            };
            this.agentTraceService?.recordEvent(
              input.request.sessionMetadata.requestId,
              {
                event: 'FALLBACK_USED',
                timestamp: new Date().toISOString(),
                summary: 'Used the deterministic fallback reply.',
                metadata: {
                  stepName,
                  executionStrategy: input.plan.executionStrategy,
                },
              },
            );
          } else {
            const llmStartedAt = Date.now();
            reply = await this.coachChatReplyOrchestratorService.execute({
              prompt,
              context: {
                userProfileId: input.request.userId,
                healthContext: input.context.healthContext,
                ...(input.context.coachDecision
                  ? { coachDecision: input.context.coachDecision }
                  : {}),
                ...(input.context.notification
                  ? { notification: input.context.notification }
                  : {}),
                ...(input.context.habit ? { habit: input.context.habit } : {}),
                ...(input.context.personalization
                  ? { personalization: input.context.personalization }
                  : {}),
              },
              message: input.request.userMessage,
              options: {
                streaming: input.streaming,
                ...(input.onDelta ? { onDelta: input.onDelta } : {}),
              },
            });
            this.agentTraceService?.recordEvent(
              input.request.sessionMetadata.requestId,
              {
                event: 'LLM_CALLED',
                timestamp: new Date().toISOString(),
                summary: 'Called the LLM reply orchestrator.',
                metadata: {
                  durationMs: Date.now() - llmStartedAt,
                  provider: reply.provider,
                  model: reply.model,
                  source: reply.source,
                },
              },
            );
          }
          fallbackUsed = reply.source === 'heuristic';
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            fallbackUsed
              ? 'Generated the deterministic fallback reply.'
              : 'Generated the provider-backed reply.',
            {
              source: reply.source,
              ...(reply.provider ? { provider: reply.provider } : {}),
              ...(reply.model ? { model: reply.model } : {}),
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'PERSIST_MESSAGES') {
          if (!reply) {
            throw new Error('Reply is not available for persistence.');
          }

          await this.coachChatPersistenceService.persistAssistantMessage(
            input.request.conversationId,
            reply,
          );
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Persisted the assistant message.',
            {
              source: reply.source,
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'UPDATE_MEMORY') {
          if (!reply) {
            throw new Error('Reply is not available for memory updates.');
          }

          await this.coachChatMemoryUpdaterService.update({
            conversationId: input.request.conversationId,
            healthContext: input.context.healthContext,
            conversationHistory: input.conversationState.conversationHistory,
            userMessage: input.request.userMessage,
            assistantReply: reply.content,
            ...(input.context.coachDecision
              ? { coachDecision: input.context.coachDecision }
              : {}),
            ...(input.context.notificationMemory
              ? { notification: input.context.notificationMemory }
              : {}),
            ...(input.context.habitMemory
              ? { habit: input.context.habitMemory }
              : {}),
            ...(input.context.personalizationMemory
              ? { personalization: input.context.personalizationMemory }
              : {}),
          });

          const sessionUpdate = this.buildSessionUpdate(
            input,
            reply,
            toolExecutionOutcome,
          );
          await this.agentMemoryService.updateSessionMemory(sessionUpdate);

          const refreshedConversationMemory =
            await this.agentMemoryService.loadConversationMemory({
              conversationId: input.request.conversationId,
            });
          const memorySnapshot = this.agentMemoryService.createSnapshot({
            requestId: input.request.sessionMetadata.requestId,
            conversationId: input.request.conversationId,
            conversationMemory: refreshedConversationMemory,
          });
          state.memorySnapshot = memorySnapshot;
          state.runtimeMetadata = {
            ...state.runtimeMetadata,
            fallbackUsed,
            toolExecutionEnabled: toolExecutionOutcome.metrics.enabled,
            toolExecutionMetrics: toolExecutionOutcome.metrics,
          };
          state.toolResults = toolExecutionOutcome.results;
          this.recordLifecycle(
            lifecycleEvents,
            this.policy.buildLifecycleEvent({
              event: 'SNAPSHOT',
              step: stepName,
              summary: 'Captured the execution memory snapshot.',
              metadata: memorySnapshot.metadata,
            }),
          );
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Updated session and conversation memory.',
            {
              conversationMemorySize:
                memorySnapshot.metadata.conversationMemorySize,
              sessionMemorySize: memorySnapshot.metadata.sessionMemorySize,
            },
            stepStartAt,
          );
          continue;
        }

        if (stepName === 'COMPLETE') {
          await this.refreshWorkingMemory({
            lifecycleEvents,
            request: input.request,
            context: input.context,
            plan: input.plan,
            toolExecutionOutcome,
            currentStep: stepName,
            fallbackUsed,
            stepStatus: 'completed',
            stepCount: stepResults.length + 1,
            startedAt,
          });
          this.completeStep(
            input.request.sessionMetadata.requestId,
            state,
            stepResults,
            stepName,
            'Completed execution.',
            {},
            stepStartAt,
          );
          continue;
        }
      } catch (error) {
        const failedStep = this.failStep(stepName, error, stepStartAt);
        stepResults.push(failedStep);
        state.failedSteps = Object.freeze([...state.failedSteps, failedStep]);
        this.agentTraceService?.recordEvent(
          input.request.sessionMetadata.requestId,
          {
            event: 'STEP_FAILED',
            timestamp: new Date().toISOString(),
            summary: `Failed ${stepName.toLowerCase()} step.`,
            metadata: {
              stepName,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        );
        this.recordLifecycle(
          lifecycleEvents,
          this.policy.buildLifecycleEvent({
            event: 'STEP_FAIL',
            step: stepName,
            summary: `Failed ${stepName.toLowerCase()} step.`,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          }),
        );

        await this.refreshWorkingMemory({
          lifecycleEvents,
          request: input.request,
          context: input.context,
          plan: input.plan,
          toolExecutionOutcome,
          currentStep: stepName,
          fallbackUsed,
          stepStatus: 'failed',
          stepCount: stepResults.length,
          startedAt,
        }).catch(() => undefined);

        if (this.policy.isCriticalStep(stepName)) {
          this.recordLifecycle(
            lifecycleEvents,
            this.policy.buildLifecycleEvent({
              event: 'ABORT',
              step: stepName,
              summary: 'Aborted execution because a critical step failed.',
              metadata: {
                error: error instanceof Error ? error.message : String(error),
              },
            }),
          );
          throw error instanceof Error ? error : new Error(String(error));
        }

        continue;
      }
    }

    if (!prompt) {
      throw new Error('Agent execution did not produce a prompt.');
    }

    if (!reply) {
      throw new Error('Agent execution did not produce a reply.');
    }

    const actionResults = this.buildActionResults(
      input.plan,
      toolExecutionOutcome,
    );
    const executionDurationMs = Date.now() - startedAt;
    state.executionDurationMs = executionDurationMs;
    state.toolResults = toolExecutionOutcome.results;
    state.runtimeMetadata = {
      ...state.runtimeMetadata,
      fallbackUsed,
      toolExecutionEnabled: toolExecutionOutcome.metrics.enabled,
      toolExecutionMetrics: toolExecutionOutcome.metrics,
      policyApproved: policyEvaluation.decision.approved,
      policyBlocked: policyEvaluation.decision.blocked,
      policyFallbackRequired: policyEvaluation.decision.fallbackRequired,
      policyReason: policyEvaluation.reason,
      policyViolationCount: policyEvaluation.violations.length,
      policyAllowedLLM: policyEvaluation.decision.allowedLLM,
      policyAllowedDomainCount: policyEvaluation.decision.allowedDomains.length,
      policyAllowedToolCount: policyEvaluation.decision.allowedTools.length,
      policyBlockedDomainIds:
        policyEvaluation.decision.metadata.blockedDomainIds,
      policyBlockedToolIds: policyEvaluation.decision.metadata.blockedToolIds,
    };
    const completedLifecycle = this.policy.buildLifecycleEvent({
      event: 'COMPLETE',
      summary: 'Completed deterministic agent execution.',
      metadata: {
        stepCount: stepResults.length,
        executionDurationMs,
      },
    });
    this.recordLifecycle(lifecycleEvents, completedLifecycle);
    this.agentTraceService?.recordExecutionSnapshot(
      input.request.sessionMetadata.requestId,
      {
        strategy: input.plan.executionStrategy,
        currentStep: state.currentStep,
        completedStepCount: state.completedSteps.length,
        failedStepCount: state.failedSteps.length,
        skippedStepCount: state.skippedSteps.length,
        executedStepCount: stepResults.length,
        stepCount: steps.length,
        fallbackUsed,
        executionDurationMs,
        steps: Object.freeze([...stepResults]),
        lifecycleEvents: Object.freeze([...lifecycleEvents]),
        toolExecutionMetrics: toolExecutionOutcome.metrics,
      },
    );
    state.lifecycleEvents = Object.freeze([...lifecycleEvents]);

    return this.freezeResult({
      assistantText: reply.content,
      fallbackUsed,
      executedSteps: Object.freeze([...stepResults]),
      actionResults: Object.freeze(actionResults),
      prompt,
      reply,
      toolExecutionOutcome,
      memorySnapshot:
        state.memorySnapshot ??
        this.agentMemoryService.createSnapshot({
          requestId: input.request.sessionMetadata.requestId,
          conversationId: input.request.conversationId,
          conversationMemory: input.conversationState.conversationMemory,
        }),
      state: this.freezeState(state),
      lifecycleEvents: Object.freeze([...lifecycleEvents]),
    });
  }

  private createInitialState(
    input: AgentExecutionContext,
    validation: AgentExecutionValidationResult,
    lifecycleEvents: AgentExecutionLifecycleEvent[],
  ): AgentExecutionState {
    return {
      requestId: input.request.sessionMetadata.requestId,
      conversationId: input.request.conversationId,
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      executionDurationMs: 0,
      toolResults: [],
      planningMetadata: {
        plan: input.plan,
        validation,
        selectedDomainCount: input.context.selectedDomains.length,
        selectedToolCount: input.plan.selectedTools.length,
        candidateToolCount: input.plan.candidateTools.length,
      },
      runtimeMetadata: {
        enabled: this.config.isEnabled(),
        detectedIntent: input.context.intent,
        selectedDomains: input.context.selectedDomains,
        toolExecutionEnabled: this.config.isToolsEnabled(),
        fallbackUsed: false,
      },
      lifecycleEvents: Object.freeze([...lifecycleEvents]),
    };
  }

  private completeStep(
    traceId: string,
    state: AgentExecutionState,
    steps: AgentExecutionStep[],
    stepName: AgentExecutionStepName,
    summary: string,
    metadata: Record<string, unknown>,
    startedAt: Date,
  ): void {
    const completedAt = new Date();
    const completedStep = Object.freeze({
      step: stepName,
      status: 'completed' as const,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      summary,
      metadata: Object.freeze({ ...metadata }),
    });

    steps.push(completedStep);
    state.completedSteps = Object.freeze([
      ...state.completedSteps,
      completedStep,
    ]);
    this.agentTraceService?.recordEvent(traceId, {
      event: 'STEP_COMPLETED',
      timestamp: completedAt.toISOString(),
      summary,
      metadata: {
        stepName,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        ...metadata,
      },
    });
  }

  private failStep(
    stepName: AgentExecutionStepName,
    error: unknown,
    startedAt: Date,
  ): AgentExecutionStep {
    return Object.freeze({
      step: stepName,
      status: 'failed' as const,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      summary:
        error instanceof Error ? error.message : 'Execution step failed.',
      metadata: Object.freeze({
        error: error instanceof Error ? error.message : String(error),
      }),
    });
  }

  private recordLifecycle(
    lifecycleEvents: AgentExecutionLifecycleEvent[],
    event: AgentExecutionLifecycleEvent,
  ): void {
    lifecycleEvents.push(Object.freeze({ ...event }));
  }

  private async refreshWorkingMemory(input: {
    lifecycleEvents: AgentExecutionLifecycleEvent[];
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
    toolExecutionOutcome: AgentToolExecutionOutcome;
    currentStep: AgentExecutionStepName;
    fallbackUsed: boolean;
    stepStatus: 'completed' | 'failed' | 'skipped';
    stepCount: number;
    startedAt: number;
  }): Promise<void> {
    try {
      this.agentMemoryService.updateWorkingMemory(
        input.request.sessionMetadata.requestId,
        {
          intent: input.context.intent,
          selectedDomains: input.context.selectedDomains,
          selectedTools: input.plan.selectedTools,
          executionPlan: input.plan,
          toolResults: input.toolExecutionOutcome.results,
          runtimeMetadata: {
            enabled: this.config.isEnabled(),
            detectedIntent: input.context.intent,
            selectedDomains: input.context.selectedDomains,
            selectedToolIds: input.plan.selectedTools.map((tool) => tool.id),
            toolExecutionEnabled: input.toolExecutionOutcome.metrics.enabled,
            toolExecutionMetrics: input.toolExecutionOutcome.metrics,
            currentStep: input.currentStep,
            currentStepStatus: input.stepStatus,
            executionStepCount: input.stepCount,
            executionDurationMs: Date.now() - input.startedAt,
            fallbackUsed: input.fallbackUsed,
          } as AgentMemoryRuntimeMetadata,
        },
      );
      this.recordLifecycle(
        input.lifecycleEvents,
        this.policy.buildLifecycleEvent({
          event: 'MEMORY_UPDATE',
          step: input.currentStep,
          summary: 'Updated working memory after the execution step.',
          metadata: {
            stepStatus: input.stepStatus,
            stepCount: input.stepCount,
            durationMs: Date.now() - input.startedAt,
          },
        }),
      );
    } catch {
      return;
    }
  }

  private createEmptyToolExecutionOutcome(
    plan: AgentPlan,
  ): AgentToolExecutionOutcome {
    return {
      results: [],
      metrics: {
        enabled: this.config.isToolsEnabled(),
        maxToolCalls: this.config.getMaxToolCalls(),
        timeoutMs: this.config.getToolTimeoutMs(),
        selectedToolCount: plan.selectedTools.length,
        executedToolCount: 0,
        skippedToolCount: plan.selectedTools.length,
        failedToolCount: 0,
        timeoutCount: 0,
        totalDurationMs: 0,
        selectedToolIds: plan.selectedTools.map((tool) => tool.id),
        executedToolIds: [],
        skippedToolIds: plan.selectedTools.map((tool) => tool.id),
        failedToolIds: [],
        timeoutToolIds: [],
        perToolDurationMs: plan.selectedTools.map((tool) => ({
          toolId: tool.id,
          durationMs: 0,
        })),
      },
    };
  }

  private createSkippedToolExecutionOutcome(
    plan: AgentPlan,
    policyEvaluation: AgentExecutionContext['policyEvaluation'],
  ): AgentToolExecutionOutcome {
    const skippedToolIds = plan.selectedTools.map((tool) => tool.id);

    return {
      results: plan.selectedTools.map((tool) => ({
        toolId: tool.id,
        status: 'SKIPPED' as const,
        summary: 'Tool execution was blocked by policy.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: {
          policyReason: policyEvaluation.reason,
          blockedDomainIds: policyEvaluation.decision.metadata.blockedDomainIds,
          blockedToolIds: policyEvaluation.decision.metadata.blockedToolIds,
        },
      })),
      metrics: {
        enabled: this.config.isToolsEnabled(),
        maxToolCalls: this.config.getMaxToolCalls(),
        timeoutMs: this.config.getToolTimeoutMs(),
        selectedToolCount: plan.selectedTools.length,
        executedToolCount: 0,
        skippedToolCount: plan.selectedTools.length,
        failedToolCount: 0,
        timeoutCount: 0,
        totalDurationMs: 0,
        selectedToolIds: skippedToolIds,
        executedToolIds: [],
        skippedToolIds,
        failedToolIds: [],
        timeoutToolIds: [],
        perToolDurationMs: plan.selectedTools.map((tool) => ({
          toolId: tool.id,
          durationMs: 0,
        })),
      },
    };
  }

  private buildSessionUpdate(
    input: AgentExecutionContext,
    reply: NonNullable<
      Awaited<ReturnType<CoachChatReplyOrchestratorService['execute']>>
    >,
    toolExecutionOutcome: AgentToolExecutionOutcome,
  ): {
    conversationId: string;
    goal?: string;
    coachDecision?: {
      priority?: string;
      headline?: string;
      summary: string;
    };
    toolResults: AgentToolExecutionOutcome['results'];
    executionSummary: string;
    temporaryPreferences?: Record<string, unknown>;
  } {
    return {
      conversationId: input.request.conversationId,
      goal: input.context.healthContext.goal,
      coachDecision: input.context.coachDecision
        ? {
            priority: input.context.coachDecision.priority,
            headline: input.context.coachDecision.headline,
            summary: input.context.coachDecision.summary,
          }
        : undefined,
      toolResults: toolExecutionOutcome.results,
      executionSummary: `${input.plan.summary}; replySource=${reply.source}; fallbackUsed=${reply.source === 'heuristic'}`,
    };
  }

  private buildActionResults(
    plan: AgentPlan,
    toolExecutionOutcome: AgentToolExecutionOutcome,
  ): AgentActionResult[] {
    const toolResultsById = new Map(
      toolExecutionOutcome.results.map((result) => [result.toolId, result]),
    );

    return plan.actions.map((action) => {
      const toolId = this.resolveActionToolId(action.type);
      const matchingResult = toolId ? toolResultsById.get(toolId) : undefined;

      if (action.type === 'GENERATE_REPLY') {
        return {
          action,
          status: 'success' as const,
          summary: 'Generated the final reply step.',
          metadata: {
            source: 'reply-orchestrator',
          },
        };
      }

      if (!toolId || !matchingResult) {
        return {
          action,
          status: 'skipped' as const,
          summary: 'No matching tool execution was available for the action.',
          metadata: {
            reason: 'no-matching-tool-result',
          },
        };
      }

      if (matchingResult.status === 'SUCCESS') {
        return {
          action,
          status: 'success' as const,
          summary: matchingResult.summary,
          metadata: matchingResult.metadata,
        };
      }

      if (matchingResult.status === 'SKIPPED') {
        return {
          action,
          status: 'skipped' as const,
          summary: matchingResult.summary,
          metadata: matchingResult.metadata,
        };
      }

      return {
        action,
        status: 'failed' as const,
        summary: matchingResult.summary,
        metadata: matchingResult.metadata,
      };
    });
  }

  private resolveActionToolId(
    actionType: AgentActionResult['action']['type'],
  ): string | undefined {
    const mapping: Record<string, string | undefined> = {
      READ_USER_PROFILE: 'UserProfileTool',
      READ_HEALTH_CONTEXT: 'HealthContextTool',
      READ_TRAINING_CONTEXT: 'TrainingTool',
      READ_NUTRITION_CONTEXT: 'NutritionTool',
      READ_RECOVERY_CONTEXT: 'RecoveryTool',
      READ_GOALS_CONTEXT: 'GoalTool',
      READ_PROGRESS_CONTEXT: 'ProgressTool',
      READ_MEMORY: 'ConversationMemoryTool',
      READ_HABIT_CONTEXT: 'HabitTool',
      READ_NOTIFICATION_CONTEXT: 'NotificationTool',
      READ_PERSONALIZATION_CONTEXT: 'PersonalizationTool',
      READ_COACH_DECISION: 'CoachDecisionTool',
      READ_RECENT_MESSAGES: 'ConversationMemoryTool',
      GENERATE_REPLY: undefined,
    };

    return mapping[actionType];
  }

  private freezeState(state: AgentExecutionState): AgentExecutionState {
    return Object.freeze({
      ...state,
      completedSteps: Object.freeze([...state.completedSteps]),
      failedSteps: Object.freeze([...state.failedSteps]),
      skippedSteps: Object.freeze([...state.skippedSteps]),
      toolResults: Object.freeze([...state.toolResults]),
      lifecycleEvents: Object.freeze([...state.lifecycleEvents]),
    });
  }

  private freezeResult(result: AgentExecutionResult): AgentExecutionResult {
    return Object.freeze({
      ...result,
      executedSteps: Object.freeze([...result.executedSteps]),
      actionResults: Object.freeze([...result.actionResults]),
      lifecycleEvents: Object.freeze([...result.lifecycleEvents]),
    });
  }
}
