import { Injectable } from '@nestjs/common';

import { AgentPolicyRegistry } from './policies/agent-policy.registry';
import type { AgentContextDomain, AgentIntent } from './agent.types';

@Injectable()
export class AgentContextSelectionPolicy {
  constructor(private readonly registry: AgentPolicyRegistry) {}

  selectDomains(intent: AgentIntent): AgentContextDomain[] {
    return this.dedupe([...this.registry.getAllowedContextDomains(intent)]);
  }

  private dedupe(domains: AgentContextDomain[]): AgentContextDomain[] {
    return [...new Set(domains)];
  }
}
