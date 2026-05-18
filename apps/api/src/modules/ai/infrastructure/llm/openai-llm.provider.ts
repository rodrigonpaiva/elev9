import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

import {
  AiLlmGenerateReplyInput,
  AiLlmProvider,
} from "../../application/services/llm/ai-llm.types";
import { AiLlmConfigService } from "../../application/services/llm/ai-llm-config.service";

@Injectable()
export class OpenAiLlmProvider implements AiLlmProvider {
  constructor(private readonly config: AiLlmConfigService) {}

  async generateReply(input: AiLlmGenerateReplyInput): Promise<string> {
    const apiKey = this.config.getApiKey();

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when AI_LLM_ENABLED=true.");
    }

    const client = new OpenAI({
      apiKey,
    });

    const completion = await client.chat.completions.create({
      model: input.model,
      messages: input.messages as Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }>,
      temperature: 0.2,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("OpenAI returned an empty reply.");
    }

    return reply;
  }
}
