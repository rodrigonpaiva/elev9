import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import {
  AI_COACH_CHAT_PROMPT_ID,
  AiRolloutAssignment,
} from './ai-governance.types';
import { AiPromptRegistryService } from './ai-prompt-registry.service';

@Injectable()
export class AiRolloutService {
  constructor(
    private readonly config: AiLlmConfigService = new AiLlmConfigService(),
    private readonly promptRegistry: AiPromptRegistryService = new AiPromptRegistryService(),
  ) {}

  resolveCoachChatAssignment(input: {
    userIdHash?: string;
    userId?: string;
    authUserId?: string;
    promptId?: string;
  }): AiRolloutAssignment {
    const promptId = input.promptId ?? AI_COACH_CHAT_PROMPT_ID;
    const currentPromptVersion =
      this.promptRegistry.getCurrentVersion(promptId) ||
      this.config.getPromptVersion();
    const previousPromptVersion =
      this.promptRegistry.getPreviousVersion(promptId) ??
      this.config.getPreviousPromptVersion();
    const currentProvider = this.config.getProvider();
    const previousProvider =
      this.config.getPreviousProvider() ?? currentProvider;
    const currentModel = this.config.getModel();
    const previousModel = this.config.getPreviousModel() ?? currentModel;
    const canaryPercentage = this.config.getCanaryPercentage();
    const canaryBucket = this.resolveCanaryBucket(
      input.userIdHash ?? input.userId ?? input.authUserId,
    );
    const useCurrent =
      canaryBucket < canaryPercentage || !previousPromptVersion;
    const selectedPromptVersion = useCurrent
      ? currentPromptVersion
      : previousPromptVersion;
    const selectedProvider = useCurrent ? currentProvider : previousProvider;
    const selectedModel = useCurrent ? currentModel : previousModel;

    return {
      experimentId: this.config.getExperimentId(),
      promptId,
      currentPromptVersion,
      previousPromptVersion,
      selectedPromptVersion,
      currentProvider,
      previousProvider,
      selectedProvider,
      currentModel,
      previousModel,
      selectedModel,
      canaryBucket,
      canaryPercentage,
      streamingEnabled: this.config.isStreamingEnabled(),
      structuredOutputsEnabled: this.config.isStructuredOutputsEnabled(),
      toolCallingEnabled: this.config.isToolCallingEnabled(),
      futureMemoryEnabled: this.config.isFutureMemoryEnabled(),
      rolloutVariant: useCurrent ? 'current' : 'previous',
    };
  }

  private resolveCanaryBucket(
    userIdentifier?: string,
  ): AiRolloutAssignment['canaryBucket'] {
    const normalized =
      typeof userIdentifier === 'string' ? userIdentifier.trim() : '';

    if (!normalized) {
      return 0;
    }

    const hash = createHash('sha256').update(normalized).digest('hex');
    const value = Number.parseInt(hash.slice(0, 8), 16);

    return Number.isFinite(value) ? value % 100 : 0;
  }
}
