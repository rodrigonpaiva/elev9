import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  AI_LLM_PROVIDER,
  AiLlmGenerateReplyResult,
  AiLlmProvider,
  AiLlmPrompt,
} from "./ai-llm.types";
import { AiLlmConfigService } from "./ai-llm-config.service";

@Injectable()
export class AiLlmService {
  private readonly logger = new Logger(AiLlmService.name);

  constructor(
    @Inject(AI_LLM_PROVIDER)
    private readonly provider: AiLlmProvider,
    private readonly config: AiLlmConfigService,
  ) {}

  async generateReply(
    prompt: AiLlmPrompt,
  ): Promise<AiLlmGenerateReplyResult | null> {
    if (!this.config.isEnabled()) {
      this.logger.log("llm disabled");
      return null;
    }

    const providerName = this.config.getProvider();

    this.logger.log(`llm enabled`);
    this.logger.log(`provider used: ${providerName}`);

    if (providerName !== "openai") {
      this.logger.warn(`provider "${providerName}" is not supported`);
      return null;
    }

    try {
      const content = await this.provider.generateReply({
        messages: prompt.messages,
        model: this.config.getModel(),
      });

      return {
        content,
        provider: providerName,
        model: this.config.getModel(),
        promptVersion: prompt.promptVersion,
      };
    } catch (error) {
      this.logger.warn(
        `provider failure: ${error instanceof Error ? error.message : "Unknown provider failure"}`,
      );
      throw error;
    }
  }
}
