import { LLMConfigurationError } from './ai-llm.errors';
import {
  OPENAI_PROVIDER_CAPABILITIES,
  resolveOpenAiCapabilities,
} from './openai-provider-capabilities';

describe('openai-provider-capabilities', () => {
  it('describes the supported OpenAI capability matrix', () => {
    expect(resolveOpenAiCapabilities('gpt-5.5')).toEqual(
      OPENAI_PROVIDER_CAPABILITIES,
    );
  });

  it('rejects unsupported model names', () => {
    expect(() => resolveOpenAiCapabilities('legacy-model')).toThrow(
      LLMConfigurationError,
    );
  });
});
