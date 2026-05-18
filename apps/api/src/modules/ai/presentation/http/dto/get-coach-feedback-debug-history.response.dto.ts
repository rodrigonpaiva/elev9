export type GetCoachFeedbackDebugHistoryResponseDto = {
  feedbacks: Array<{
    id: string;
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
    createdAt: string;
  }>;
};
