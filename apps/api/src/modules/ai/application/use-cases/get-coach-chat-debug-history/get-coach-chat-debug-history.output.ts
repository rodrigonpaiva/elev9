export type GetCoachChatDebugHistoryOutput = {
  conversationMemory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    metadata?: {
      source?: 'heuristic' | 'llm';
      provider?: string;
      model?: string;
      promptVersion?: string;
    };
  }>;
};
