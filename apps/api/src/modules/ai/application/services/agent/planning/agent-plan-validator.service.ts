import { Injectable } from '@nestjs/common';

import type {
  AgentAction,
  AgentPlan,
  AgentToolDescriptor,
} from '../agent.types';
import type { CoachExpertMetadata } from '../../experts/coach-expert.types';
import type {
  CoachExpertRoute,
  CoachExpertRoutingDecision,
  CoachExpertSelection,
} from '../../experts/coach-expert-router';
import type {
  AgentPlanningStep,
  AgentPlanningValidationResult,
} from './agent-planning.types';

@Injectable()
export class AgentPlanValidator {
  validate(plan: AgentPlan): AgentPlan {
    const normalizedPlan = this.normalizePlan(plan);
    const validation = this.collectValidation(normalizedPlan);

    if (validation.issues.length > 0) {
      throw new Error(`Invalid agent plan: ${validation.issues.join('; ')}`);
    }

    return this.freezePlan({
      ...normalizedPlan,
      validation,
    });
  }

  collectValidation(plan: AgentPlan): AgentPlanningValidationResult {
    const issues: string[] = [];

    if (!plan.intent) {
      issues.push('Missing plan intent.');
    }

    if (plan.requiredContextDomains.length === 0) {
      issues.push('Plan must include at least one context domain.');
    }

    if (plan.selectedTools.length === 0) {
      issues.push('Plan must include at least one selected tool.');
    }

    if (plan.planningSteps.length === 0) {
      issues.push('Plan must include at least one planning step.');
    }

    if (plan.maximumExecutionDepth < 1) {
      issues.push('Plan must declare a positive maximum execution depth.');
    }

    if (plan.maximumExecutionDepth > plan.maxSteps) {
      issues.push('Maximum execution depth cannot exceed max steps.');
    }

    const routedExpertIds = plan.expertRouting.orderedExperts.map(
      (expert) => expert.id,
    );
    const selectedExpertIds = plan.selectedExperts.map((expert) => expert.id);

    if (routedExpertIds.join(',') !== selectedExpertIds.join(',')) {
      issues.push('Selected experts must match the routed expert order.');
    }

    return {
      status: issues.length > 0 ? 'invalid' : 'valid',
      issues,
    };
  }

  normalizePlan(plan: AgentPlan): AgentPlan {
    const candidateExperts = plan.candidateExperts ?? [];
    const selectedExperts = plan.selectedExperts ?? [];
    const expertPriorities = plan.expertPriorities ?? [];
    const expertCapabilities = plan.expertCapabilities ?? [];

    return this.freezePlan({
      ...plan,
      requiredContextDomains: this.uniqueValues(plan.requiredContextDomains),
      candidateExperts: this.uniqueExperts(candidateExperts),
      selectedExperts: this.uniqueExperts(selectedExperts),
      actions: this.uniqueActions(plan.actions ?? []),
      candidateTools: this.uniqueTools(plan.candidateTools ?? []),
      selectedTools: this.uniqueTools(plan.selectedTools ?? []),
      planningSteps: this.uniquePlanningSteps(plan.planningSteps ?? []),
      expertPriorities: this.uniqueExpertPriorities(expertPriorities),
      expertCapabilities: this.uniqueValues(expertCapabilities),
    });
  }

