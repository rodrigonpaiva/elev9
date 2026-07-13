import { Injectable } from '@nestjs/common';

import type { AgentContextDomain, AgentIntent } from '../agent.types';
import type { CoachExpert, CoachExpertCapability } from './coach-expert.types';
import { GoalExpert } from './goal-expert';
import { HabitExpert } from './habit-expert';
import { MotivationExpert } from './motivation-expert';
import { NutritionExpert } from './nutrition-expert';
import { ProgressExpert } from './progress-expert';
import { RecoveryExpert } from './recovery-expert';
import { WorkoutExpert } from './workout-expert';

const DEFAULT_COACH_EXPERTS: readonly CoachExpert[] = Object.freeze([
  new WorkoutExpert(),
  new NutritionExpert(),
  new RecoveryExpert(),
  new GoalExpert(),
  new HabitExpert(),
  new ProgressExpert(),
  new MotivationExpert(),
]);

@Injectable()
export class CoachExpertRegistry {
  private readonly experts = new Map<string, CoachExpert>();

  constructor(initialExperts: readonly CoachExpert[] = DEFAULT_COACH_EXPERTS) {
    this.registerExperts(...initialExperts);
  }

  registerExpert(expert: CoachExpert): void {
    if (this.experts.has(expert.metadata.id)) {
      throw new Error(
        `Duplicate coach expert id detected: ${expert.metadata.id}`,
      );
    }

    this.experts.set(expert.metadata.id, expert);
  }

  registerExperts(...experts: readonly CoachExpert[]): void {
    for (const expert of experts) {
      this.registerExpert(expert);
    }
  }

  listExperts(): readonly CoachExpert[] {
    return this.freezeExperts([...this.experts.values()]);
  }

  getExpert(id: string): CoachExpert | undefined {
    return this.experts.get(id);
  }

  getEnabledExperts(): readonly CoachExpert[] {
    return this.freezeExperts(
      [...this.experts.values()].filter((expert) => expert.metadata.enabled),
    );
  }

  getExpertsForIntent(intent: AgentIntent): readonly CoachExpert[] {
    return this.freezeExperts(
      [...this.experts.values()].filter((expert) =>
        expert.supports({ intent }),
      ),
    );
  }

  getExpertsForCapability(
    capability: CoachExpertCapability,
  ): readonly CoachExpert[] {
    return this.freezeExperts(
      [...this.experts.values()].filter((expert) =>
        expert.supports({ capability }),
      ),
    );
  }

  getExpertsForDomain(domain: AgentContextDomain): readonly CoachExpert[] {
    return this.freezeExperts(
      [...this.experts.values()].filter((expert) =>
        expert.supports({ selectedDomains: [domain] }),
      ),
    );
  }

  getExpertsForDomains(
    domains: readonly AgentContextDomain[],
  ): readonly CoachExpert[] {
    const seen = new Set<string>();
    const experts: CoachExpert[] = [];

    for (const domain of domains) {
      for (const expert of this.getExpertsForDomain(domain)) {
        if (seen.has(expert.metadata.id)) {
          continue;
        }

        seen.add(expert.metadata.id);
        experts.push(expert);
      }
    }

    return this.freezeExperts(experts);
  }

  private freezeExperts(
    experts: readonly CoachExpert[],
  ): readonly CoachExpert[] {
    return Object.freeze(
      [...experts].sort((left, right) => {
        if (left.metadata.priority !== right.metadata.priority) {
          return right.metadata.priority - left.metadata.priority;
        }

        return left.metadata.id.localeCompare(right.metadata.id);
      }),
    );
  }
}
