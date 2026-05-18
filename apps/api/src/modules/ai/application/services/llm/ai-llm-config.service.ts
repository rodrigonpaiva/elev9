import { Injectable } from "@nestjs/common";

@Injectable()
export class AiLlmConfigService {
  isEnabled(): boolean {
    return this.readBoolean("AI_LLM_ENABLED");
  }

  getProvider(): string {
    return this.readString("AI_LLM_PROVIDER", "openai").toLowerCase();
  }

  getModel(): string {
    return this.readString("OPENAI_MODEL", "gpt-4.1-mini");
  }

  getApiKey(): string {
    return this.readString("OPENAI_API_KEY", "");
  }

  private readBoolean(key: string): boolean {
    return this.readString(key, "").toLowerCase() === "true";
  }

  private readString(key: string, fallback: string): string {
    const value = process.env[key];

    if (typeof value !== "string") {
      return fallback;
    }

    return value.trim() || fallback;
  }
}
