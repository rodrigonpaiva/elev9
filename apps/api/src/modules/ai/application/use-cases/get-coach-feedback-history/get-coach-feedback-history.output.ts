export type GetCoachFeedbackHistoryOutput = {
  feedbacks: Array<{
    id: string;
    message: string;
    insights: string[];
    recommendations: string[];
    createdAt: string;
  }>;
};
