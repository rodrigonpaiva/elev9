import { AgentIntentClassifierService } from './agent-intent-classifier.service';

describe('AgentIntentClassifierService', () => {
  const service = new AgentIntentClassifierService();

  it('classifies training intent deterministically', () => {
    const result = service.classify({
      userMessage: 'Should I train today after work?',
    });

    expect(result.intent).toBe('TRAINING');
    expect(result.matchedPattern).toBe('train');
  });

  it('falls back to general chat when no specific intent matches', () => {
    const result = service.classify({
      userMessage: 'Hey coach, what do you think?',
    });

    expect(result.intent).toBe('GENERAL_CHAT');
  });

  it('classifies unknown intent for low-signal input', () => {
    const result = service.classify({
      userMessage: '???',
    });

    expect(result.intent).toBe('UNKNOWN');
  });
});
