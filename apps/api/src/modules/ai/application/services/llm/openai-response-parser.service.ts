import { Injectable } from '@nestjs/common';

import { LLMConfigurationError, LLMUnknownError } from './ai-llm.errors';
import { AiLlmProviderReply, AiLlmTokenUsage } from './ai-llm.types';

type OpenAiStructuredCoachReply = {
  assistantText: string;
};

type OpenAiResponseUsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponseLike = {
  output_text?: string;
  usage?: OpenAiResponseUsageLike;
  error?: unknown;
  incomplete_details?: unknown;
};

const COACH_REPLY_JSON_SCHEMA = {
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
} as const;

@Injectable()
export class OpenAiResponseParserService {
  getResponseFormat() {
    this.validateStructuredOutputSchema(COACH_REPLY_JSON_SCHEMA);

    return {
      format: COACH_REPLY_JSON_SCHEMA,
    };
  }

  parseResponse(response: OpenAiResponseLike): AiLlmProviderReply {
    if (response.error) {
      throw new LLMUnknownError(
        'OpenAI returned an error response.',
        response.error,
      );
    }

    if (response.incomplete_details) {
      throw new LLMUnknownError(
        'OpenAI returned an incomplete response.',
        response.incomplete_details,
      );
    }

    const rawText =
      typeof response.output_text === 'string'
        ? response.output_text.trim()
        : '';

    if (!rawText) {
      throw new LLMUnknownError('OpenAI returned an empty response.');
    }

    const content = this.extractAssistantText(rawText);
    const usage = this.normalizeUsage(response.usage);

    return {
      content,
      ...(usage ? { usage } : {}),
    };
  }

  private extractAssistantText(rawText: string): string {
    const parsed = this.parseStructuredPayload(rawText);
    const assistantText =
      typeof parsed.assistantText === 'string'
        ? parsed.assistantText.trim()
        : '';

    if (!assistantText) {
      throw new LLMUnknownError(
        'OpenAI returned a malformed structured response.',
      );
    }

    return assistantText;
  }

  private parseStructuredPayload(rawText: string): OpenAiStructuredCoachReply {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new LLMUnknownError(
        'OpenAI returned invalid structured output.',
        error,
      );
    }

    if (!this.isStructuredCoachReply(parsed)) {
      throw new LLMUnknownError(
        'OpenAI returned an invalid structured payload.',
      );
    }

    return parsed;
  }

  private normalizeUsage(
    usage?: OpenAiResponseUsageLike,
  ): AiLlmTokenUsage | undefined {
    if (!usage) {
      return undefined;
    }

    return {
      promptTokens:
        typeof usage.input_tokens === 'number' ? usage.input_tokens : 'unknown',
      completionTokens:
        typeof usage.output_tokens === 'number'
          ? usage.output_tokens
          : 'unknown',
      totalTokens:
        typeof usage.total_tokens === 'number' ? usage.total_tokens : 'unknown',
    };
  }

  private isStructuredCoachReply(
    value: unknown,
  ): value is OpenAiStructuredCoachReply {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);

    return (
      keys.length === 1 &&
      typeof record.assistantText === 'string' &&
      record.assistantText.trim().length > 0
    );
  }

  private validateStructuredOutputSchema(schema: unknown): void {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }

    const record = schema as Record<string, unknown>;

    if (
      record.type !== 'json_schema' ||
      record.strict !== true ||
      typeof record.name !== 'string' ||
      record.name.trim() === ''
    ) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }

    const nestedSchema = record.schema;

    if (
      !nestedSchema ||
      typeof nestedSchema !== 'object' ||
      Array.isArray(nestedSchema)
    ) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }

    const nestedRecord = nestedSchema as Record<string, unknown>;

    if (
      nestedRecord.type !== 'object' ||
      nestedRecord.additionalProperties !== false
    ) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }

    const properties = nestedRecord.properties;

    if (
      !properties ||
      typeof properties !== 'object' ||
      Array.isArray(properties)
    ) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }

    const assistantText = (properties as Record<string, unknown>)
      .assistantText as Record<string, unknown> | undefined;

    if (
      !assistantText ||
      assistantText.type !== 'string' ||
      assistantText.minLength !== 1
    ) {
      throw new LLMConfigurationError(
        'Invalid structured output schema configuration.',
      );
    }
  }
}
