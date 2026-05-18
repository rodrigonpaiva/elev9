export type GetCoachChatMemoryDebugResponseDto = {
  memory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
    metadata: {
      hasRecoveryContext: boolean;
      hasNutritionContext: boolean;
      hasWorkoutContinuity: boolean;
    };
    createdAt: string;
    updatedAt: string;
  };
};
