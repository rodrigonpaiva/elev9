export type EngagementSummary = {
  engagementScore: number;
  fatigueLevel: 'low' | 'medium' | 'high';
  openedCount: number;
  clickedCount: number;
  dismissedCount: number;
  completedCount: number;
  recentEventsCount: number;
};

export type GetEngagementSummaryOutput = {
  engagementSummary: EngagementSummary;
};
