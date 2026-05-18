export type GetCoachChatPromptDebugOutput = {
  promptVersion: string;
  llm: {
    enabled: boolean;
    provider: string;
    model: string;
  };
  context: {
    fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH';
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    hasNutritionProfile: boolean;
    hasLatestCheckIn: boolean;
    recentWorkoutCount: number;
    recentConversationMessages: number;
  };
  promptPreview: {
    systemSections: string[];
    userMessagePreview: string;
  };
  conversationMemory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
  };
};
