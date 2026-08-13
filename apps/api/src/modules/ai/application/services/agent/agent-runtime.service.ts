import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

import { AiRolloutService } from '../governance/ai-rollout.service';
import { AI_COACH_CHAT_PROMPT_ID } from '../governance/ai-governance.types';
import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiPromptBuilder } from '../llm/ai-prompt-builder.service';
import { CoachChatContextLoaderService } from '../chat/coach-chat-context-loader.service';
import { CoachChatMemoryUpdaterService } from '../chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from '../chat/coach-chat-reply-orchestrator.service';
import { AgentContextOrchestratorService } from './agent-context-orchestrator.service';
import { AgentRuntimeConfigService } from './agent-runtime.config';
import { AgentExecutionEngineService } from './execution/agent-execution.engine.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentPlanningEngineService } from './planning/agent-planning-engine.service';
import { AgentPolicyEngineService } from './policies/agent-policy.engine.service';
import { AgentTraceService } from './observability/agent-trace.service';
import { CoachExpertRegistry } from '../experts/coach-expert.registry';
import { CoachExpertRouterService } from '../experts/coach-expert-router';
import { CoachExpertCompositionService } from '../experts/composition/coach-expert-composition';
import { CoachExpertObservabilityService } from '../experts/observability/coach-expert-observability';
import { CoachExplainabilityService } from '../explainability/coach-explainability';
import { CoachPersonaEngineService } from '../persona/coach-persona-engine';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertMetadata,
  CoachExpertRequest,
  CoachExpertResult,
} from '../experts/coach-expert.types';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition';
import type {
  CoachExpertRoutingDecision,
  CoachExpertRoutingReasonCode,
} from '../experts/coach-expert-router';
import type { CoachExplanation } from '../explainability/coach-explainability';
import type { CoachPersonaGuidance } from '../persona/coach-persona-engine';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolExecutorService } from './tools/agent-tool-executor.service';
import type {
  AgentAction,
  AgentActionResult,
  AgentContext,
  AgentContextDomain,
  AgentObservabilityTraceReference,
  AgentPlan,
  AgentRequest,
  AgentResponse,
  AgentRuntimeMetadata,
  AgentStep,
  AgentStepName,
} from './agent.types';
import type { AgentToolDescriptor } from './tools/agent-tool.types';
import type { AgentToolExecutionOutcome } from './tools/agent-tool-execution.types';
import type { AgentMemoryMetadata } from './memory/agent-memory.types';
import type { CreateCoachChatStreamOptions } from '../../use-cases/create-coach-chat/create-coach-chat.types';
import {
  CREATE_COACH_CHAT_ERROR_CODES,
  CreateCoachChatError,
} from '../../use-cases/create-coach-chat/create-coach-chat.errors';

type AgentRuntimeExecuteInput = {
  authUserId: string;
  message: string;
  signal?: AbortSignal;
};

type AgentRuntimeExecuteOptions = CreateCoachChatStreamOptions & {
  streaming?: boolean;
};

type AgentExpertExecutionOutcome = {
  results: readonly CoachExpertResult[];
  contributions: readonly CoachExpertContribution[];
  durationMs: number;
};

