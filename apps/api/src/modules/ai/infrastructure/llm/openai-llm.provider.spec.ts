import OpenAI from 'openai';

import { AiLlmConfigService } from '../../application/services/llm/ai-llm-config.service';
import { OpenAiResponseParserService } from '../../application/services/llm/openai-response-parser.service';
import { OpenAiLlmProvider } from './openai-llm.provider';
import {
  LLMConfigurationError,
  LLMUnknownError,
} from '../../application/services/llm/ai-llm.errors';

const responsesCreateMock = jest.fn();

jest.mock('openai');

describe('OpenAiLlmProvider', () => {
  beforeEach(() => {
    responsesCreateMock.mockReset();
    jest.mocked(OpenAI).mockImplementation(
      () =>
        ({
          responses: {
            create: responsesCreateMock,
          },
        }) as never,
    );
  });

  it('returns the structured reply from OpenAI Responses API', async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        assistantText: 'Keep the session lighter today.',
      }),
      usage: {
        input_tokens: 120,
        output_tokens: 24,
        total_tokens: 144,
      },
    });
    const config = mockConfig();
    const provider = new OpenAiLlmProvider(
      config,
      new OpenAiResponseParserService(),
    );
    const signal = new AbortController().signal;

    const result = await provider.generateReply({
      model: 'gpt-5.5',
      signal,
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
    expect(responsesCreateMock).toHaveBeenCalledWith(
      {
        model: 'gpt-5.5',
        input: [
          {
            type: 'message',
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'Be concise.',
              },
            ],
          },
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Should I train today?',
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'elev9_coach_reply',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['assistantText'],
              properties: {
                assistantText: {
                  type: 'string',
                  minLength: 1,
                },
              },
            },
          },
        },
        temperature: 0.2,
      },
      {
        signal,
      },
    );
    expect(result).toEqual({
      content: 'Keep the session lighter today.',
      usage: {
        promptTokens: 120,
        completionTokens: 24,
        totalTokens: 144,
      },
    });
  });

  it('streams deltas and returns the structured final reply', async () => {
    responsesCreateMock.mockResolvedValue(
      mockResponseStream([
        {
          type: 'response.output_text.delta',
          delta: '{"assistantText":"Keep',
        },
        {
          type: 'response.output_text.delta',
          delta: ' the session lighter today."}',
        },
        {
          type: 'response.output_text.done',
          text: '{"assistantText":"Keep the session lighter today."}',
        },
        {
          type: 'response.completed',
          response: {
            output_text: '{"assistantText":"Keep the session lighter today."}',
            usage: {
              input_tokens: 120,
              output_tokens: 24,
              total_tokens: 144,
            },
          },
        },
      ]),
    );
    const config = mockConfig();
    const provider = new OpenAiLlmProvider(
      config,
      new OpenAiResponseParserService(),
    );
    const onDelta = jest.fn();

    const result = await provider.streamReply({
      model: 'gpt-5.5',
      onDelta,
      messages: [
        {
          role: 'user',
          content: 'Should I train today?',
        },
      ],
    });

    expect(onDelta).toHaveBeenCalled();
    expect(result).toEqual({
      content: 'Keep the session lighter today.',
      usage: {
        promptTokens: 120,
        completionTokens: 24,
        totalTokens: 144,
      },
    });
    expect(responsesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.5',
        stream: true,
      }),
      undefined,
    );
  });

  it('rejects malformed structured outputs', async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: 'not-json',
    });
    const config = mockConfig();
    const provider = new OpenAiLlmProvider(
      config,
      new OpenAiResponseParserService(),
    );

    await expect(
      provider.generateReply({
        model: 'gpt-5.5',
        messages: [
          {
            role: 'user',
            content: 'Should I train today?',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(LLMUnknownError);
  });

  it('rejects unsupported models', async () => {
    const config = mockConfig();
    const provider = new OpenAiLlmProvider(
      config,
      new OpenAiResponseParserService(),
    );

    await expect(
      provider.generateReply({
        model: 'unsupported-model',
        messages: [
          {
            role: 'user',
            content: 'Should I train today?',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(LLMConfigurationError);
  });
});

function mockConfig(): AiLlmConfigService {
  return {
    isEnabled: jest.fn().mockReturnValue(true),
    getProvider: jest.fn().mockReturnValue('openai'),
    getModel: jest.fn().mockReturnValue('gpt-5.5'),
    getApiKey: jest.fn().mockReturnValue('test-openai-key'),
  } as unknown as AiLlmConfigService;
}

function mockResponseStream(events: Array<Record<string, unknown>>) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event as never;
      }
    },
  };
}
