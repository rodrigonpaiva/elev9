import { LLMConfigurationError } from './ai-llm.errors';
import { AiLlmProviderCapabilities } from './ai-llm.types';

const SUPPORTED_MODEL_PATTERN =
  /^(gpt-(?:4(?:\.\d+)?|4o|5(?:\.\d+)?)(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?|o[1-9](?:-[a-z0-9]+(?:-[a-z0-9]+)*)?|gpt-oss-\d+(?:b)?(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?)$/i;

export const OPENAI_PROVIDER_CAPABILITIES: AiLlmProviderCapabilities = {
  streaming: true,
  structuredOutputs: true,
  toolCalling: true,
  imageInput: true,
};

export function normalizeOpenAiModelName(model: string): string {
  return model.trim().toLowerCase();
}

export function isSupportedOpenAiModel(model: string): boolean {
  return SUPPORTED_MODEL_PATTERN.test(normalizeOpenAiModelName(model));
}

export function resolveOpenAiCapabilities(
  model: string,
): AiLlmProviderCapabilities {
  if (!isSupportedOpenAiModel(model)) {
    throw new LLMConfigurationError(
      `Unsupported OPENAI_MODEL value: ${model}.`,
    );
  }

  return OPENAI_PROVIDER_CAPABILITIES;
}
