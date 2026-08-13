import { Injectable } from '@nestjs/common';

import type { CoachExpertMetadata } from '../coach-expert.types';
import { CoachExpertRoutingPolicy } from './coach-expert-routing.policy';
import type {
  CoachExpertRoute,
  CoachExpertRoutingContext,
  CoachExpertRoutingDecision,
  CoachExpertRoutingReason,
  CoachExpertRoutingReasonCode,
  CoachExpertSelection,
} from './coach-expert-router.types';

@Injectable()
export class CoachExpertRouterService {
  constructor(private readonly policy: CoachExpertRoutingPolicy) {}

  route(input: CoachExpertRoutingContext): CoachExpertRoutingDecision {
    const candidateExperts = this.dedupeExperts(input.candidateExperts);
    const allowedExpertIds = new Set(
      input.policyEvaluation.decision.allowedExperts.map((expert) => expert.id),
    );
    const blockedExpertIds = new Set(
      input.policyEvaluation.decision.metadata.blockedExpertIds,
    );
    const allowedCandidates = candidateExperts.filter((expert) => {
      if (!expert.enabled) {
        return false;
      }

      if (allowedExpertIds.size === 0) {
        return input.policyEvaluation.decision.approved;
      }

      return allowedExpertIds.has(expert.id);
    });
    const blockedExperts = candidateExperts.filter((expert) => {
      if (!expert.enabled) {
        return true;
      }

      return (
        blockedExpertIds.has(expert.id) || !allowedExpertIds.has(expert.id)
      );
    });

    const skippedReasons = new Map<string, CoachExpertRoutingReasonCode[]>();
    const selectedSelections: CoachExpertSelection[] = [];
    const selectedIds = new Set<string>();

    const primaryExpert = this.policy.resolvePrimaryExpert(
      allowedCandidates,
      input.intent,
      input.selectedDomains,
    );

    if (primaryExpert) {
      selectedSelections.push(
        this.createSelection({
          expert: primaryExpert,
          role: 'PRIMARY',
          sequence: 0,
          reasonCodes: [this.resolvePrimaryReason(primaryExpert, input)],
        }),
      );
      selectedIds.add(primaryExpert.id);
    }

    const complementaryIds = primaryExpert
      ? this.policy.getComplementaryExpertIds(primaryExpert.id)
      : [];

    for (const expertId of complementaryIds) {
      const expert = this.findCandidate(allowedCandidates, expertId);

      if (!expert || selectedIds.has(expert.id)) {
        continue;
      }

      if (!this.canAddExpert(expert, selectedSelections, input.maxExperts)) {
        this.addSkipReason(skippedReasons, expert.id, 'MAX_EXPERT_LIMIT');
        continue;
      }

      if (!this.isCompatibleWithSelection(expert.id, selectedIds)) {
        this.addSkipReason(
          skippedReasons,
          expert.id,
          'NO_MATCHING_COMBINATION',
        );
        continue;
      }

      selectedSelections.push(
        this.createSelection({
          expert,
          role: 'COMPLEMENTARY',
          sequence: selectedSelections.length,
          reasonCodes: ['COMPLEMENTARY_RULE'],
          sourceExpertId: primaryExpert?.id,
        }),
      );
      selectedIds.add(expert.id);
    }

    const dependencyQueue = [
      ...selectedSelections.map((selection) => selection.expert),
    ];

    while (dependencyQueue.length > 0) {
      const current = dependencyQueue.shift();

      if (!current) {
        continue;
      }

      for (const dependencyId of this.policy.getDependencyExpertIds(
        current.id,
      )) {
        if (selectedIds.has(dependencyId)) {
          continue;
        }

        const dependency = this.findCandidate(allowedCandidates, dependencyId);

        if (!dependency) {
          continue;
        }

        if (
          !this.canAddExpert(dependency, selectedSelections, input.maxExperts)
        ) {
          this.addSkipReason(skippedReasons, dependency.id, 'MAX_EXPERT_LIMIT');
          continue;
        }

        if (!this.isCompatibleWithSelection(dependency.id, selectedIds)) {
          this.addSkipReason(
            skippedReasons,
            dependency.id,
            'NO_MATCHING_COMBINATION',
          );
          continue;
        }

        selectedSelections.push(
          this.createSelection({
            expert: dependency,
            role: 'DEPENDENCY',
            sequence: selectedSelections.length,
            reasonCodes: ['DEPENDENCY_RULE'],
            sourceExpertId: current.id,
          }),
        );
        selectedIds.add(dependency.id);
        dependencyQueue.push(dependency);
      }
    }

    const orderedSelections = this.orderSelections(selectedSelections);
    const validationIssues = this.validateRoute(
      orderedSelections,
      selectedSelections.length,
    );
    const routeValid = validationIssues.length === 0;
    const safeSelections = routeValid
      ? orderedSelections
      : primaryExpert
        ? orderedSelections.filter((selection) => selection.role === 'PRIMARY')
        : [];

    const primarySelection =
      safeSelections.find((selection) => selection.role === 'PRIMARY') ?? null;
    const complementarySelections = safeSelections.filter(
      (selection) => selection.role === 'COMPLEMENTARY',
    );
    const dependencySelections = safeSelections.filter(
      (selection) => selection.role === 'DEPENDENCY',
    );
    const orderedExperts = safeSelections.map((selection) => selection.expert);
    const blockedSelections = this.mapExpertsToSelections(
      blockedExperts,
      'DEPENDENCY',
    );
    const skippedSelections = this.mapSkippedExperts(
      candidateExperts,
      new Set(safeSelections.map((selection) => selection.expert.id)),
      blockedExpertIds,
      skippedReasons,
      input.maxExperts,
    );
    const primaryMetadata = primarySelection?.expert ?? null;
    const complementaryMetadata = complementarySelections.map(
      (selection) => selection.expert,
    );
    const blockedMetadata = blockedSelections.map(
      (selection) => selection.expert,
    );
    const skippedMetadata = skippedSelections.map(
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
    const confidence = this.policy.resolveConfidence({
      intent: input.intent,
      primaryExpert: primaryMetadata,
      orderedExperts,
      selectedDomains: input.selectedDomains,
      candidateExperts,
    });
    const route = this.freezeRoute({
      primaryExpert: primarySelection
        ? this.freezeSelection(primarySelection)
        : null,
      complementaryExperts: complementarySelections.map((selection) =>
        this.freezeSelection(selection),
      ),
      orderedExperts: safeSelections.map((selection) =>
        this.freezeSelection(selection),
      ),
      blockedExperts: blockedSelections.map((selection) =>
        this.freezeSelection(selection),
      ),
      skippedExperts: skippedSelections.map((selection) =>
        this.freezeSelection(selection),
      ),
    });
    const routingReasons = this.buildRoutingReasons({
      primarySelection,
      complementarySelections,
      dependencySelections,
      blockedSelections,
      skippedSelections,
      validationIssues,
      routeValid,
      confidence,
    });

    return Object.freeze({
      primaryExpert: primaryMetadata,
      complementaryExperts: Object.freeze(complementaryMetadata),
      orderedExperts: Object.freeze(orderedExperts),
      blockedExperts: Object.freeze(blockedMetadata),
      skippedExperts: Object.freeze(skippedMetadata),
      routingReasons: Object.freeze(routingReasons),
      estimatedCost,
      estimatedLatencyMs,
      confidence,
      route,
      metadata: Object.freeze({
        requestId: input.requestId,
        intent: input.intent,
        selectedDomains: Object.freeze([...input.selectedDomains]),
        candidateExpertIds: Object.freeze(
          candidateExperts.map((expert) => expert.id),
        ),
        allowedExpertIds: Object.freeze(
          allowedCandidates.map((expert) => expert.id),
        ),
        blockedExpertIds: Object.freeze(
          blockedMetadata.map((expert) => expert.id),
        ),
        skippedExpertIds: Object.freeze(
          skippedMetadata.map((expert) => expert.id),
        ),
        primaryExpertId: primaryMetadata?.id,
        complementaryExpertIds: Object.freeze(
          complementaryMetadata.map((expert) => expert.id),
        ),
        orderedExpertIds: Object.freeze(
          orderedExperts.map((expert) => expert.id),
        ),
        routeValid,
        validationIssues: Object.freeze([...validationIssues]),
        selectedExpertCount: orderedExperts.length,
        candidateExpertCount: candidateExperts.length,
        blockedExpertCount: blockedMetadata.length,
        skippedExpertCount: skippedMetadata.length,
        estimatedCost,
        estimatedLatencyMs,
        confidence,
        maxExperts: input.maxExperts,
        route,
      }),
    });
  }

  private createSelection(input: {
    expert: CoachExpertMetadata;
    role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY';
    sequence: number;
    reasonCodes: readonly CoachExpertRoutingReasonCode[];
    sourceExpertId?: string;
  }): CoachExpertSelection {
    return Object.freeze({
      expert: this.freezeExpert(input.expert),
      role: input.role,
      sequence: input.sequence,
      reasonCodes: Object.freeze([...input.reasonCodes]),
      ...(input.sourceExpertId ? { sourceExpertId: input.sourceExpertId } : {}),
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

  private mapExpertsToSelections(
    experts: readonly CoachExpertMetadata[],
    role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY',
  ): readonly CoachExpertSelection[] {
    return experts.map((expert, index) =>
      this.createSelection({
        expert,
        role,
        sequence: index,
        reasonCodes: ['POLICY_BLOCKED_EXPERT'],
      }),
    );
  }

  private mapSkippedExperts(
    candidates: readonly CoachExpertMetadata[],
    selectedIds: Set<string>,
    blockedExpertIds: Set<string>,
    skippedReasons: Map<string, CoachExpertRoutingReasonCode[]>,
    maxExperts: number,
  ): readonly CoachExpertSelection[] {
    const result: CoachExpertSelection[] = [];

    for (const candidate of candidates) {
      if (blockedExpertIds.has(candidate.id) || selectedIds.has(candidate.id)) {
        continue;
      }

      const reasonCodes =
        skippedReasons.get(candidate.id) ??
        (selectedIds.size >= maxExperts
          ? ['MAX_EXPERT_LIMIT']
          : ['INSUFFICIENT_EVIDENCE']);
      result.push(
        this.createSelection({
          expert: candidate,
          role: 'DEPENDENCY',
          sequence: result.length,
          reasonCodes,
        }),
      );
    }

    return result;
  }

  private addSkipReason(
    reasons: Map<string, CoachExpertRoutingReasonCode[]>,
    expertId: string,
    reason: CoachExpertRoutingReasonCode,
  ): void {
    const current = reasons.get(expertId) ?? [];
    current.push(reason);
    reasons.set(expertId, current);
  }

  private canAddExpert(
    expert: CoachExpertMetadata,
    selectedExperts: readonly CoachExpertSelection[],
    maxExperts: number,
  ): boolean {
    return (
      selectedExperts.length < maxExperts &&
      !selectedExperts.some((selection) => selection.expert.id === expert.id)
    );
  }

  private isCompatibleWithSelection(
    expertId: string,
    selectedExpertIds: Set<string>,
  ): boolean {
    for (const selectedExpertId of selectedExpertIds) {
      if (
        !this.policy.isCombinationAllowed(expertId, selectedExpertId) &&
        !this.policy.isCombinationAllowed(selectedExpertId, expertId)
      ) {
        return false;
      }
    }

    return true;
  }

  private orderSelections(
    selections: readonly CoachExpertSelection[],
  ): readonly CoachExpertSelection[] {
    const nodes = new Map<string, CoachExpertSelection>(
      selections.map((selection) => [selection.expert.id, selection]),
    );
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const selection of selections) {
      incoming.set(selection.expert.id, 0);
      adjacency.set(selection.expert.id, []);
    }

    for (const selection of selections) {
      for (const dependencyId of this.policy.getDependencyExpertIds(
        selection.expert.id,
      )) {
        if (!nodes.has(dependencyId)) {
          continue;
        }

        adjacency.get(dependencyId)?.push(selection.expert.id);
        incoming.set(
          selection.expert.id,
          (incoming.get(selection.expert.id) ?? 0) + 1,
        );
      }
    }

    const queue = [...selections]
      .filter((selection) => (incoming.get(selection.expert.id) ?? 0) === 0)
      .sort((left, right) => this.compareSelections(left, right));
    const ordered: CoachExpertSelection[] = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      ordered.push(current);

      for (const nextId of adjacency.get(current.expert.id) ?? []) {
        const nextIncoming = (incoming.get(nextId) ?? 0) - 1;
        incoming.set(nextId, nextIncoming);

        if (nextIncoming === 0) {
          const nextSelection = nodes.get(nextId);

          if (nextSelection) {
            queue.push(nextSelection);
            queue.sort((left, right) => this.compareSelections(left, right));
          }
        }
      }
    }

    return Object.freeze(ordered);
  }

  private validateRoute(
    selections: readonly CoachExpertSelection[],
    expectedSelectionCount: number,
  ): readonly string[] {
    const issues: string[] = [];
    const seen = new Set<string>();

    for (const selection of selections) {
      if (seen.has(selection.expert.id)) {
        issues.push(`Duplicate expert selected: ${selection.expert.id}`);
      }

      seen.add(selection.expert.id);
    }

    if (selections.length !== expectedSelectionCount) {
      issues.push('Detected unresolved dependency ordering conflict.');
    }

    if (this.hasCycle(selections)) {
      issues.push('Detected a cycle in expert dependencies.');
    }

    return issues;
  }

  private hasCycle(selections: readonly CoachExpertSelection[]): boolean {
    const selectedIds = new Set(
      selections.map((selection) => selection.expert.id),
    );
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (expertId: string): boolean => {
      if (visited.has(expertId)) {
        return false;
      }

      if (visiting.has(expertId)) {
        return true;
      }

      visiting.add(expertId);

      for (const dependencyId of this.policy.getDependencyExpertIds(expertId)) {
        if (!selectedIds.has(dependencyId)) {
          continue;
        }

        if (visit(dependencyId)) {
          return true;
        }
      }

      visiting.delete(expertId);
      visited.add(expertId);
      return false;
    };

    return selections.some((selection) => visit(selection.expert.id));
  }

  private buildRoutingReasons(input: {
    primarySelection: CoachExpertSelection | null;
    complementarySelections: readonly CoachExpertSelection[];
    dependencySelections: readonly CoachExpertSelection[];
    blockedSelections: readonly CoachExpertSelection[];
    skippedSelections: readonly CoachExpertSelection[];
    validationIssues: readonly string[];
    routeValid: boolean;
    confidence: string;
  }): readonly CoachExpertRoutingReason[] {
    const reasons: CoachExpertRoutingReason[] = [];

    if (input.primarySelection) {
      reasons.push({
        code: input.primarySelection.reasonCodes[0] ?? 'PRIMARY_SCORE_MATCH',
        expertId: input.primarySelection.expert.id,
      });
    } else {
      reasons.push({
        code: 'NO_PRIMARY_SELECTED',
        details: { confidence: input.confidence },
      });
    }

    for (const selection of input.complementarySelections) {
      reasons.push({
        code: 'COMPLEMENTARY_RULE',
        expertId: selection.expert.id,
        details: {
          sourceExpertId: selection.sourceExpertId,
        },
      });
    }

    for (const selection of input.dependencySelections) {
      reasons.push({
        code: 'DEPENDENCY_RULE',
        expertId: selection.expert.id,
        details: {
          sourceExpertId: selection.sourceExpertId,
        },
      });
    }

    for (const selection of input.blockedSelections) {
      reasons.push({
        code: 'POLICY_BLOCKED_EXPERT',
        expertId: selection.expert.id,
        details: {
          reasonCodes: selection.reasonCodes,
        },
      });
    }

    for (const selection of input.skippedSelections) {
      reasons.push({
        code: selection.reasonCodes[0] ?? 'INSUFFICIENT_EVIDENCE',
        expertId: selection.expert.id,
      });
    }

    if (!input.routeValid) {
      reasons.push({
        code: 'ROUTE_INVALID',
        details: {
          issues: input.validationIssues,
        },
      });
    }

    return reasons;
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
      result.push(this.freezeExpert(expert));
    }

    return Object.freeze(result);
  }

  private findCandidate(
    candidates: readonly CoachExpertMetadata[],
    expertId: string,
  ): CoachExpertMetadata | undefined {
    return candidates.find((candidate) => candidate.id === expertId);
  }

  private resolvePrimaryReason(
    expert: CoachExpertMetadata,
    input: CoachExpertRoutingContext,
  ): CoachExpertRoutingReasonCode {
    const directPrimary = this.policy.getPrimaryExpertId(input.intent);

    if (directPrimary === expert.id) {
      return 'PRIMARY_INTENT_MATCH';
    }

    if (expert.supportedIntents.includes(input.intent)) {
      return 'PRIMARY_CAPABILITY_MATCH';
    }

    const domainOverlap = expert.supportedDomains.filter((domain) =>
      input.selectedDomains.includes(domain),
    ).length;

    if (domainOverlap > 0) {
      return 'PRIMARY_DOMAIN_MATCH';
    }

    return 'PRIMARY_SCORE_MATCH';
  }

  private freezeExpert(expert: CoachExpertMetadata): CoachExpertMetadata {
    return Object.freeze({
      ...expert,
      supportedIntents: Object.freeze([...expert.supportedIntents]),
      supportedDomains: Object.freeze([...expert.supportedDomains]),
      capabilities: Object.freeze([...expert.capabilities]),
    });
  }

  private compareSelections(
    left: CoachExpertSelection,
    right: CoachExpertSelection,
  ): number {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }

    if (left.expert.priority !== right.expert.priority) {
      return right.expert.priority - left.expert.priority;
    }

    return left.expert.id.localeCompare(right.expert.id);
  }
}
