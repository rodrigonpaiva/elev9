export type GetCoachChatReplyPathDebugResponseDto = {
  replyPath: {
    source: "llm" | "heuristic";
    fallbackActivated: boolean;
    fallbackReason?: "provider_failure" | "llm_disabled" | "invalid_provider";
    llm: {
      enabled: boolean;
      provider: string;
      model: string;
      promptVersion: string;
    };
  };
  context: {
    fatigueLevel: "LOW" | "MODERATE" | "HIGH";
    recoveryTrend: "improving" | "stable" | "needs_recovery";
    hasNutritionProfile: boolean;
    hasLatestCheckIn: boolean;
    recentWorkoutCount: number;
    recentConversationMessages: number;
  };
  promptPreview: {
    systemSections: string[];
    userMessagePreview: string;
  };
};
