import { Injectable } from '@nestjs/common';

import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { LLMConfigurationError } from '../llm/ai-llm.errors';
import {
  AI_COACH_CHAT_PROMPT_ID,
  AiPromptRegistryEntry,
  AiPromptVersionMetadata,
} from './ai-governance.types';

const COACH_CHAT_PROMPT_VERSIONS: AiPromptVersionMetadata[] = [
  {
    promptId: AI_COACH_CHAT_PROMPT_ID,
    version: 'coach-chat-prompt-v1',
    releaseDate: '2026-06-29T00:00:00.000Z',
    status: 'active',
    author: 'Elev9 Platform',
    description: 'Primary adaptive coach chat prompt.',
  },
  {
    promptId: AI_COACH_CHAT_PROMPT_ID,
    version: 'coach-chat-prompt-v0',
    releaseDate: '2026-05-15T00:00:00.000Z',
    status: 'previous',
    author: 'Elev9 Platform',
    description: 'Previous coach chat prompt retained for rollback.',
  },
];

const COACH_CHAT_PROMPT_REGISTRY: AiPromptRegistryEntry = {
  promptId: AI_COACH_CHAT_PROMPT_ID,
  currentActiveVersion: 'coach-chat-prompt-v1',
  previousVersion: 'coach-chat-prompt-v0',
  versions: COACH_CHAT_PROMPT_VERSIONS,
};

@Injectable()
export class AiPromptRegistryService {
  constructor(
    private readonly config: AiLlmConfigService = new AiLlmConfigService(),
  ) {
    this.validateVersion(this.config.getPromptVersion());
    this.validateVersion(this.config.getPreviousPromptVersion());
  }

  listPrompts(): AiPromptRegistryEntry[] {
    return [this.resolveCoachChatEntry()];
  }

  getPrompt(promptId: string): AiPromptRegistryEntry | undefined {
    if (promptId !== AI_COACH_CHAT_PROMPT_ID) {
      return undefined;
    }

    return this.resolveCoachChatEntry();
  }

  getCurrentVersion(promptId: string): string {
    return this.getPrompt(promptId)?.currentActiveVersion ?? '';
  }

  getPreviousVersion(promptId: string): string | undefined {
    return this.getPrompt(promptId)?.previousVersion;
  }

  getVersionMetadata(
    promptId: string,
    version?: string,
  ): AiPromptVersionMetadata | undefined {
    const prompt = this.getPrompt(promptId);

    if (!prompt) {
      return undefined;
    }

    const activeVersion = version ?? prompt.currentActiveVersion;

    return prompt.versions.find(
      (candidate) => candidate.version === activeVersion,
    );
  }

  resolvePromptVersion(promptId: string, requestedVersion?: string): string {
    const prompt = this.getPrompt(promptId);

    if (!prompt) {
      return requestedVersion ?? '';
    }

    if (requestedVersion) {
      const found = prompt.versions.some(
        (candidate) => candidate.version === requestedVersion,
      );

      if (found) {
        return requestedVersion;
      }
    }

    return prompt.currentActiveVersion;
  }

  private resolveCoachChatEntry(): AiPromptRegistryEntry {
    const currentActiveVersion = this.config.getPromptVersion();
    const previousVersion = this.config.getPreviousPromptVersion();
    const versions = COACH_CHAT_PROMPT_VERSIONS.map((version) => ({
      ...version,
      status:
        version.version === currentActiveVersion
          ? 'active'
          : version.version === previousVersion
            ? 'previous'
            : version.status,
    }));

    return {
      ...COACH_CHAT_PROMPT_REGISTRY,
      currentActiveVersion,
      previousVersion,
      versions,
    };
  }

  private validateVersion(version: string): void {
    const exists = COACH_CHAT_PROMPT_VERSIONS.some(
      (candidate) => candidate.version === version,
    );

    if (!exists) {
      throw new LLMConfigurationError(
        `Unsupported AI prompt version value: ${version}.`,
      );
    }
  }
}
