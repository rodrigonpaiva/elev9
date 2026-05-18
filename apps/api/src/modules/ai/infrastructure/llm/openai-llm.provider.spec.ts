import OpenAI from 'openai';

import { AiLlmConfigService } from '../../application/services/llm/ai-llm-config.service';
import { OpenAiLlmProvider } from './openai-llm.provider';

const chatCompletionsCreateMock = jest.fn();

jest.mock('openai');

describe('OpenAiLlmProvider', () => {
  beforeEach(() => {
    chatCompletionsCreateMock.mockReset();
    jest.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: chatCompletionsCreateMock,
            },
          },
        }) as never,
    );
  });

  it('returns the model reply from OpenAI', async () => {
    chatCompletionsCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Keep the session lighter today.',
          },
        },
      ],
    });
    const config = mockConfig();
    const provider = new OpenAiLlmProvider(config);

    const result = await provider.generateReply({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Be concise.',
        },
        {
          role: 'user',
          content: 'Should I train today?',
        },
      ],
    });

    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'test-openai-key',
    });
    expect(chatCompletionsCreateMock).toHaveBeenCalledWith({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Be concise.',
        },
        {
          role: 'user',
          content: 'Should I train today?',
        },
      ],
      temperature: 0.2,
    });
    expect(result).toBe('Keep the session lighter today.');
  });
});

function mockConfig(): AiLlmConfigService {
  return {
    isEnabled: jest.fn().mockReturnValue(true),
    getProvider: jest.fn().mockReturnValue('openai'),
    getModel: jest.fn().mockReturnValue('gpt-4.1-mini'),
    getApiKey: jest.fn().mockReturnValue('test-openai-key'),
  } as unknown as AiLlmConfigService;
}
