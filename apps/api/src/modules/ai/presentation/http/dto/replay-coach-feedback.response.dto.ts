export type ReplayCoachFeedbackResponseDto = {
  feedbackId: string;
  generatorVersion: string;
  persisted: {
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
  };
  replayed: {
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
  };
  matches: {
    message: boolean;
    insights: boolean;
    recommendations: boolean;
    influences: boolean;
  };
};
