import { AiLlmConfigService } from "./ai-llm-config.service";
import { AiLlmProvider } from "./ai-llm.types";
import { AiLlmService } from "./ai-llm.service";

describe("AiLlmService", () => {
  it("returns null when LLM is disabled", async () => {
    const provider = mockProvider();
    const config = mockConfig({
      enabled: false,
    });
    const service = new AiLlmService(provider, config);

    const result = await service.generateReply({
      promptVersion: "coach-chat-prompt-v1",
      messages: [{ role: "user", content: "Should I train today?" }],
    });

    expect(result).toBeNull();
    expect(provider.generateReply).not.toHaveBeenCalled();
  });

  it("delegates to the provider when enabled", async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockResolvedValue("Keep it light today."),
    });
    const config = mockConfig({
      enabled: true,
      provider: "openai",
      model: "gpt-4.1-mini",
    });
    const service = new AiLlmService(provider, config);

    const result = await service.generateReply({
      promptVersion: "coach-chat-prompt-v1",
      messages: [{ role: "user", content: "Should I train today?" }],
    });

    expect(provider.generateReply).toHaveBeenCalledWith({
      messages: [{ role: "user", content: "Should I train today?" }],
      model: "gpt-4.1-mini",
    });
    expect(result).toEqual({
      content: "Keep it light today.",
      provider: "openai",
      model: "gpt-4.1-mini",
      promptVersion: "coach-chat-prompt-v1",
    });
  });

  it("throws when the provider fails so the caller can fallback", async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockRejectedValue(new Error("OpenAI is down")),
    });
    const config = mockConfig({
      enabled: true,
      provider: "openai",
    });
    const service = new AiLlmService(provider, config);

    await expect(
      service.generateReply({
        promptVersion: "coach-chat-prompt-v1",
        messages: [{ role: "user", content: "Should I train today?" }],
      }),
    ).rejects.toThrow("OpenAI is down");
  });
});

function mockProvider(
  overrides: Partial<AiLlmProvider> = {},
): jest.Mocked<AiLlmProvider> {
  return {
    generateReply: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AiLlmProvider>;
}

function mockConfig(
  overrides: Partial<{
    enabled: boolean;
    provider: string;
    model: string;
    apiKey: string;
  }> = {},
): AiLlmConfigService {
  return {
    isEnabled: jest.fn().mockReturnValue(overrides.enabled ?? true),
    getProvider: jest
      .fn()
      .mockReturnValue(overrides.provider ?? "openai"),
    getModel: jest.fn().mockReturnValue(overrides.model ?? "gpt-4.1-mini"),
    getApiKey: jest.fn().mockReturnValue(overrides.apiKey ?? "test-openai-key"),
  } as unknown as AiLlmConfigService;
}
