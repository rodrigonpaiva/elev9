import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiPromptRegistryService } from './ai-prompt-registry.service';

describe('AiPromptRegistryService', () => {
  it('resolves the configured active and previous prompt versions', () => {
    const service = new AiPromptRegistryService(mockConfig());

    expect(service.getCurrentVersion('coach-chat')).toBe(
      'coach-chat-prompt-v1',
    );
    expect(service.getPreviousVersion('coach-chat')).toBe(
      'coach-chat-prompt-v0',
    );
    expect(service.getVersionMetadata('coach-chat')).toMatchObject({
      promptId: 'coach-chat',
      version: 'coach-chat-prompt-v1',
      status: 'active',
    });
  });

  it('falls back to the active prompt version when the requested version is unknown', () => {
    const service = new AiPromptRegistryService(mockConfig());

    expect(
      service.resolvePromptVersion('coach-chat', 'coach-chat-prompt-unknown'),
    ).toBe('coach-chat-prompt-v1');
  });
});

function mockConfig(): AiLlmConfigService {
  return {
    getPromptVersion: jest.fn().mockReturnValue('coach-chat-prompt-v1'),
    getPreviousPromptVersion: jest.fn().mockReturnValue('coach-chat-prompt-v0'),
  } as unknown as AiLlmConfigService;
}
