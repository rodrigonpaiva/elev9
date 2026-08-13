import { Injectable } from '@nestjs/common';

import type { AgentContextDomain, AgentIntent } from '../agent.types';
import type { AgentPolicy, AgentPolicyCategory } from './agent-policy.types';

const POLICY_VERSION = '1.0.0';

const BASE_CONTEXT_DOMAINS: readonly AgentContextDomain[] = [
  'user_profile',
  'conversation_memory',
  'recent_messages',
  'coach_decision',
];

const CONTEXT_POLICY: Record<AgentIntent, readonly AgentContextDomain[]> = {
  GENERAL_CHAT: [],
  TRAINING: ['training', 'recovery', 'goals', 'progress'],
  NUTRITION: ['nutrition', 'goals', 'recovery'],
  RECOVERY: ['recovery', 'goals'],
  GOALS: ['goals', 'progress', 'training'],
  HABITS: ['habits', 'progress'],
  PERSONALIZATION: ['personalization', 'habits'],
  PROGRESS: ['progress', 'goals', 'training'],
  DASHBOARD: ['health', 'progress', 'goals', 'notifications'],
  MOTIVATION: ['goals', 'progress', 'training', 'recovery'],
  PLANNING: ['goals', 'training', 'recovery', 'progress'],
  UNKNOWN: [],
};

const POLICY_DESCRIPTORS: readonly AgentPolicy[] = [
  {
    id: 'context-authorization',
    category: 'CONTEXT',
    displayName: 'Context Authorization Policy',
    description:
      'Determines which context domains may be loaded for an agent request.',
    version: POLICY_VERSION,
  },
  {
    id: 'tool-authorization',
    category: 'TOOL',
    displayName: 'Tool Authorization Policy',
    description:
      'Determines which tools may be selected for bounded internal execution.',
    version: POLICY_VERSION,
  },
  {
    id: 'llm-authorization',
    category: 'LLM',
    displayName: 'LLM Authorization Policy',
    description:
      'Determines when deterministic fallback must replace provider-backed generation.',
    version: POLICY_VERSION,
  },
  {
    id: 'safety-enforcement',
    category: 'SAFETY',
    displayName: 'Safety Enforcement Policy',
    description:
      'Consumes the existing safety layer result without duplicating guardrail logic.',
    version: POLICY_VERSION,
  },
  {
    id: 'cost-limits',
    category: 'COST',
    displayName: 'Cost Limits Policy',
    description:
      'Rejects executions that exceed deterministic cost and latency thresholds.',
    version: POLICY_VERSION,
  },
  {
    id: 'memory-governance',
    category: 'MEMORY',
    displayName: 'Memory Governance Policy',
    description:
      'Controls when working, session, and conversation memory may be updated.',
    version: POLICY_VERSION,
  },
];

@Injectable()
export class AgentPolicyRegistry {
  listPolicies(): readonly AgentPolicy[] {
    return POLICY_DESCRIPTORS;
  }

  getBaseContextDomains(): readonly AgentContextDomain[] {
    return BASE_CONTEXT_DOMAINS;
  }

  getAllowedContextDomains(intent: AgentIntent): readonly AgentContextDomain[] {
    return [...BASE_CONTEXT_DOMAINS, ...(CONTEXT_POLICY[intent] ?? [])];
  }

  getPoliciesByCategory(category: AgentPolicyCategory): readonly AgentPolicy[] {
    return POLICY_DESCRIPTORS.filter((policy) => policy.category === category);
  }

  hasPolicy(category: AgentPolicyCategory, policyId: string): boolean {
    return this.getPoliciesByCategory(category).some(
      (policy) => policy.id === policyId,
    );
  }
}
