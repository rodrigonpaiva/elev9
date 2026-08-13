import { AgentContextSelectionPolicy } from './agent-context-selection.policy';
import { AgentPolicyRegistry } from './policies/agent-policy.registry';

describe('AgentContextSelectionPolicy', () => {
  const policy = new AgentContextSelectionPolicy(new AgentPolicyRegistry());

  it('maps general chat to the baseline context set', () => {
    expect(policy.selectDomains('GENERAL_CHAT')).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
    ]);
  });

  it('maps training to the expected focused context domains', () => {
    expect(policy.selectDomains('TRAINING')).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ]);
  });

  it('does not duplicate context domains', () => {
    const domains = policy.selectDomains('DASHBOARD');

    expect(new Set(domains).size).toBe(domains.length);
  });
});
