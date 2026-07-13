import { Injectable } from '@nestjs/common';

import { AgentRuntimeConfigService } from '../agent-runtime.config';
import type {
  AgentAction,
  AgentContext,
  AgentPlan,
  AgentToolDescriptor,
} from '../agent.types';
import type {
  CoachExpertCapability,
  CoachExpertMetadata,
  CoachExpertPrioritySnapshot,
} from '../../experts/coach-expert.types';
import { AgentPlanningPolicy } from './agent-planning.policy';
import { AgentPlanValidator } from './agent-plan-validator.service';
import type { AgentPlanningInput } from './agent-planning.types';
import { AgentTraceService } from '../observability/agent-trace.service';

@Injectable()
export class AgentPlanningEngineService {
  constructor(
    private readonly policy: AgentPlanningPolicy,
    private readonly validator: AgentPlanValidator,
    private readonly config: AgentRuntimeConfigService,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  buildPlan(input: AgentPlanningInput): AgentPlan {
    const startedAt = Date.now();
    const baseExecutionStrategy = this.policy.selectExecutionStrategy({
      intent: input.intent,
      selectedDomains: input.selectedDomains,
    });
    const executionStrategy =
      input.policyEvaluation.decision.fallbackRequired ||
      !input.policyEvaluation.decision.allowedLLM
        ? 'FALLBACK_ONLY'
        : baseExecutionStrategy;
    const selectedDomains = this.uniqueValues(
      input.policyEvaluation.decision.allowedDomains.length > 0
        ? input.policyEvaluation.decision.allowedDomains
        : input.selectedDomains,
    );
    const candidateExperts = this.dedupeExperts(input.candidateExperts);
    const selectedExperts = this.dedupeExperts(
      input.expertRouting.orderedExperts,
    );
    const expertPriorities = this.buildExpertPriorities(selectedExperts);
    const expertCapabilities = this.buildExpertCapabilities(selectedExperts);
    const selectedTools = this.policy.orderTools(
      executionStrategy,
      input.policyEvaluation.decision.allowedTools.length > 0
        ? input.policyEvaluation.decision.allowedTools
        : input.selectedTools,
    );
    const planningDecision = this.policy.buildDecision({
      intent: input.intent,
      selectedDomains,
      selectedTools,
      responseMode: input.responseMode,
    });
    const plan: AgentPlan = {
      intent: input.intent,
      requiredContextDomains: selectedDomains,
      candidateExperts,
      selectedExperts,
      expertRouting: input.expertRouting,
      expertPriorities,
      expertCapabilities,
      responseMode: input.responseMode,
      safetyConstraints: planningDecision.safetyConstraints,
      maxSteps: this.config.getMaxSteps(),
      actions: this.dedupeActions(input.actions),
      candidateTools: this.dedupeTools(input.candidateTools),
      selectedTools,
      executionStrategy,
      planningSteps: planningDecision.planningSteps,
      maximumExecutionDepth: planningDecision.maximumExecutionDepth,
      expectedCost: planningDecision.expectedCost,
      expectedLatencyMs: planningDecision.expectedLatencyMs,
      validation: {
        status: 'valid',
        issues: [],
      },
      summary: this.policy.buildSummary({
        intent: input.intent,
        executionStrategy,
        responseMode: input.responseMode,
        selectedDomains,
        selectedTools,
        selectedExperts,
        maximumExecutionDepth: planningDecision.maximumExecutionDepth,
        expectedCost: planningDecision.expectedCost,
        expectedLatencyMs: planningDecision.expectedLatencyMs,
      }),
    };

    const validatedPlan = this.validator.validate(plan);
    const planningDurationMs = Date.now() - startedAt;

    this.agentTraceService?.recordEvent(input.requestId ?? 'unknown', {
      event: 'PLAN_CREATED',
      timestamp: new Date().toISOString(),
      summary: 'Created the deterministic execution plan.',
      metadata: {
        executionStrategy,
        selectedDomains,
        candidateToolIds: plan.candidateTools.map((tool) => tool.id),
        selectedToolIds: plan.selectedTools.map((tool) => tool.id),
        candidateExpertIds: plan.candidateExperts.map((expert) => expert.id),
        selectedExpertIds: plan.selectedExperts.map((expert) => expert.id),
        rejectedExpertIds: this.getRejectedExpertIds(
          input.candidateExperts,
          plan.selectedExperts,
        ),
        expertSelectionReason: this.buildExpertSelectionReason(
          input.intent,
          selectedDomains,
          plan.selectedExperts,
        ),
        primaryExpertId: plan.expertRouting.metadata.primaryExpertId,
        complementaryExpertIds:
          plan.expertRouting.metadata.complementaryExpertIds,
        orderedExpertIds: plan.expertRouting.metadata.orderedExpertIds,
        blockedExpertIds: plan.expertRouting.metadata.blockedExpertIds,
        skippedExpertIds: plan.expertRouting.metadata.skippedExpertIds,
        routingConfidence: plan.expertRouting.confidence,
        maximumExecutionDepth: plan.maximumExecutionDepth,
        expectedCost: plan.expectedCost,
        expectedLatencyMs: plan.expectedLatencyMs,
        planningDurationMs,
      },
    });

    this.agentTraceService?.recordEvent(input.requestId ?? 'unknown', {
      event: 'PLAN_VALIDATED',
      timestamp: new Date().toISOString(),
      summary: 'Validated the deterministic execution plan.',
      metadata: {
        executionStrategy: validatedPlan.executionStrategy,
        selectedDomains: validatedPlan.requiredContextDomains,
        candidateToolIds: validatedPlan.candidateTools.map((tool) => tool.id),
        selectedToolIds: validatedPlan.selectedTools.map((tool) => tool.id),
        candidateExpertIds: validatedPlan.candidateExperts.map(
          (expert) => expert.id,
        ),
        selectedExpertIds: validatedPlan.selectedExperts.map(
          (expert) => expert.id,
        ),
        rejectedExpertIds: this.getRejectedExpertIds(
          input.candidateExperts,
          validatedPlan.selectedExperts,
        ),
        expertSelectionReason: this.buildExpertSelectionReason(
          input.intent,
          selectedDomains,
          validatedPlan.selectedExperts,
        ),
        primaryExpertId: validatedPlan.expertRouting.metadata.primaryExpertId,
        complementaryExpertIds:
          validatedPlan.expertRouting.metadata.complementaryExpertIds,
        orderedExpertIds: validatedPlan.expertRouting.metadata.orderedExpertIds,
        blockedExpertIds: validatedPlan.expertRouting.metadata.blockedExpertIds,
        skippedExpertIds: validatedPlan.expertRouting.metadata.skippedExpertIds,
        routingConfidence: validatedPlan.expertRouting.confidence,
        maximumExecutionDepth: validatedPlan.maximumExecutionDepth,
        expectedCost: validatedPlan.expectedCost,
        expectedLatencyMs: validatedPlan.expectedLatencyMs,
        validationStatus: validatedPlan.validation.status,
        planningDurationMs,
      },
    });

    return validatedPlan;
  }

  buildActions(context: AgentContext): AgentAction[] {
    return this.policy.buildActions(context);
  }

  private uniqueValues<T>(values: readonly T[]): readonly T[] {
    return [...new Set(values)];
  }

  private dedupeTools(
    tools: readonly AgentToolDescriptor[],
  ): readonly AgentToolDescriptor[] {
    const seen = new Set<string>();
    const result: AgentToolDescriptor[] = [];

    for (const tool of tools) {
      if (seen.has(tool.id)) {
        continue;
      }

      seen.add(tool.id);
      result.push(tool);
    }

    return result;
  }

  private dedupeExperts(
    experts: readonly CoachExpertMetadata[],
  ): readonly CoachExpertMetadata[] {
    const seen = new Set<string>();
    const result: CoachExpertMetadata[] = [];

    for (const expert of experts) {
      if (seen.has(expert.id)) {
        continue;
      }

      seen.add(expert.id);
      result.push(expert);
    }

    return result;
  }

  private dedupeActions(
    actions: readonly AgentAction[],
  ): readonly AgentAction[] {
    const seen = new Set<string>();
    const result: AgentAction[] = [];

    for (const action of actions) {
      const key = `${action.type}:${action.domain}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(action);
    }

    return result;
  }

  private buildExpertPriorities(
    experts: readonly CoachExpertMetadata[],
  ): readonly CoachExpertPrioritySnapshot[] {
    return experts.map((expert) =>
      Object.freeze({
        expertId: expert.id,
        priority: expert.priority,
      }),
    );
  }

  private buildExpertCapabilities(
    experts: readonly CoachExpertMetadata[],
  ): readonly CoachExpertCapability[] {
    const capabilities = new Set<CoachExpertCapability>();

    for (const expert of experts) {
      for (const capability of expert.capabilities) {
        capabilities.add(capability);
      }
    }

    return [...capabilities].sort((left, right) => left.localeCompare(right));
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
    intent: CoachExpertMetadata['supportedIntents'][number] | string,
    selectedDomains: readonly string[],
    selectedExperts: readonly CoachExpertMetadata[],
  ): string {
    return `intent=${intent}; domains=${selectedDomains.join(',')}; experts=${selectedExperts
      .map((expert) => expert.id)
      .join(',')}`;
  }
}
