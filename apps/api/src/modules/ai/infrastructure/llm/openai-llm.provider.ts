import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

import {
  AiLlmGenerateReplyInput,
  AiLlmGenerateStreamReplyInput,
  AiLlmProvider,
  AiLlmProviderReply,
} from '../../application/services/llm/ai-llm.types';
import { AiLlmConfigService } from '../../application/services/llm/ai-llm-config.service';
import { OpenAiResponseParserService } from '../../application/services/llm/openai-response-parser.service';
import {
  LLMConfigurationError,
  LLMUnknownError,
} from '../../application/services/llm/ai-llm.errors';
import {
  resolveOpenAiCapabilities,
  normalizeOpenAiModelName,
} from '../../application/services/llm/openai-provider-capabilities';

type OpenAiResponseInputItem =
  | {
      type: 'message';
      role: 'user' | 'system' | 'developer';
      content: Array<{ type: 'input_text'; text: string }>;
    }
  | {
      id: string;
      type: 'message';
      role: 'assistant';
      status: 'completed';
      content: Array<{
        type: 'output_text';
        text: string;
        annotations: [];
      }>;
    };

type OpenAiResponseLike = {
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: unknown;
  incomplete_details?: unknown;
};

type OpenAiStreamEventLike = {
  type: string;
  delta?: string;
  text?: string;
  response?: OpenAiResponseLike;
  error?: unknown;
};

@Injectable()
export class OpenAiLlmProvider implements AiLlmProvider {
  constructor(
    private readonly config: AiLlmConfigService,
    private readonly responseParser: OpenAiResponseParserService,
  ) {}

  async generateReply(
    input: AiLlmGenerateReplyInput,
  ): Promise<AiLlmProviderReply> {
    const apiKey = this.config.getApiKey();

    if (!apiKey) {
      throw new LLMConfigurationError(
        'OPENAI_API_KEY is required when AI_LLM_ENABLED=true.',
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    const model = normalizeOpenAiModelName(input.model);
    const capabilities = resolveOpenAiCapabilities(model);

    if (!capabilities.structuredOutputs) {
      throw new LLMConfigurationError(
        `Structured outputs are not supported for model ${model}.`,
      );
    }

    const response = (await client.responses.create(
      this.buildRequest({
        model,
        messages: input.messages,
      }),
      input.signal ? { signal: input.signal } : undefined,
    )) as OpenAiResponseLike;

    const parsed = this.responseParser.parseResponse(response);

    if (!parsed.content) {
      throw new LLMUnknownError('OpenAI returned an empty reply.');
    }

    return parsed;
  }

  async streamReply(
    input: AiLlmGenerateStreamReplyInput,
  ): Promise<AiLlmProviderReply> {
    const apiKey = this.config.getApiKey();

    if (!apiKey) {
      throw new LLMConfigurationError(
        'OPENAI_API_KEY is required when AI_LLM_ENABLED=true.',
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    const model = normalizeOpenAiModelName(input.model);
    const capabilities = resolveOpenAiCapabilities(model);

    if (!capabilities.streaming) {
      throw new LLMConfigurationError(
        `Streaming is not supported for model ${model}.`,
      );
    }

    const responseStream = (await client.responses.create(
      this.buildRequest({
        model,
        messages: input.messages,
        stream: true,
      }),
      input.signal ? { signal: input.signal } : undefined,
    )) as AsyncIterable<OpenAiStreamEventLike>;

    let content = '';
    let completedResponse: OpenAiResponseLike | undefined;

    for await (const event of responseStream) {
      if (event.type === 'response.output_text.delta') {
        const delta = typeof event.delta === 'string' ? event.delta : '';

        if (delta) {
          content += delta;
          input.onDelta?.(delta);
        }
        continue;
      }

      if (event.type === 'response.output_text.done') {
        if (typeof event.text === 'string' && event.text.trim()) {
          content = event.text.trim();
        }
        continue;
      }

      if (event.type === 'response.completed') {
        completedResponse = event.response;
        continue;
      }

      if (event.type === 'response.failed' || event.type === 'response.error') {
        throw new LLMUnknownError(
          'OpenAI returned a failed streaming response.',
          event.error ?? completedResponse,
        );
      }

      if (event.type === 'response.incomplete') {
        throw new LLMUnknownError(
          'OpenAI returned an incomplete streaming response.',
          event.error ?? completedResponse,
        );
      }
    }

    const parsed = this.responseParser.parseResponse({
      output_text: completedResponse?.output_text ?? content,
      usage: completedResponse?.usage,
    });

    if (!parsed.content) {
      throw new LLMUnknownError('OpenAI returned an empty reply.');
    }

    return parsed;
  }

  private buildRequest(input: {
    model: string;
    messages: AiLlmGenerateReplyInput['messages'];
    stream?: boolean;
  }): {
    model: string;
    input: OpenAiResponseInputItem[];
    text: ReturnType<OpenAiResponseParserService['getResponseFormat']>;
    temperature: number;
    max_output_tokens: number;
    stream?: boolean;
  } {
    return {
      model: input.model,
      input: this.toResponseInput(input.messages),
      text: this.responseParser.getResponseFormat(),
      temperature: 0.2,
      max_output_tokens: this.config.getMaxCompletionTokens(),
      ...(input.stream ? { stream: true } : {}),
    };
  }

  private toResponseInput(
    messages: AiLlmGenerateReplyInput['messages'],
  ): OpenAiResponseInputItem[] {
    return messages.map((message, index) => {
      if (message.role === 'assistant') {
        return {
          id: `assistant-message-${index}`,
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              text: message.content,
              annotations: [],
            },
          ],
        };
      }

      return {
        type: 'message',
        role: message.role,
        content: [
          {
            type: 'input_text',
            text: message.content,
          },
        ],
      };
    });
  }
}