type AgentRequestInput = {
  authUserId: string;
  userProfileId: string;
  conversationId: string;
  userIdHash: string;
  userMessage: string;
  promptVersion: string;
  streamingPreference: boolean;
  experimentMetadata: AgentRequest['experimentMetadata'];
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
};

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly coachChatContextLoaderService: CoachChatContextLoaderService,
    private readonly coachChatPersistenceService: CoachChatPersistenceService,
    private readonly coachChatReplyOrchestratorService: CoachChatReplyOrchestratorService,
    private readonly coachChatMemoryUpdaterService: CoachChatMemoryUpdaterService,
    private readonly aiPromptBuilder: AiPromptBuilder,
    private readonly aiRolloutService: AiRolloutService,
    private readonly aiLlmConfigService: AiLlmConfigService,
    private readonly agentContextOrchestratorService: AgentContextOrchestratorService,
    private readonly agentPolicyEngineService: AgentPolicyEngineService,
    private readonly agentPlanningEngineService: AgentPlanningEngineService,
    private readonly agentToolRegistryService: AgentToolRegistryService,
    private readonly agentMemoryService: AgentMemoryService,
    private readonly agentToolExecutorService: AgentToolExecutorService,
    private readonly agentExecutionEngineService: AgentExecutionEngineService,
    private readonly config: AgentRuntimeConfigService,
    private readonly agentTraceService?: AgentTraceService,
    private readonly coachExpertRouterService?: CoachExpertRouterService,
    private readonly coachExpertRegistry?: CoachExpertRegistry,
    private readonly coachExpertCompositionService?: CoachExpertCompositionService,
    private readonly coachPersonaEngineService?: CoachPersonaEngineService,
    private readonly coachExplainabilityService?: CoachExplainabilityService,
    private readonly coachExpertObservabilityService?: CoachExpertObservabilityService,
  ) {}

  isEnabled(): boolean {
    return this.config.isEnabled();
  }

  getMaxSteps(): number {
    return this.config.getMaxSteps();
  }

  buildRequest(input: AgentRequestInput): AgentRequest {
    return {
      userId: input.userProfileId,
      conversationId: input.conversationId,
      userMessage: input.userMessage,
      sessionMetadata: {
        requestId: randomUUID(),
        authUserId: input.authUserId,
        userProfileId: input.userProfileId,
        conversationId: input.conversationId,
        userIdHash: input.userIdHash,
      },
      promptVersion: input.promptVersion,
      streamingPreference: input.streamingPreference,
      experimentMetadata: input.experimentMetadata,
      ...(input.signal ? { signal: input.signal } : {}),
      ...(input.onDelta ? { onDelta: input.onDelta } : {}),
    };
  }

  buildPlan(
    request: AgentRequest,
    context: AgentContext,
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>,
    routingDecision?: CoachExpertRoutingDecision,
  ): AgentPlan {
    const candidateExperts = this.getCandidateExperts(context.intent);
    const resolvedRoutingDecision =
      routingDecision ??
      this.routeExperts({
        requestId: request.sessionMetadata.requestId,
        intent: context.intent,
        selectedDomains: context.selectedDomains,
        candidateExperts,
        policyEvaluation,
      });
    const selectedExperts = [...resolvedRoutingDecision.orderedExperts];
    const candidateTools = this.agentToolRegistryService.getToolsForIntent(
      context.intent,
    );
    const selectedTools = this.selectTools(
      candidateTools,
      this.agentToolRegistryService.getToolsForContextDomains(
        context.selectedDomains,
      ),
    );

    return this.agentPlanningEngineService.buildPlan({
      requestId: request.sessionMetadata.requestId,
      intent: context.intent,
      selectedDomains: context.selectedDomains,
      candidateExperts,
      selectedExperts,
      expertRouting: resolvedRoutingDecision,
      candidateTools,
      selectedTools,
      actions: this.agentPlanningEngineService.buildActions(context),
      responseMode: request.streamingPreference ? 'stream' : 'standard',
      policyEvaluation,
    });
  }

  private routeExperts(input: {
    requestId?: string;
    intent: AgentContext['intent'];
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
  }): CoachExpertRoutingDecision {
    if (this.coachExpertRouterService) {
      return this.coachExpertRouterService.route({
        requestId: input.requestId,
        intent: input.intent,
        selectedDomains: input.selectedDomains,
        candidateExperts: input.candidateExperts,
        policyEvaluation: input.policyEvaluation,
        maxExperts: this.config.getMaxExperts(),
      });
    }

    return this.buildLegacyRoutingDecision(input);
  }

  private buildLegacyRoutingDecision(input: {
    requestId?: string;
    intent: AgentContext['intent'];
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
  }): CoachExpertRoutingDecision {
    const selectedExperts = this.selectExperts(
      input.candidateExperts,
      input.selectedDomains,
    ).slice(0, this.config.getMaxExperts());
    const primaryExpert = selectedExperts[0] ?? null;
    const route: CoachExpertRoutingDecision['route'] = {
      primaryExpert: primaryExpert
        ? this.freezeExpertSelection({
            expert: primaryExpert,
            role: 'PRIMARY',
            sequence: 0,
            reasonCodes: ['PRIMARY_DOMAIN_MATCH'] as const,
          })
        : null,
      complementaryExperts: Object.freeze([]),
      orderedExperts: Object.freeze(
        selectedExperts.map((expert, index) =>
          this.freezeExpertSelection({
            expert,
            role: index === 0 ? 'PRIMARY' : 'COMPLEMENTARY',
            sequence: index,
            reasonCodes:
              index === 0
                ? (['PRIMARY_DOMAIN_MATCH'] as const)
                : (['COMPLEMENTARY_RULE'] as const),
          }),
        ),
      ),
      blockedExperts: Object.freeze([]),
      skippedExperts: Object.freeze([]),
    };
    const orderedExperts = route.orderedExperts.map(
      (selection) => selection.expert,
    );
    const estimatedCost = orderedExperts.reduce(
      (sum, expert) => sum + expert.estimatedCost,
      0,
    );
    const estimatedLatencyMs = orderedExperts.reduce(
      (sum, expert) => sum + expert.estimatedLatencyMs,
      0,
    );

    const routingReasons: CoachExpertRoutingDecision['routingReasons'] = [
      {
        code: primaryExpert ? 'PRIMARY_DOMAIN_MATCH' : 'NO_PRIMARY_SELECTED',
        ...(primaryExpert ? { expertId: primaryExpert.id } : {}),
      },
    ];

    return Object.freeze({
      primaryExpert: primaryExpert ? this.freezeExpert(primaryExpert) : null,
      complementaryExperts: Object.freeze(
        route.complementaryExperts.map((selection) => selection.expert),
      ),
      orderedExperts: Object.freeze(orderedExperts),
      blockedExperts: Object.freeze([]),
      skippedExperts: Object.freeze([]),
      routingReasons: Object.freeze(routingReasons),
      estimatedCost,
      estimatedLatencyMs,
      confidence: primaryExpert ? 'MEDIUM' : 'LOW',
      route: Object.freeze(route),
      metadata: Object.freeze({
        requestId: input.requestId,
        intent: input.intent,
        selectedDomains: Object.freeze([...input.selectedDomains]),
        candidateExpertIds: Object.freeze(
          input.candidateExperts.map((expert) => expert.id),
        ),
        allowedExpertIds: Object.freeze(
          input.policyEvaluation.decision.allowedExperts.map(
            (expert) => expert.id,
          ),
        ),
        blockedExpertIds: Object.freeze([]),
        skippedExpertIds: Object.freeze([]),
        primaryExpertId: primaryExpert?.id,
        complementaryExpertIds: Object.freeze([]),
        orderedExpertIds: Object.freeze(
          orderedExperts.map((expert) => expert.id),
        ),
        routeValid: true,
        validationIssues: Object.freeze([]),
        selectedExpertCount: orderedExperts.length,
        candidateExpertCount: input.candidateExperts.length,
        blockedExpertCount: 0,
        skippedExpertCount: 0,
        estimatedCost,
        estimatedLatencyMs,
        confidence: primaryExpert ? 'MEDIUM' : 'LOW',
        maxExperts: this.config.getMaxExperts(),
        route: Object.freeze(route),
      }),
    });
  }

  async execute(
    input: AgentRuntimeExecuteInput,
    options: AgentRuntimeExecuteOptions = {},
  ): Promise<AgentResponse> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const message =
      typeof input.message === 'string' ? input.message.trim() : '';

    if (!authUserId) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!message) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT,
        'Invalid chat message input.',
      );
    }

    const startTime = Date.now();
    const userProfileId =
      await this.coachChatContextLoaderService.resolveUserProfileId(authUserId);
    const conversationState =
      await this.coachChatPersistenceService.resolveConversationState(
        userProfileId,
      );
    const userIdHash = this.hashValue(userProfileId);
    const rolloutAssignment = this.aiRolloutService.resolveCoachChatAssignment({
      authUserId,
      userIdHash,
      promptId: AI_COACH_CHAT_PROMPT_ID,
    });
    const request = this.buildRequest({
      authUserId,
      userProfileId,
      conversationId: conversationState.conversationId,
      userIdHash,
      userMessage: message,
      promptVersion: rolloutAssignment.selectedPromptVersion,
      streamingPreference: Boolean(options.streaming),
      experimentMetadata: rolloutAssignment,
      signal: input.signal,
      onDelta: options.onDelta,
    });
    const requestId = request.sessionMetadata.requestId;
    const conversationId = conversationState.conversationId;
    let workingMemoryCreated = false;
    this.agentTraceService?.startTrace({
      request,
      runtimeEnabled: this.isEnabled(),
      toolsEnabled: this.config.isToolsEnabled(),
      requestTimestamp: new Date(startTime).toISOString(),
    });

    try {
      this.agentMemoryService.createWorkingMemory({
        request,
        intent: 'UNKNOWN',
        selectedDomains: [],
        selectedTools: [],
        toolResults: [],
      });
      workingMemoryCreated = true;

      await this.agentMemoryService.loadSessionMemory(conversationId);

      const orchestration =
        await this.agentContextOrchestratorService.orchestrate(request, {
          conversationState,
        });
      const context = orchestration.context;
      const candidateExperts = this.getCandidateExperts(orchestration.intent);

      await this.coachChatPersistenceService.persistUserMessage(
        conversationId,
        message,
      );

      const policyEvaluation = this.agentPolicyEngineService.evaluate({
        stage: 'PLANNING',
        request,
        intent: orchestration.intent,
        selectedDomains: orchestration.selectedDomains,
        candidateExperts,
        selectedExperts: this.getSelectedExperts(
          orchestration.intent,
          orchestration.selectedDomains,
        ),
        candidateTools: this.agentToolRegistryService.getToolsForIntent(
          orchestration.intent,
        ),
        selectedTools: this.agentToolRegistryService.getToolsForContextDomains(
          orchestration.selectedDomains,
        ),
        responseMode: request.streamingPreference ? 'stream' : 'standard',
        runtimeEnabled: this.isEnabled(),
        toolsEnabled: this.config.isToolsEnabled(),
        llmEnabled: this.aiLlmConfigService.isEnabled(),
        safetyMetadata: orchestration.context.safetyMetadata,
      });

      const routingStartTime = Date.now();
      this.agentTraceService?.recordEvent(requestId, {
        event: 'ROUTING_STARTED',
        timestamp: new Date().toISOString(),
        summary: 'Started expert routing.',
        metadata: {
          candidateExpertIds: candidateExperts.map((expert) => expert.id),
          selectedDomains: orchestration.selectedDomains,
        },
      });
      const routingDecision = this.routeExperts({
        requestId,
        intent: orchestration.intent,
        selectedDomains: orchestration.selectedDomains,
        candidateExperts,
        policyEvaluation,
      });
      this.agentTraceService?.recordEvent(requestId, {
        event: 'ROUTING_COMPLETED',
        timestamp: new Date().toISOString(),
        summary: 'Completed expert routing.',
        metadata: {
          candidateExpertIds: routingDecision.metadata.candidateExpertIds,
          allowedExpertIds: routingDecision.metadata.allowedExpertIds,
          blockedExpertIds: routingDecision.metadata.blockedExpertIds,
          skippedExpertIds: routingDecision.metadata.skippedExpertIds,
          primaryExpertId: routingDecision.metadata.primaryExpertId,
          complementaryExpertIds:
            routingDecision.metadata.complementaryExpertIds,
          orderedExpertIds: routingDecision.metadata.orderedExpertIds,
          routeValid: routingDecision.metadata.routeValid,
          validationIssues: routingDecision.metadata.validationIssues,
          confidence: routingDecision.confidence,
          routingDurationMs: Date.now() - routingStartTime,
        },
      });
      this.observeCoachExpertPipelineStart({
        requestId,
        conversationId,
        intent: orchestration.intent,
        selectedDomains: orchestration.selectedDomains,
        candidateExperts,
        routingDecision,
        policyEvaluation,
        routingDurationMs: Date.now() - routingStartTime,
      });

      const planningStartTime = Date.now();
      const plan = this.buildPlan(
        request,
        context,
        policyEvaluation,
        routingDecision,
      );
      const planningDurationMs = Date.now() - planningStartTime;
      const expertExecution = this.executeSelectedExperts({
        request,
        context,
        plan,
        policyEvaluation,
      });
      if (this.coachExpertCompositionService) {
        this.agentTraceService?.recordEvent(requestId, {
          event: 'COMPOSITION_STARTED',
          timestamp: new Date().toISOString(),
          summary: 'Started expert composition.',
          metadata: {
            primaryExpertId: plan.expertRouting.metadata.primaryExpertId,
            participatingExpertIds:
              plan.expertRouting.metadata.orderedExpertIds,
          },
        });
      }
      const composition = this.composeExpertIntelligence({
        request,
        context,
        plan,
        policyEvaluation,
        expertExecution,
        planningDurationMs,
        orchestrationDurationMs: orchestration.metadata.orchestrationDurationMs,
      });
      let personaGuidance: CoachPersonaGuidance | undefined;
      let explanation: CoachExplanation | undefined;
      let personaDurationMs = 0;
      let explainabilityDurationMs = 0;
      if (composition) {
        this.agentTraceService?.recordEvent(requestId, {
          event: 'COMPOSITION_COMPLETED',
          timestamp: new Date().toISOString(),
          summary: 'Completed expert composition.',
          metadata: {
            primaryExpertId: composition.primaryExpert?.id,
            participatingExpertIds: composition.metadata.participatingExpertIds,
            recommendationCount: composition.metadata.recommendationCount,
            riskCount: composition.metadata.riskCount,
            conflictCount: composition.metadata.conflictCount,
            confidence: composition.confidence.level,
            compositionDurationMs: composition.metadata.compositionDurationMs,
          },
        });
      }

      if (composition && this.coachPersonaEngineService) {
        const personaStartedAt = Date.now();
        this.agentTraceService?.recordEvent(requestId, {
          event: 'PERSONA_STARTED',
          timestamp: new Date().toISOString(),
          summary: 'Started coach persona generation.',
          metadata: {
            primaryExpertId: composition.primaryExpert?.id,
            participatingExpertIds: composition.metadata.participatingExpertIds,
            riskLevel: composition.risks[0]?.level ?? 'UNKNOWN',
          },
        });
        personaGuidance = this.composeCoachPersonaGuidance({
          request,
          context,
          plan,
          policyEvaluation,
          composition,
          expertExecution,
          planningDurationMs,
          orchestrationDurationMs:
            orchestration.metadata.orchestrationDurationMs,
        });
        if (personaGuidance) {
          this.agentTraceService?.recordEvent(requestId, {
            event: 'PERSONA_COMPLETED',
            timestamp: new Date().toISOString(),
            summary: 'Completed coach persona generation.',
            metadata: {
              tone: personaGuidance.tone,
              focus: personaGuidance.focus,
              verbosity: personaGuidance.verbosity,
              urgency: personaGuidance.urgency,
              safetyLevel: personaGuidance.safetyLevel,
              communicationRuleCount:
                personaGuidance.metadata.communicationRuleCount,
            },
          });
        }
        personaDurationMs = Date.now() - personaStartedAt;
      }

      if (composition && personaGuidance && this.coachExplainabilityService) {
        const explainabilityStartedAt = Date.now();
        this.agentTraceService?.recordEvent(requestId, {
          event: 'EXPLAINABILITY_STARTED',
          timestamp: new Date().toISOString(),
          summary: 'Started coach explainability generation.',
          metadata: {
            primaryExpertId: composition.primaryExpert?.id,
            participatingExpertIds: composition.metadata.participatingExpertIds,
            conflictCount: composition.metadata.conflictCount,
            recommendationCount: composition.metadata.recommendationCount,
          },
        });
        explanation = this.composeCoachExplainability({
          request,
          context,
          plan,
          policyEvaluation,
          composition,
          personaGuidance,
          expertExecution,
          planningDurationMs,
          orchestrationDurationMs:
            orchestration.metadata.orchestrationDurationMs,
        });
        if (explanation) {
          this.agentTraceService?.recordEvent(requestId, {
            event: 'EXPLAINABILITY_COMPLETED',
            timestamp: new Date().toISOString(),
            summary: 'Completed coach explainability generation.',
            metadata: {
              primaryExpertId: explanation.primaryExpertId,
              evidenceCount: explanation.metadata.evidenceCount,
              explanationCount: explanation.metadata.explanationCount,
              missingEvidenceCount: explanation.metadata.missingEvidenceCount,
              confidence: explanation.confidenceExplanation.confidence,
            },
          });
        }
        explainabilityDurationMs = Date.now() - explainabilityStartedAt;
      }

      const executionStartTime = Date.now();
      const execution = await this.agentExecutionEngineService.execute({
        request,
        context,
        plan,
        policyEvaluation,
        conversationState,
        streaming: Boolean(options.streaming),
        ...(options.onDelta ? { onDelta: options.onDelta } : {}),
        planningDurationMs,
        orchestrationDurationMs: orchestration.metadata.orchestrationDurationMs,
        ...(composition ? { composition } : {}),
        ...(personaGuidance ? { personaGuidance } : {}),
        ...(explanation ? { explanation } : {}),
      });
      const executionDurationMs = Date.now() - executionStartTime;
      const promptAssemblyDurationMs =
        execution.state.runtimeMetadata.promptAssemblyDurationMs ?? 0;
      this.observeCoachExpertPipelineComplete({
        requestId,
        expertExecution,
        composition,
        personaGuidance,
        explanation,
        routingDurationMs: Date.now() - routingStartTime,
        executionDurationMs,
        compositionDurationMs: composition?.metadata.compositionDurationMs ?? 0,
        personaDurationMs,
        explainabilityDurationMs,
        promptAssemblyDurationMs,
        totalDurationMs: Date.now() - startTime,
      });
      const durationMs = Date.now() - startTime;
      const trackedSteps = execution.executedSteps.slice(0, plan.maxSteps);
      const stepLimitReached =
        execution.executedSteps.length > trackedSteps.length;
      const metadata = this.buildRuntimeMetadata({
        enabled: this.isEnabled(),
        plan,
        fallbackUsed: execution.fallbackUsed,
        stepCount: trackedSteps.length,
        durationMs,
        orchestrationDurationMs: orchestration.metadata.orchestrationDurationMs,
        planningDurationMs,
        executionDurationMs,
        stepLimitReached,
        request,
        detectedIntent: orchestration.intent,
        selectedDomains: orchestration.selectedDomains,
        candidateTools: plan.candidateTools,
        selectedTools: plan.selectedTools,
        toolExecution: execution.toolExecutionOutcome,
        expertExecution,
        memory: execution.memorySnapshot.metadata,
        policyEvaluation,
      });

      this.agentTraceService?.completeTrace(requestId, {
        durationMs,
        fallbackUsed: execution.fallbackUsed,
        summary: {
          detectedIntent: orchestration.intent,
          selectedDomains: orchestration.selectedDomains,
          candidateExpertIds: plan.candidateExperts.map((expert) => expert.id),
          selectedExpertIds: plan.selectedExperts.map((expert) => expert.id),
          rejectedExpertIds: this.getRejectedExpertIds(
            plan.candidateExperts,
            plan.selectedExperts,
          ),
          expertSelectionReason: this.buildExpertSelectionReason(
            orchestration.intent,
            orchestration.selectedDomains,
            plan.selectedExperts,
          ),
          primaryExpertId: plan.expertRouting.metadata.primaryExpertId,
          complementaryExpertIds:
            plan.expertRouting.metadata.complementaryExpertIds,
          orderedExpertIds: plan.expertRouting.metadata.orderedExpertIds,
          blockedExpertIds: plan.expertRouting.metadata.blockedExpertIds,
          skippedExpertIds: plan.expertRouting.metadata.skippedExpertIds,
          routingConfidence: plan.expertRouting.confidence,
          candidateToolIds: plan.candidateTools.map((tool) => tool.id),
          selectedToolIds: plan.selectedTools.map((tool) => tool.id),
          executionStrategy: plan.executionStrategy,
        },
      });

      return {
        conversationId,
        assistantText: execution.assistantText,
        fallbackUsed: execution.fallbackUsed,
        planSummary: plan.summary,
        executedSteps: trackedSteps as AgentStep[],
        actionResults: execution.actionResults,
        metadata,
        observabilityTraceReference: this.buildObservabilityTraceReference({
          request,
          conversationId,
        }),
      };
    } catch (error) {
      this.agentTraceService?.abortTrace(requestId, {
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (workingMemoryCreated) {
        this.agentMemoryService.clearWorkingMemory(requestId);
      }
    }
  }

  private composeExpertIntelligence(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
    expertExecution: AgentExpertExecutionOutcome;
    planningDurationMs: number;
    orchestrationDurationMs: number;
  }): CoachExpertCompositionResult | undefined {
    if (!this.coachExpertCompositionService) {
      return undefined;
    }

    try {
      return this.coachExpertCompositionService.compose({
        requestId: input.request.sessionMetadata.requestId,
        intent: input.context.intent,
        selectedDomains: input.context.selectedDomains,
        routingDecision: input.plan.expertRouting,
        policyEvaluation: input.policyEvaluation,
        expertResults: input.expertExecution.results,
        expertContributions: input.expertExecution.contributions,
        runtimeMetadata: {
          plan: input.plan,
          selectedDomains: input.context.selectedDomains,
          expertResults: input.expertExecution.results,
          expertContributions: input.expertExecution.contributions,
          expertExecutionDurationMs: input.expertExecution.durationMs,
        },
        executionMetadata: {
          planningDurationMs: input.planningDurationMs,
          orchestrationDurationMs: input.orchestrationDurationMs,
          expertExecutionDurationMs: input.expertExecution.durationMs,
        },
      });
    } catch (error) {
      this.agentTraceService?.recordEvent(
        input.request.sessionMetadata.requestId,
        {
          event: 'COMPOSITION_FAILED',
          timestamp: new Date().toISOString(),
          summary:
            error instanceof Error
              ? error.message
              : 'Expert composition failed.',
          metadata: {
            primaryExpertId: input.plan.expertRouting.metadata.primaryExpertId,
            participatingExpertIds:
              input.plan.expertRouting.metadata.orderedExpertIds,
          },
        },
      );

      return undefined;
    }
  }

  private composeCoachPersonaGuidance(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
    composition: CoachExpertCompositionResult;
    expertExecution: AgentExpertExecutionOutcome;
    planningDurationMs: number;
    orchestrationDurationMs: number;
  }): CoachPersonaGuidance | undefined {
    if (!this.coachPersonaEngineService) {
      return undefined;
    }

    try {
      return this.coachPersonaEngineService.build({
        requestId: input.request.sessionMetadata.requestId,
        intent: input.context.intent,
        selectedDomains: input.context.selectedDomains,
        unifiedCoachIntelligence: input.composition,
        routingDecision: input.plan.expertRouting,
        runtimeMetadata: {
          planningDurationMs: input.planningDurationMs,
          orchestrationDurationMs: input.orchestrationDurationMs,
          expertExecutionDurationMs: input.expertExecution.durationMs,
          stepCount: input.plan.maxSteps,
          responseMode: input.plan.responseMode,
        },
        healthContext: input.context.healthContext,
        userProfile: {
          userProfileId: input.context.healthContext.userProfileId,
          userName: input.context.healthContext.userName,
        },
        fitnessProfile: {
          goal: input.context.healthContext.goal,
          activityLevel: input.context.healthContext.activityLevel,
          weeklyFrequency: input.context.healthContext.weeklyFrequency,
          adherenceScore: input.context.healthContext.adherenceScore,
          currentStreak: input.context.healthContext.currentStreak,
          fatigueLevel: input.context.healthContext.fatigueLevel,
          limitations: input.context.healthContext.limitations,
        },
        personalization: input.context.personalization,
        safetyDecisions: {
          policyEvaluation: input.policyEvaluation,
          safetyMetadata: input.context.safetyMetadata,
        },
      });
    } catch (error) {
      this.agentTraceService?.recordEvent(
        input.request.sessionMetadata.requestId,
        {
          event: 'PERSONA_FAILED',
          timestamp: new Date().toISOString(),
          summary:
            error instanceof Error
              ? error.message
              : 'Coach persona generation failed.',
          metadata: {
            primaryExpertId: input.composition.primaryExpert?.id,
            participatingExpertIds:
              input.composition.metadata.participatingExpertIds,
          },
        },
      );

      return undefined;
    }
  }

  private composeCoachExplainability(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
    composition: CoachExpertCompositionResult;
    personaGuidance: CoachPersonaGuidance;
    expertExecution: AgentExpertExecutionOutcome;
    planningDurationMs: number;
    orchestrationDurationMs: number;
  }): CoachExplanation | undefined {
    if (!this.coachExplainabilityService) {
      return undefined;
    }

    try {
      return this.coachExplainabilityService.build({
        requestId: input.request.sessionMetadata.requestId,
        intent: input.context.intent,
        selectedDomains: input.context.selectedDomains,
        unifiedCoachIntelligence: input.composition,
        coachPersonaGuidance: input.personaGuidance,
        routingDecision: input.plan.expertRouting,
        runtimeMetadata: {
          planningDurationMs: input.planningDurationMs,
          orchestrationDurationMs: input.orchestrationDurationMs,
          expertExecutionDurationMs: input.expertExecution.durationMs,
          stepCount: input.plan.maxSteps,
          responseMode: input.plan.responseMode,
        },
        healthContext: input.context.healthContext,
        personalization: input.context.personalization,
        safetyDecisions: {
          policyEvaluation: input.policyEvaluation,
          safetyMetadata: input.context.safetyMetadata,
        },
      });
    } catch (error) {
      this.agentTraceService?.recordEvent(
        input.request.sessionMetadata.requestId,
        {
          event: 'EXPLAINABILITY_FAILED',
          timestamp: new Date().toISOString(),
          summary:
            error instanceof Error
              ? error.message
              : 'Coach explainability generation failed.',
          metadata: {
            primaryExpertId: input.composition.primaryExpert?.id,
            participatingExpertIds:
              input.composition.metadata.participatingExpertIds,
          },
        },
      );

      return undefined;
    }
  }

  private recordStep(
    steps: AgentStep[],
    maxSteps: number,
    input: {
      step: AgentStepName;
      summary: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    if (steps.length >= maxSteps) {
      return;
    }

    const timestamp = new Date().toISOString();
    steps.push({
      step: input.step,
      status: 'completed',
      startedAt: timestamp,
      completedAt: timestamp,
      summary: input.summary,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  private buildActionResults(
    actions: readonly AgentAction[],
  ): readonly AgentActionResult[] {
    return actions.map((action) => ({
      action,
      status: 'skipped',
      summary: 'Declarative only; tool execution is postponed.',
      metadata: {
        reason: 'tool-execution-postponed',
      },
    }));
  }

  private buildRuntimeMetadata(input: {
    enabled: boolean;
    plan: AgentPlan;
    fallbackUsed: boolean;
    stepCount: number;
    durationMs: number;
    orchestrationDurationMs: number;
    planningDurationMs: number;
    executionDurationMs: number;
    stepLimitReached: boolean;
    request: AgentRequest;
    detectedIntent: AgentContext['intent'];
    selectedDomains: readonly AgentContextDomain[];
    candidateTools: readonly AgentToolDescriptor[];
    selectedTools: readonly AgentToolDescriptor[];
    toolExecution: AgentToolExecutionOutcome;
    expertExecution: AgentExpertExecutionOutcome;
    memory: AgentMemoryMetadata;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
  }): AgentRuntimeMetadata {
    return {
      enabled: input.enabled,
      detectedIntent: input.detectedIntent,
      planIntent: input.plan.intent,
      responseMode: input.plan.responseMode,
      executionStrategy: input.plan.executionStrategy,
      stepCount: input.stepCount,
      fallbackUsed: input.fallbackUsed,
      selectedDomains: input.selectedDomains,
      selectedDomainCount: input.selectedDomains.length,
      candidateExpertIds: input.plan.candidateExperts.map(
        (expert) => expert.id,
      ),
      selectedExpertIds: input.plan.selectedExperts.map((expert) => expert.id),
      rejectedExpertIds: this.getRejectedExpertIds(
        input.plan.candidateExperts,
        input.plan.selectedExperts,
      ),
      expertSelectionReason: this.buildExpertSelectionReason(
        input.detectedIntent,
        input.selectedDomains,
        input.plan.selectedExperts,
      ),
      expertRoutingPrimaryExpertId:
        input.plan.expertRouting.metadata.primaryExpertId,
      expertRoutingComplementaryExpertIds:
        input.plan.expertRouting.metadata.complementaryExpertIds,
      expertRoutingOrderedExpertIds:
        input.plan.expertRouting.metadata.orderedExpertIds,
      expertRoutingBlockedExpertIds:
        input.plan.expertRouting.metadata.blockedExpertIds,
      expertRoutingSkippedExpertIds:
        input.plan.expertRouting.metadata.skippedExpertIds,
      expertRoutingConfidence: input.plan.expertRouting.confidence,
      candidateToolIds: input.candidateTools.map((tool) => tool.id),
      selectedToolIds: input.selectedTools.map((tool) => tool.id),
      candidateToolCount: input.candidateTools.length,
      selectedToolCount: input.selectedTools.length,
      candidateExpertCount: input.plan.candidateExperts.length,
      selectedExpertCount: input.plan.selectedExperts.length,
      rejectedExpertCount: this.getRejectedExpertIds(
        input.plan.candidateExperts,
        input.plan.selectedExperts,
      ).length,
      estimatedToolCost: input.plan.expectedCost,
      estimatedToolLatencyMs: input.plan.expectedLatencyMs,
      planningStepCount: input.plan.planningSteps.length,
      planningDurationMs: input.planningDurationMs,
      executionDurationMs: input.executionDurationMs,
      planningValidationPassed: input.plan.validation.status === 'valid',
      toolExecutionEnabled: input.toolExecution.metrics.enabled,
      toolExecutionMetrics: input.toolExecution.metrics,
      toolExecutionResults: input.toolExecution.results,
      toolExecutionDurationMs: input.toolExecution.metrics.totalDurationMs,
      expertResults: input.expertExecution.results,
      expertContributions: input.expertExecution.contributions,
      expertExecutionDurationMs: input.expertExecution.durationMs,
      durationMs: input.durationMs,
      orchestrationDurationMs: input.orchestrationDurationMs,
      stepLimitReached: input.stepLimitReached,
      policyApproved: input.policyEvaluation.decision.approved,
      policyBlocked: input.policyEvaluation.decision.blocked,
      policyFallbackRequired: input.policyEvaluation.decision.fallbackRequired,
      policyReason: input.policyEvaluation.reason,
      policyViolationCount: input.policyEvaluation.violations.length,
      policyAllowedLLM: input.policyEvaluation.decision.allowedLLM,
      policyAllowedDomainCount:
        input.policyEvaluation.decision.allowedDomains.length,
      policyAllowedToolCount:
        input.policyEvaluation.decision.allowedTools.length,
      policyBlockedDomainIds:
        input.policyEvaluation.decision.metadata.blockedDomainIds,
      policyBlockedToolIds:
        input.policyEvaluation.decision.metadata.blockedToolIds,
      policyEvaluation: input.policyEvaluation,
      promptVersion: input.request.promptVersion,
      experimentId: input.request.experimentMetadata.experimentId,
      streamingPreference: input.request.streamingPreference,
      rolloutVariant: input.request.experimentMetadata.rolloutVariant,
      selectedPromptVersion:
        input.request.experimentMetadata.selectedPromptVersion,
      plan: input.plan,
      memory: input.memory,
    };
  }

  private buildObservabilityTraceReference(input: {
    request: AgentRequest;
    conversationId: string;
  }): AgentObservabilityTraceReference {
    return {
      requestId: input.request.sessionMetadata.requestId,
      conversationId: input.conversationId,
      userIdHash: input.request.sessionMetadata.userIdHash,
      experimentId: input.request.experimentMetadata.experimentId,
      promptVersion: input.request.promptVersion,
    };
  }

  private observeCoachExpertPipelineStart(input: {
    requestId: string;
    conversationId: string;
    intent: AgentContext['intent'];
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
    routingDecision: CoachExpertRoutingDecision;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
    routingDurationMs: number;
  }): void {
    if (!this.coachExpertObservabilityService) {
      return;
    }

    try {
      this.coachExpertObservabilityService.startTrace({
        requestId: input.requestId,
        conversationId: input.conversationId,
        intent: input.intent,
        selectedDomains: input.selectedDomains,
        candidateExperts: input.candidateExperts,
        routingDecision: input.routingDecision,
        policyEvaluation: input.policyEvaluation,
        runtimeMetadata: {
          routingDurationMs: input.routingDurationMs,
        },
      });
    } catch {
      return;
    }
  }

  private observeCoachExpertPipelineComplete(input: {
    requestId: string;
    expertExecution: AgentExpertExecutionOutcome;
    composition?: CoachExpertCompositionResult;
    personaGuidance?: CoachPersonaGuidance;
    explanation?: CoachExplanation;
    routingDurationMs: number;
    executionDurationMs: number;
    compositionDurationMs: number;
    personaDurationMs: number;
    explainabilityDurationMs: number;
    promptAssemblyDurationMs: number;
    totalDurationMs: number;
  }): void {
    if (!this.coachExpertObservabilityService) {
      return;
    }

    try {
      this.coachExpertObservabilityService.completeTrace({
        requestId: input.requestId,
        expertResults: input.expertExecution.results,
        expertContributions: input.expertExecution.contributions,
        ...(input.composition ? { composition: input.composition } : {}),
        ...(input.personaGuidance
          ? { personaGuidance: input.personaGuidance }
          : {}),
        ...(input.explanation ? { explanation: input.explanation } : {}),
        runtimeMetadata: {
          routingDurationMs: input.routingDurationMs,
          executionDurationMs: input.executionDurationMs,
          compositionDurationMs: input.compositionDurationMs,
          personaDurationMs: input.personaDurationMs,
          explainabilityDurationMs: input.explainabilityDurationMs,
          promptAssemblyDurationMs: input.promptAssemblyDurationMs,
          totalDurationMs: input.totalDurationMs,
        },
      });
    } catch {
      return;
    }
  }

  private executeSelectedExperts(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
    policyEvaluation: ReturnType<AgentPolicyEngineService['evaluate']>;
  }): AgentExpertExecutionOutcome {
    if (input.plan.selectedExperts.length === 0) {
      return {
        results: Object.freeze([]),
        contributions: Object.freeze([]),
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const expertRegistry = this.getExpertRegistry();
    const expertRequest = this.buildCoachExpertRequest(input);
    const runtimeMetadata = this.buildExpertRuntimeMetadata(input);
    const baseContext: CoachExpertContext = Object.freeze({
      request: expertRequest,
      policyEvaluation: input.policyEvaluation,
      healthContext: input.context.healthContext,
      ...(input.context.goalContext
        ? { goalContext: input.context.goalContext }
        : {}),
      ...(input.context.progress ? { progress: input.context.progress } : {}),
      ...(input.context.recoveryHistory
        ? { recoveryHistory: input.context.recoveryHistory }
        : {}),
      ...(input.context.nutritionContext
        ? { nutritionContext: input.context.nutritionContext }
        : {}),
      ...(input.context.habit ? { habit: input.context.habit } : {}),
      ...(input.context.habitHistory
        ? { habitHistory: input.context.habitHistory }
        : {}),
      selectionReason: this.buildExpertSelectionReason(
        input.context.intent,
        input.context.selectedDomains,
        input.plan.selectedExperts,
      ),
      runtimeMetadata,
    });

    this.agentTraceService?.recordEvent(
      input.request.sessionMetadata.requestId,
      {
        event: 'STEP_STARTED',
        timestamp: new Date().toISOString(),
        summary: 'Started coach expert analysis.',
        metadata: {
          selectedExpertIds: input.plan.selectedExperts.map(
            (expert) => expert.id,
          ),
        },
      },
    );

    const results: CoachExpertResult[] = [];
    const contributions: CoachExpertContribution[] = [];
    let currentContext = baseContext;

    for (const expertMetadata of input.plan.selectedExperts) {
      const expert = expertRegistry.getExpert(expertMetadata.id);
      if (!expert) {
        continue;
      }

      try {
        const loadedContext = expert.loadContext(expertRequest, currentContext);
        const result = expert.analyze(expertRequest, loadedContext);
        const expertContributions = expert.contribute(
          expertRequest,
          loadedContext,
          result,
        );

        currentContext = loadedContext;
        results.push(result);
        contributions.push(...expertContributions);
      } catch (error) {
        results.push({
          expertId: expert.metadata.id,
          summary: `${expert.metadata.displayName} analysis unavailable.`,
          contributions: [],
          metadata: Object.freeze({
            expertId: expert.metadata.id,
            runtimeMode: 'analysis-error-fallback',
            errorMessage:
              error instanceof Error ? error.message : String(error),
          }),
        });
      }
    }

    const durationMs = Date.now() - startTime;
    this.agentTraceService?.recordEvent(
      input.request.sessionMetadata.requestId,
      {
        event: 'STEP_COMPLETED',
        timestamp: new Date().toISOString(),
        summary: 'Completed coach expert analysis.',
        metadata: {
          selectedExpertIds: input.plan.selectedExperts.map(
            (expert) => expert.id,
          ),
          contributionCount: contributions.length,
          durationMs,
        },
      },
    );

    return {
      results: Object.freeze(results),
      contributions: Object.freeze(contributions),
      durationMs,
    };
  }

  private buildCoachExpertRequest(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
  }): CoachExpertRequest {
    return {
      ...input.request,
      intent: input.context.intent,
      selectedDomains: input.context.selectedDomains,
      candidateExperts: input.plan.candidateExperts,
      selectedExperts: input.plan.selectedExperts,
    };
  }

  private buildExpertRuntimeMetadata(input: {
    request: AgentRequest;
    context: AgentContext;
    plan: AgentPlan;
  }): Readonly<Record<string, unknown>> {
    return Object.freeze({
      requestId: input.request.sessionMetadata.requestId,
      conversationId: input.request.conversationId,
      detectedIntent: input.context.intent,
      selectedDomains: input.context.selectedDomains,
      candidateExpertIds: input.plan.candidateExperts.map(
        (expert) => expert.id,
      ),
      selectedExpertIds: input.plan.selectedExperts.map((expert) => expert.id),
      selectedExpertCount: input.plan.selectedExperts.length,
      candidateExpertCount: input.plan.candidateExperts.length,
      selectionReason: this.buildExpertSelectionReason(
        input.context.intent,
        input.context.selectedDomains,
        input.plan.selectedExperts,
      ),
      runtimeMode: 'expert-selection-metadata',
    });
  }

  private freezeExpert(expert: CoachExpertMetadata): CoachExpertMetadata {
    return Object.freeze({
      ...expert,
      supportedIntents: Object.freeze([...expert.supportedIntents]),
      supportedDomains: Object.freeze([...expert.supportedDomains]),
      capabilities: Object.freeze([...expert.capabilities]),
    });
  }

  private freezeExpertSelection(input: {
    expert: CoachExpertMetadata;
    role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY';
    sequence: number;
    reasonCodes: readonly CoachExpertRoutingReasonCode[];
    sourceExpertId?: string;
  }): Readonly<{
    expert: CoachExpertMetadata;
    role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY';
    sequence: number;
    reasonCodes: readonly CoachExpertRoutingReasonCode[];
    sourceExpertId?: string;
  }> {
    return Object.freeze({
      expert: this.freezeExpert(input.expert),
      role: input.role,
      sequence: input.sequence,
      reasonCodes: Object.freeze([...input.reasonCodes]),
      ...(input.sourceExpertId ? { sourceExpertId: input.sourceExpertId } : {}),
    });
  }

  private getCandidateExperts(
    intent: AgentContext['intent'],
  ): CoachExpertMetadata[] {
    return this.getExpertRegistry()
      .getExpertsForIntent(intent)
      .map((expert) => expert.metadata);
  }

  private getSelectedExperts(
    intent: AgentContext['intent'],
    selectedDomains: readonly AgentContextDomain[],
  ): CoachExpertMetadata[] {
    return this.selectExperts(
      this.getCandidateExperts(intent),
      selectedDomains,
    );
  }

  private selectExperts(
    candidateExperts: readonly CoachExpertMetadata[],
    selectedDomains: readonly AgentContextDomain[],
  ): CoachExpertMetadata[] {
    const allowedDomains = new Set(selectedDomains);

    return candidateExperts.filter((expert) =>
      expert.supportedDomains.some((domain) => allowedDomains.has(domain)),
    );
  }

  private selectTools(
    candidateTools: AgentToolDescriptor[],
    domainTools: AgentToolDescriptor[],
  ): AgentToolDescriptor[] {
    const domainToolIds = new Set(domainTools.map((tool) => tool.id));

    return candidateTools.filter((tool) => domainToolIds.has(tool.id));
  }

  private getRejectedExpertIds(
    candidateExperts: readonly CoachExpertMetadata[],
    selectedExperts: readonly CoachExpertMetadata[],
  ): readonly string[] {
    const selectedIds = new Set(selectedExperts.map((expert) => expert.id));

    return candidateExperts
      .filter((expert) => !selectedIds.has(expert.id))
      .map((expert) => expert.id);
  }

  private buildExpertSelectionReason(
    intent: AgentContext['intent'],
    selectedDomains: readonly AgentContextDomain[],
    selectedExperts: readonly CoachExpertMetadata[],
  ): string {
    return `intent=${intent}; domains=${selectedDomains.join(',')}; experts=${selectedExperts
      .map((expert) => expert.id)
      .join(',')}`;
  }

  private getExpertRegistry(): CoachExpertRegistry {
    return this.coachExpertRegistry ?? new CoachExpertRegistry();
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
