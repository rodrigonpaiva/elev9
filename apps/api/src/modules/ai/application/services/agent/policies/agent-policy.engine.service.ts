import { Injectable } from '@nestjs/common';

import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentToolRegistryService } from '../tools/agent-tool-registry.service';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';
import { AiLlmConfigService } from '../../llm/ai-llm-config.service';
import { AgentTraceService } from '../observability/agent-trace.service';
import type {
  AgentContextDomain,
  AgentIntent,
  AgentPlan,
  AgentRequest,
  AgentSafetyMetadata,
} from '../agent.types';
import type { AgentToolDescriptor } from '../tools/agent-tool.types';
import type { CoachExpertMetadata } from '../../experts/coach-expert.types';
import type {
  AgentPolicyContext,
  AgentPolicyDecision,
  AgentPolicyEvaluation,
  AgentPolicyMetrics,
  AgentPolicyCategory,
  AgentPolicyViolation,
  AgentPolicyViolationSeverity,
} from './agent-policy.types';
import { AgentPolicyRegistry } from './agent-policy.registry';

@Injectable()
export class AgentPolicyEngineService {
  constructor(
    private readonly registry: AgentPolicyRegistry,
    private readonly runtimeConfig: AgentRuntimeConfigService,
    private readonly llmConfig: AiLlmConfigService,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly expertRegistry?: CoachExpertRegistry,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  evaluate(input: AgentPolicyContext): AgentPolicyEvaluation {
    const startedAt = Date.now();
    const violations: AgentPolicyViolation[] = [];
    const evaluatedPolicyIds = this.registry
      .listPolicies()
      .map((policy) => policy.id);
    const allowedDomains = this.filterDomains(input);
    const blockedDomains = this.uniqueDomains(
      input.selectedDomains.filter(
        (domain) => !allowedDomains.includes(domain),
      ),
    );
    const candidateTools =
      input.stage === 'CONTEXT'
        ? (input.candidateTools ?? [])
        : (input.candidateTools ?? this.toolRegistry.getEnabledTools());
    const selectedTools =
      input.stage === 'CONTEXT'
        ? (input.selectedTools ?? [])
        : (input.selectedTools ?? candidateTools);
    const candidateExperts =
      input.candidateExperts ??
      this.getExpertRegistry()
        .getExpertsForIntent(input.intent)
        .map((expert): CoachExpertMetadata => expert.metadata);
    const selectedExperts = input.selectedExperts ?? candidateExperts;
    const allowedTools = this.filterTools(
      input,
      allowedDomains,
      candidateTools,
    );
    const allowedExperts = this.filterExperts(
      input,
      allowedDomains,
      candidateExperts,
      selectedExperts,
    );
    const blockedTools = this.uniqueTools(
      selectedTools.filter(
        (tool) => !allowedTools.some((allowed) => allowed.id === tool.id),
      ),
    );
    const blockedExperts = this.uniqueExperts(
      selectedExperts.filter(
        (expert) => !allowedExperts.some((allowed) => allowed.id === expert.id),
      ),
    );
    const cost = this.sumCost(allowedTools);
    const latency = this.sumLatency(allowedTools);
    const costLimit = this.getCostLimit();
    const latencyLimit = this.getLatencyLimit();
    const depthLimit = this.runtimeConfig.getMaxSteps();
    const safetyBlocked = this.isSafetyBlocked(input.safetyMetadata);
    const runtimeBlocked = !input.runtimeEnabled;
    const costBlocked =
      input.stage !== 'CONTEXT' &&
      (input.plan?.maximumExecutionDepth ?? depthLimit) > depthLimit;
    const estimatedCostBlocked = input.stage !== 'CONTEXT' && cost > costLimit;
    const estimatedLatencyBlocked =
      input.stage !== 'CONTEXT' && latency > latencyLimit;
    const llmAllowed =
      input.runtimeEnabled &&
      input.llmEnabled &&
      !safetyBlocked &&
      !runtimeBlocked &&
      !costBlocked &&
      !estimatedCostBlocked &&
      !estimatedLatencyBlocked &&
      this.llmConfig.getProvider() === 'openai' &&
      this.llmConfig.getApiKey().trim() !== '';
    const fallbackRequired =
      runtimeBlocked ||
      !input.llmEnabled ||
      safetyBlocked ||
      costBlocked ||
      estimatedCostBlocked ||
      estimatedLatencyBlocked;
    const blocked =
      runtimeBlocked ||
      costBlocked ||
      estimatedCostBlocked ||
      estimatedLatencyBlocked;
    const approved = !blocked;

    if (blockedDomains.length > 0) {
      violations.push(
        ...blockedDomains.map((domain) =>
          this.buildViolation({
            policyId: 'context-authorization',
            category: 'CONTEXT',
            severity: 'WARN',
            reason: `Context domain "${domain}" is not authorized for intent ${input.intent}.`,
            metadata: {
              domain,
              intent: input.intent,
            },
          }),
        ),
      );
    }

    if (blockedTools.length > 0) {
      violations.push(
        ...blockedTools.map((tool) =>
          this.buildViolation({
            policyId: 'tool-authorization',
            category: 'TOOL',
            severity: 'WARN',
            reason: `Tool "${tool.id}" is not authorized for the current policy decision.`,
            metadata: {
              toolId: tool.id,
              category: tool.category,
            },
          }),
        ),
      );
    }

    if (blockedExperts.length > 0) {
      violations.push(
        ...blockedExperts.map((expert) =>
          this.buildViolation({
            policyId: 'context-authorization',
            category: 'CONTEXT',
            severity: 'WARN',
            reason: `Expert "${expert.id}" is not authorized for the current policy decision.`,
            metadata: {
              expertId: expert.id,
              category: expert.category,
            },
          }),
        ),
      );
    }

    if (fallbackRequired) {
      violations.push(
        this.buildViolation({
          policyId: 'llm-authorization',
          category: 'LLM',
          severity: blocked ? 'BLOCK' : 'WARN',
          reason: this.buildFallbackReason({
            runtimeBlocked,
            llmAllowed,
            safetyBlocked,
            costBlocked,
            estimatedCostBlocked,
            estimatedLatencyBlocked,
          }),
          metadata: {
            runtimeEnabled: input.runtimeEnabled,
            llmEnabled: input.llmEnabled,
            safetyBlocked,
            costBlocked,
            estimatedCostBlocked,
            estimatedLatencyBlocked,
          },
        }),
      );
    }

    const reason = this.buildReason({
      blocked,
      fallbackRequired,
      blockedDomains,
      blockedTools,
      llmAllowed,
    });
    const actions = this.buildActions({
      blocked,
      fallbackRequired,
      blockedDomains,
      blockedTools,
      llmAllowed,
    });
    const decision: AgentPolicyDecision = {
      approved,
      blocked,
      fallbackRequired,
      allowedTools: Object.freeze([...allowedTools]),
      allowedExperts: Object.freeze([...allowedExperts]),
      allowedDomains: Object.freeze([...allowedDomains]),
      allowedLLM: llmAllowed,
      metadata: Object.freeze({
        stage: input.stage,
        evaluatedPolicyIds: Object.freeze(evaluatedPolicyIds),
        rejectedPolicyIds: Object.freeze(
          violations.map((violation) => violation.policyId),
        ),
        violationCount: violations.length,
        fallbackDecisionCount: fallbackRequired ? 1 : 0,
        blockedDomainIds: Object.freeze([...blockedDomains]),
        blockedToolIds: Object.freeze(blockedTools.map((tool) => tool.id)),
        blockedExpertIds: Object.freeze(
          blockedExperts.map((expert) => expert.id),
        ),
        blockedLlmUsage: !llmAllowed,
        allowedDomainCount: allowedDomains.length,
        allowedToolCount: allowedTools.length,
        allowedExpertCount: allowedExperts.length,
        candidateExpertCount: candidateExperts.length,
        selectedExpertCount: selectedExperts.length,
        estimatedCost: cost,
        estimatedLatencyMs: latency,
        maximumExecutionDepth: input.plan?.maximumExecutionDepth ?? depthLimit,
        maxSteps: depthLimit,
        maxToolCalls: this.runtimeConfig.getMaxToolCalls(),
        evaluationDurationMs: Date.now() - startedAt,
      }),
    };

    this.agentTraceService?.recordPolicySnapshot(
      input.request.sessionMetadata.requestId,
      {
        stage: input.stage,
        approved: decision.approved,
        blocked: decision.blocked,
        fallbackRequired: decision.fallbackRequired,
        allowedLLM: decision.allowedLLM,
        allowedDomains: decision.allowedDomains,
        blockedDomains: decision.metadata.blockedDomainIds,
        allowedTools: decision.allowedTools.map((tool) => tool.id),
        blockedTools: decision.metadata.blockedToolIds,
        candidateExpertIds: candidateExperts.map((expert) => expert.id),
        selectedExpertIds: selectedExperts.map((expert) => expert.id),
        allowedExpertIds: allowedExperts.map((expert) => expert.id),
        blockedExpertIds: blockedExperts.map((expert) => expert.id),
        reason,
        actions,
        violations,
        policyEvaluation: {
          decision,
          violations: Object.freeze([...violations]),
          reason,
          actions: Object.freeze([...actions]),
        },
      },
    );

    return {
      decision,
      violations: Object.freeze(violations),
      reason,
      actions: Object.freeze(actions),
    };
  }

  private filterDomains(
    input: AgentPolicyContext,
  ): readonly AgentContextDomain[] {
    const allowed = new Set(
      this.registry.getAllowedContextDomains(input.intent),
    );
    const explicitNutritionRequest = this.hasNutritionSignal(input.request);

    if (explicitNutritionRequest) {
      allowed.add('nutrition');
    }

    return this.uniqueDomains(
      input.selectedDomains.filter((domain) => allowed.has(domain)),
    );
  }

  private filterTools(
    input: AgentPolicyContext,
    allowedDomains: readonly AgentContextDomain[],
    candidateTools: readonly AgentToolDescriptor[],
  ): readonly AgentToolDescriptor[] {
    const allowedDomainSet = new Set(allowedDomains);
    const selectedToolIds = new Set(
      (input.selectedTools ?? candidateTools).map((tool) => tool.id),
    );
    const allowed: AgentToolDescriptor[] = [];

    for (const tool of candidateTools) {
      if (!tool.enabled) {
        continue;
      }

      if (!selectedToolIds.has(tool.id)) {
        continue;
      }

      if (!tool.supportedIntents.includes(input.intent)) {
        continue;
      }

      if (!this.isReadOnly(tool)) {
        continue;
      }

      if (
        tool.supportedContextDomains.length > 0 &&
        !tool.supportedContextDomains.some((domain) =>
          allowedDomainSet.has(domain),
        )
      ) {
        continue;
      }

      allowed.push(tool);
    }

    return this.uniqueTools(allowed);
  }

  private filterExperts(
    input: AgentPolicyContext,
    allowedDomains: readonly AgentContextDomain[],
    candidateExperts: readonly CoachExpertMetadata[],
    selectedExperts: readonly CoachExpertMetadata[],
  ): readonly CoachExpertMetadata[] {
    const allowedDomainSet = new Set(allowedDomains);
    const selectedIds = new Set(selectedExperts.map((expert) => expert.id));
    const allowed =
      candidateExperts.length > 0 ? candidateExperts : selectedExperts;

    return this.uniqueExperts(
      allowed
        .filter((expert) => expert.enabled)
        .filter((expert) => expert.supportedIntents.includes(input.intent))
        .filter((expert) =>
          expert.supportedDomains.some((domain) =>
            allowedDomainSet.has(domain),
          ),
        )
        .filter((expert) =>
          selectedIds.size > 0 ? selectedIds.has(expert.id) : true,
        ),
    );
  }

  private isReadOnly(tool: AgentToolDescriptor): boolean {
    return tool.metadata.capabilities.every((capability) =>
      capability.startsWith('READ_'),
    );
  }

  private isSafetyBlocked(safety?: AgentSafetyMetadata): boolean {
    if (!safety) {
      return false;
    }

    return !safety.deterministicFirst || !safety.fallbackAllowed;
  }

  private hasNutritionSignal(request: AgentRequest): boolean {
    const message = request.userMessage.toLowerCase();

    return [
      'nutrition',
      'meal',
      'meals',
      'macro',
      'macros',
      'protein',
      'calorie',
      'calories',
      'diet',
    ].some((term) => message.includes(term));
  }

  private getCostLimit(): number {
    return this.runtimeConfig.getMaxToolCalls() * 5;
  }

  private getLatencyLimit(): number {
    return (
      this.runtimeConfig.getToolTimeoutMs() *
      this.runtimeConfig.getMaxToolCalls()
    );
  }

  private sumCost(tools: readonly AgentToolDescriptor[]): number {
    return tools.reduce((total, tool) => total + tool.estimatedCost, 0);
  }

  private sumLatency(tools: readonly AgentToolDescriptor[]): number {
    return tools.reduce((total, tool) => total + tool.estimatedLatencyMs, 0);
  }

  private uniqueDomains(
    domains: readonly AgentContextDomain[],
  ): readonly AgentContextDomain[] {
    return [...new Set(domains)];
  }

  private uniqueTools(
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

  private uniqueExperts(
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

  private buildViolation(input: {
    policyId: string;
    category: AgentPolicyCategory;
    severity: AgentPolicyViolationSeverity;
    reason: string;
    metadata?: Record<string, unknown>;
  }): AgentPolicyViolation {
    return {
      policyId: input.policyId,
      category: input.category,
      severity: input.severity,
      reason: input.reason,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };
  }

  private buildFallbackReason(input: {
    runtimeBlocked: boolean;
    llmAllowed: boolean;
    safetyBlocked: boolean;
    costBlocked: boolean;
    estimatedCostBlocked: boolean;
    estimatedLatencyBlocked: boolean;
  }): string {
    if (input.runtimeBlocked) {
      return 'Agent runtime is disabled.';
    }

    if (!input.llmAllowed) {
      return 'LLM usage is not authorized by policy.';
    }

    if (input.safetyBlocked) {
      return 'Safety policy requires deterministic fallback.';
    }

    if (
      input.costBlocked ||
      input.estimatedCostBlocked ||
      input.estimatedLatencyBlocked
    ) {
      return 'Execution cost or latency exceeds policy limits.';
    }

    return 'Deterministic fallback is required.';
  }

  private buildReason(input: {
    blocked: boolean;
    fallbackRequired: boolean;
    blockedDomains: readonly AgentContextDomain[];
    blockedTools: readonly AgentToolDescriptor[];
    llmAllowed: boolean;
  }): string {
    if (input.blocked) {
      return 'Policy rejected the execution request.';
    }

    if (input.fallbackRequired) {
      return 'Policy requires deterministic fallback.';
    }

    if (input.blockedDomains.length > 0 || input.blockedTools.length > 0) {
      return 'Policy approved the request with filtered domains and tools.';
    }

    if (!input.llmAllowed) {
      return 'Policy approved the request but deterministic fallback remains available.';
    }

    return 'Policy approved the request.';
  }

  private buildActions(input: {
    blocked: boolean;
    fallbackRequired: boolean;
    blockedDomains: readonly AgentContextDomain[];
    blockedTools: readonly AgentToolDescriptor[];
    llmAllowed: boolean;
  }): string[] {
    const actions: string[] = [];

    if (input.blockedDomains.length > 0) {
      actions.push('filter_context_domains');
    }

    if (input.blockedTools.length > 0) {
      actions.push('filter_tools');
    }

    if (input.blocked || input.fallbackRequired || !input.llmAllowed) {
      actions.push('deterministic_fallback');
    } else {
      actions.push('continue_execution');
    }

    return actions;
  }

  private getExpertRegistry(): CoachExpertRegistry {
    return this.expertRegistry ?? new CoachExpertRegistry();
  }
}