  private uniqueValues<T>(values: readonly T[]): readonly T[] {
    return [...new Set(values)];
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

  private uniqueExpertPriorities(
    priorities: readonly { expertId: string; priority: number }[],
  ): readonly { expertId: string; priority: number }[] {
    const seen = new Set<string>();
    const result: { expertId: string; priority: number }[] = [];

    for (const priority of priorities) {
      if (seen.has(priority.expertId)) {
        continue;
      }

      seen.add(priority.expertId);
      result.push(priority);
    }

    return result;
  }

  private uniqueActions(
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

  private uniquePlanningSteps(
    steps: readonly AgentPlanningStep[],
  ): readonly AgentPlanningStep[] {
    const seen = new Set<string>();
    const result: AgentPlanningStep[] = [];

    for (const step of steps) {
      if (seen.has(step.step)) {
        continue;
      }

      seen.add(step.step);
      result.push(step);
    }

    return result;
  }

  private freezePlan(plan: AgentPlan): AgentPlan {
    const candidateTools = plan.candidateTools.map((tool) =>
      this.freezeTool(tool),
    );
    const selectedTools = plan.selectedTools.map((tool) =>
      this.freezeTool(tool),
    );
    const actions = plan.actions.map((action) => this.freezeAction(action));
    const planningSteps = plan.planningSteps.map((step) =>
      this.freezePlanningStep(step),
    );

    return Object.freeze({
      ...plan,
      requiredContextDomains: Object.freeze([...plan.requiredContextDomains]),
      candidateExperts: Object.freeze(
        plan.candidateExperts.map((expert) => this.freezeExpert(expert)),
      ),
      selectedExperts: Object.freeze(
        plan.selectedExperts.map((expert) => this.freezeExpert(expert)),
      ),
      expertPriorities: Object.freeze(
        plan.expertPriorities.map((priority) => Object.freeze({ ...priority })),
      ),
      expertCapabilities: Object.freeze([...plan.expertCapabilities]),
      actions: Object.freeze(actions),
      candidateTools: Object.freeze(candidateTools),
      selectedTools: Object.freeze(selectedTools),
      planningSteps: Object.freeze(planningSteps),
      safetyConstraints: Object.freeze([...plan.safetyConstraints]),
      expertRouting: this.freezeRoutingDecision(plan.expertRouting),
      validation: Object.freeze({
        ...plan.validation,
        issues: Object.freeze([...plan.validation.issues]),
      }),
    });
  }

  private freezeTool(tool: AgentToolDescriptor): AgentToolDescriptor {
    return Object.freeze({
      ...tool,
      supportedIntents: Object.freeze([...tool.supportedIntents]),
      supportedContextDomains: Object.freeze([...tool.supportedContextDomains]),
      metadata: Object.freeze({
        ...tool.metadata,
        capabilities: Object.freeze([...tool.metadata.capabilities]),
      }),
    });
  }

  private freezeAction(action: AgentAction): AgentAction {
    return Object.freeze({
      ...action,
      ...(action.metadata
        ? { metadata: Object.freeze({ ...action.metadata }) }
        : {}),
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

  private freezeRoutingDecision(
    routingDecision: CoachExpertRoutingDecision,
  ): CoachExpertRoutingDecision {
    return Object.freeze({
      ...routingDecision,
      primaryExpert: routingDecision.primaryExpert
        ? this.freezeExpert(routingDecision.primaryExpert)
        : null,
      complementaryExperts: Object.freeze(
        routingDecision.complementaryExperts.map((expert) =>
          this.freezeExpert(expert),
        ),
      ),
      orderedExperts: Object.freeze(
        routingDecision.orderedExperts.map((expert) =>
          this.freezeExpert(expert),
        ),
      ),
      blockedExperts: Object.freeze(
        routingDecision.blockedExperts.map((expert) =>
          this.freezeExpert(expert),
        ),
      ),
      skippedExperts: Object.freeze(
        routingDecision.skippedExperts.map((expert) =>
          this.freezeExpert(expert),
        ),
      ),
      routingReasons: Object.freeze(
        routingDecision.routingReasons.map((reason) =>
          Object.freeze({
            ...reason,
            ...(reason.details
              ? { details: Object.freeze({ ...reason.details }) }
              : {}),
          }),
        ),
      ),
      route: this.freezeRoute(routingDecision.route),
      metadata: Object.freeze({
        ...routingDecision.metadata,
        selectedDomains: Object.freeze([
          ...routingDecision.metadata.selectedDomains,
        ]),
        candidateExpertIds: Object.freeze([
          ...routingDecision.metadata.candidateExpertIds,
        ]),
        allowedExpertIds: Object.freeze([
          ...routingDecision.metadata.allowedExpertIds,
        ]),
        blockedExpertIds: Object.freeze([
          ...routingDecision.metadata.blockedExpertIds,
        ]),
        skippedExpertIds: Object.freeze([
          ...routingDecision.metadata.skippedExpertIds,
        ]),
        complementaryExpertIds: Object.freeze([
          ...routingDecision.metadata.complementaryExpertIds,
        ]),
        orderedExpertIds: Object.freeze([
          ...routingDecision.metadata.orderedExpertIds,
        ]),
        validationIssues: Object.freeze([
          ...routingDecision.metadata.validationIssues,
        ]),
      }),
    });
  }

  private freezeRoute(route: CoachExpertRoute): CoachExpertRoute {
    return Object.freeze({
      primaryExpert: route.primaryExpert
        ? this.freezeSelection(route.primaryExpert)
        : null,
      complementaryExperts: Object.freeze(
        route.complementaryExperts.map((selection) =>
          this.freezeSelection(selection),
        ),
      ),
      orderedExperts: Object.freeze(
        route.orderedExperts.map((selection) =>
          this.freezeSelection(selection),
        ),
      ),
      blockedExperts: Object.freeze(
        route.blockedExperts.map((selection) =>
          this.freezeSelection(selection),
        ),
      ),
      skippedExperts: Object.freeze(
        route.skippedExperts.map((selection) =>
          this.freezeSelection(selection),
        ),
      ),
    });
  }

  private freezeSelection(
    selection: CoachExpertSelection,
  ): CoachExpertSelection {
    return Object.freeze({
      expert: this.freezeExpert(selection.expert),
      role: selection.role,
      sequence: selection.sequence,
      reasonCodes: Object.freeze([...selection.reasonCodes]),
      ...(selection.sourceExpertId
        ? { sourceExpertId: selection.sourceExpertId }
        : {}),
    });
  }

  private freezePlanningStep(step: AgentPlanningStep): AgentPlanningStep {
    return Object.freeze({
      ...step,
      ...(step.metadata
        ? { metadata: Object.freeze({ ...step.metadata }) }
        : {}),
    });
  }
}
