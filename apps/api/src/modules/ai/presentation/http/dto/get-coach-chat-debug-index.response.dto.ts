export type GetCoachChatDebugIndexResponseDto = {
  generatedAt: string;
  replyPath: {
    source: "llm" | "heuristic";
    fallbackActivated: boolean;
    fallbackReason?: "provider_failure" | "llm_disabled" | "invalid_provider";
  };
  llm: {
    enabled: boolean;
    provider: string;
    model: string;
    promptVersion: string;
  };
  promptVersion: string;
  promptPreview: {
    systemSections: string[];
  };
  memoryPreview?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
    metadata: {
      hasRecoveryContext: boolean;
      hasNutritionContext: boolean;
      hasWorkoutContinuity: boolean;
    };
    updatedAt: string;
  };
  context: {
    fatigueLevel: "LOW" | "MODERATE" | "HIGH";
    recoveryTrend: "improving" | "stable" | "needs_recovery";
    hasNutritionProfile: boolean;
    recentWorkoutCount: number;
  };
  recentMessages: Array<{
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
