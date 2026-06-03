export type SendCoachChatRequest = {
    message: string;
};
export type SendCoachChatResponse = {
    conversationId: string;
    reply: string;
};
export type CoachChatHistoryMessage = {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
};
export type GetCoachChatHistoryQuery = {
    limit?: number;
};
export type CoachChatHistoryResponse = CoachChatHistoryMessage[];
export type CoachDecisionPriority = 'recovery' | 'nutrition' | 'training' | 'consistency' | 'motivation';
export type CoachDecisionInfluenceCode = 'LOW_READINESS' | 'HIGH_FATIGUE' | 'LOW_NUTRITION_ADHERENCE' | 'HIGH_NUTRITION_ADHERENCE' | 'REST_DAY_RECOMMENDED' | 'RECOVERY_WORKOUT_RECOMMENDED' | 'INCREASE_INTENSITY_RECOMMENDED' | 'DECREASE_INTENSITY_RECOMMENDED' | 'LOW_TRAINING_ADHERENCE' | 'LONG_STREAK' | 'NO_RECENT_ACTIVITY' | 'GOOD_CONSISTENCY' | 'GOAL_PROGRESS_DECLINING' | 'GOAL_PROGRESS_IMPROVING' | 'GOAL_FORECAST_LOW_CONFIDENCE' | 'GOAL_MILESTONE_CLOSE' | 'GOAL_ACHIEVEMENT_REACHED';
export interface CoachDecisionInfluence {
    code: CoachDecisionInfluenceCode;
    label: string;
    impact: 'positive' | 'negative' | 'neutral';
    source: 'recovery' | 'nutrition' | 'training' | 'progress' | 'memory';
    weight?: number;
    value?: number;
}
export interface CoachDecision {
    id: string;
    userProfileId: string;
    date: string;
    recoverySnapshotId?: string;
    nutritionRecommendationId?: string;
    adaptiveTrainingRecommendationId?: string;
    priority: CoachDecisionPriority;
    headline: string;
    summary: string;
    actionItems: string[];
    influences: CoachDecisionInfluence[];
    sourceContext: Record<string, unknown>;
    formulaVersion: string;
    generatedBy: 'deterministic' | 'llm_assisted';
    llmMetadata?: {
        provider?: string;
        model?: string;
        used: boolean;
        failed?: boolean;
    };
    createdAt: string;
    updatedAt: string;
}
export interface CoachDecisionSourceContext {
    goalId?: string;
    goalType?: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'improve_consistency' | 'improve_recovery';
    readinessScore?: number;
    fatigueScore?: number;
    nutritionAdherence?: number;
    adaptiveRecommendationType?: string;
    adaptiveIntensity?: string;
    currentStreak?: number;
    missedWorkouts?: number;
    goalProgressPercentage?: number;
    goalTrend?: 'improving' | 'stable' | 'declining';
    goalForecastConfidence?: 'low' | 'medium' | 'high';
    goalMilestoneClose?: boolean;
    goalAchievementReached?: boolean;
    generatedAt: string;
}
export interface GetTodayCoachDecisionResponse {
    coachDecision: CoachDecision;
}
export interface GetCurrentCoachDecisionResponse {
    coachDecision: CoachDecision;
}
export interface GetCoachDecisionHistoryQuery {
    limit?: number;
}
export interface GetCoachDecisionHistoryResponse {
    coachDecisions: CoachDecision[];
}
export interface CoachDecisionRecalculatedResult {
    priority: CoachDecisionPriority;
    headline: string;
    summary: string;
    actionItems: string[];
    influences: CoachDecisionInfluence[];
    formulaVersion: string;
}
export interface CoachDecisionReplayDifference {
    field: string;
    persisted: unknown;
    recalculated: unknown;
}
export interface CoachDecisionReplayComparison {
    matches: boolean;
    differences: CoachDecisionReplayDifference[];
}
export interface CoachDecisionReplayResponse {
    persisted: CoachDecision;
    recalculated: CoachDecisionRecalculatedResult;
    comparison: CoachDecisionReplayComparison;
    replayedAt: string;
}
export interface CoachFeedbackCoachDecision {
    priority: CoachDecisionPriority;
    headline: string;
    summary: string;
    actionItems: string[];
    influences: CoachDecisionInfluence[];
}
