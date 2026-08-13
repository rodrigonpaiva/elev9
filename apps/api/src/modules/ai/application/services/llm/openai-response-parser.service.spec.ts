import { LLMConfigurationError, LLMUnknownError } from './ai-llm.errors';
import { OpenAiResponseParserService } from './openai-response-parser.service';

describe('OpenAiResponseParserService', () => {
  it('parses structured output into assistant text', () => {
    const parser = new OpenAiResponseParserService();

    const result = parser.parseResponse({
      output_text: JSON.stringify({
        assistantText: 'Keep it lighter today.',
      }),
      usage: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22,
      },
    });

    expect(result).toEqual({
      content: 'Keep it lighter today.',
      usage: {
        promptTokens: 10,
        completionTokens: 12,
        totalTokens: 22,
      },
    });
  });

  it('rejects malformed structured payloads', () => {
    const parser = new OpenAiResponseParserService();

    expect(() =>
      parser.parseResponse({
        output_text: JSON.stringify({
          assistantText: '',
        }),
      }),
    ).toThrow(LLMUnknownError);
  });

  it('rejects invalid response format configuration', () => {
    const parser = new OpenAiResponseParserService();

    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parser as any).validateStructuredOutputSchema({
        type: 'text',
        strict: true,
        name: 'bad',
      }),
    ).toThrow(LLMConfigurationError);
  });
});
