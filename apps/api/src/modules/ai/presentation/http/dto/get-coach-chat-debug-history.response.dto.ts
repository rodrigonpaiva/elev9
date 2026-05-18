export type GetCoachChatDebugHistoryResponseDto = {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    metadata?: {
      source?: "heuristic" | "llm";
      provider?: string;
      model?: string;
      promptVersion?: string;
    };
  }>;
};
