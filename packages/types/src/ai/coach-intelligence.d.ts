import type { AdaptiveTrainingRecommendation, TrainingPlanResponse } from '../training';
import type { Goal, GoalAchievement, GoalForecast, GoalMilestone, GoalProgressSnapshot } from '../goals';
import type { BehavioralPattern, PersonalizationSnapshot, UserBehaviorProfile } from '../personalization';
import type { ConsistencySummary, HabitRiskSignal, HabitSnapshot } from '../habits';
import type { NotificationDecision, NotificationEngagementSummary } from '../notifications';
import type { NutritionPlan, NutritionRecommendation, TodayNutrition } from '../nutrition';
import type { RecoverySnapshot } from '../recovery';
import type { DailyCheckIn, ProgressSummaryResponse } from '../progress';
export type CoachExpertName = 'Workout' | 'Nutrition' | 'Recovery' | 'Goal' | 'Habit' | 'Progress' | 'Motivation';
export type CoachUnifiedAssessmentCode = 'LOW_RECOVERY' | 'STRONG_PROGRESS' | 'CONSISTENT_HABITS' | 'PLATEAU' | 'HIGH_MOTIVATION' | 'RECENT_MILESTONE' | 'NUTRITION_INCONSISTENCY';
export type CoachRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type CoachConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CoachRecommendationPriority = 'PRIMARY' | 'SAFETY_CRITICAL' | 'SUPPORTING' | 'INFORMATIONAL';
export type CoachEvidenceImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CoachEvidenceAvailability = 'AVAILABLE' | 'PARTIAL' | 'MISSING';
export type CoachFocus = 'WORKOUT' | 'RECOVERY' | 'NUTRITION' | 'GOALS' | 'CONSISTENCY' | 'PROGRESS' | 'MOTIVATION' | 'SAFETY';
export type CoachIntelligenceRolloutState = 'legacy' | 'aggregate' | 'shadow';
export type CoachIntelligenceSectionName = 'insight' | 'evidence' | 'explainability' | 'training' | 'nutrition' | 'recovery' | 'goals' | 'habits' | 'progress' | 'personalization' | 'notifications';
export type CoachIntelligenceAvailabilityStatus = 'available' | 'unavailable' | 'stale' | 'degraded' | 'disabled';
export type CoachIntelligenceAvailabilityReasonCode = 'READY' | 'MISSING_CONTEXT' | 'STALE_CONTEXT' | 'SOURCE_UNAVAILABLE' | 'SOURCE_TIMEOUT' | 'FEATURE_DISABLED' | 'PARTIAL_FAILURE' | 'FALLBACK_USED' | 'VALIDATION_FAILED' | 'INSUFFICIENT_SIGNALS' | 'NO_SAFE_FALLBACK' | 'POLICY_BLOCKED' | 'RETRYABLE_SOURCE_ERROR';
export type CoachIntelligenceFreshnessStatus = 'fresh' | 'stale' | 'unknown';
export type CoachIntelligenceWarningSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CoachIntelligenceWarningCode = 'MISSING_CONTEXT' | 'STALE_CONTEXT' | 'PARTIAL_RESPONSE' | 'FEATURE_DISABLED' | 'FALLBACK_USED' | 'LOW_CONFIDENCE' | 'NO_SAFE_RECOMMENDATION' | 'RETRY_RECOMMENDED' | 'EXPLAINABILITY_REDACTED';
export interface CoachEvidence {
    id: string;
    type: string;
    source: CoachExpertName;
    expert: CoachExpertName;
    importance: CoachEvidenceImportance;
    confidence: CoachConfidenceLevel;
    availability: CoachEvidenceAvailability;
    title: string;
    detail?: string;
    metadata: Record<string, unknown>;
}
export interface CoachUnifiedAssessment {
    code: CoachUnifiedAssessmentCode;
    title: string;
    detail: string;
    expert: CoachExpertName;
    evidenceIds: string[];
    metadata: Record<string, unknown>;
}
export interface CoachUnifiedRecommendation {
    code: string;
    title: string;
    detail: string;
    expert: CoachExpertName;
    priority: CoachRecommendationPriority;
    supportingEvidenceIds: string[];
    metadata: Record<string, unknown>;
}
export interface CoachUnifiedRisk {
    level: CoachRiskLevel;
    sources: CoachExpertName[];
    title: string;
    detail: string;
    evidenceIds: string[];
    metadata: Record<string, unknown>;
}
export interface CoachUnifiedConfidence {
    level: CoachConfidenceLevel;
    evidenceCount: number;
    supportingEvidenceCount: number;
    missingEvidenceCount: number;
    policyConfidence: CoachConfidenceLevel;
    runtimeCompleteness: CoachConfidenceLevel;
    detail: string;
}
export interface CoachCompositionConflict {
    type: string;
    experts: CoachExpertName[];
    severity: CoachRiskLevel;
    resolution: string;
    metadata: Record<string, unknown>;
}
export interface CoachExplainabilityMetadata {
    generatedAt: string;
    durationMs: number;
    evidenceCount: number;
    explanationCount: number;
    missingEvidenceCount: number;
}
export type CoachDecisionReason = {
    code: string;
    title: string;
    supportingEvidenceIds: string[];
    supportingExperts: CoachExpertName[];
    priority: 'primary' | 'supporting' | 'informational';
    reasonCategory: 'SAFETY' | 'RECOVERY' | 'PERFORMANCE' | 'CONSISTENCY' | 'PROGRESS' | 'GOALS' | 'NUTRITION' | 'WORKOUT';
    metadata: Record<string, unknown>;
};
export type CoachRecommendationReason = {
    recommendationCode: string;
    supportingEvidenceIds: string[];
    supportingExperts: CoachExpertName[];
    priority: CoachRecommendationPriority;
    reasonCategory: 'SAFETY' | 'RECOVERY' | 'PERFORMANCE' | 'CONSISTENCY' | 'PROGRESS' | 'GOALS' | 'NUTRITION' | 'WORKOUT';
    metadata: Record<string, unknown>;
};
export type CoachRiskExplanation = {
    riskLevel: CoachRiskLevel;
    supportingEvidenceIds: string[];
    supportingExperts: CoachExpertName[];
    severity: CoachRiskLevel;
    metadata: Record<string, unknown>;
};
export type CoachConfidenceExplanation = {
    confidence: CoachConfidenceLevel;
    supportingEvidenceCount: number;
    supportingExpertCount: number;
    missingEvidenceCount: number;
    policyRestrictions: string[];
    metadata: Record<string, unknown>;
};
export type CoachConflictExplanation = {
    conflictType: string;
    experts: CoachExpertName[];
    resolution: string;
    resolvedBy: string;
    severity: CoachRiskLevel;
    metadata: Record<string, unknown>;
};
export type CoachMissingEvidence = {
    type: string;
    source: string;
    expert?: CoachExpertName;
    availability: CoachEvidenceAvailability;
    metadata: Record<string, unknown>;
};
export interface CoachExplanation {
    decisionReasons: CoachDecisionReason[];
    recommendationReasons: CoachRecommendationReason[];
    riskExplanations: CoachRiskExplanation[];
    confidenceExplanation: CoachConfidenceExplanation;
    conflictExplanations: CoachConflictExplanation[];
    missingEvidence: CoachMissingEvidence[];
    evidence: CoachEvidence[];
    metadata: CoachExplainabilityMetadata;
    summary: string;
}
export interface CoachIntelligenceHeader {
    aggregateId: string;
    requestId: string;
    generatedAt: string;
    sourceVersion?: string;
    rolloutState?: CoachIntelligenceRolloutState;
}
export interface CoachIntelligenceOwnership {
    primaryExpert: CoachExpertName;
    participatingExperts: CoachExpertName[];
    supportingExperts: CoachExpertName[];
}
export interface CoachIntelligenceInsight {
    summary: string;
    dailyPriority: CoachRecommendationPriority;
    currentFocus: CoachFocus;
    currentRisk: CoachUnifiedRisk | null;
    topRecommendation: CoachUnifiedRecommendation | null;
    keyFindings: CoachUnifiedAssessment[];
    recommendations: CoachUnifiedRecommendation[];
    risks: CoachUnifiedRisk[];
    confidence: CoachUnifiedConfidence;
    conflicts: CoachCompositionConflict[];
}
export interface CoachIntelligenceFeatureAvailability {
    insight: boolean;
    evidence: boolean;
    explainability: boolean;
    training: boolean;
    nutrition: boolean;
    recovery: boolean;
    goals: boolean;
    habits: boolean;
    progress: boolean;
    personalization: boolean;
    notifications: boolean;
}
export interface CoachIntelligenceMetadata {
    contractVersion: string;
    partialResult: boolean;
    fallbackUsed: boolean;
    featureAvailability: CoachIntelligenceFeatureAvailability;
}
export interface CoachIntelligenceSectionAvailability {
    status: CoachIntelligenceAvailabilityStatus;
    fallbackUsed: boolean;
    retryable: boolean;
    reasonCode: CoachIntelligenceAvailabilityReasonCode;
}
export interface CoachIntelligenceSectionFreshness {
    status: CoachIntelligenceFreshnessStatus;
    generatedAt: string;
    sourceTimestamp?: string;
    ageMs?: number;
}
export interface CoachIntelligenceAvailability {
    status: CoachIntelligenceAvailabilityStatus;
    fallbackUsed: boolean;
    retryable: boolean;
    reasonCode: CoachIntelligenceAvailabilityReasonCode;
    sections: Record<CoachIntelligenceSectionName, CoachIntelligenceSectionAvailability>;
}
export interface CoachIntelligenceFreshness {
    status: CoachIntelligenceFreshnessStatus;
    generatedAt: string;
    sourceTimestamp?: string;
    ageMs?: number;
    sections: Record<CoachIntelligenceSectionName, CoachIntelligenceSectionFreshness>;
}
export interface CoachIntelligenceWarning {
    code: CoachIntelligenceWarningCode;
    severity: CoachIntelligenceWarningSeverity;
    affectedSections: CoachIntelligenceSectionName[];
    retryable: boolean;
    title: string;
    detail?: string;
    metadata: Record<string, unknown>;
}
export interface CoachIntelligenceSectionState<TSectionData> {
    availability: CoachIntelligenceSectionAvailability;
    freshness: CoachIntelligenceSectionFreshness;
    data: TSectionData | null;
    warnings: CoachIntelligenceWarning[];
}
export interface CoachTrainingSection {
    trainingPlan: TrainingPlanResponse['trainingPlan'] | null;
    adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation | null;
}
export interface CoachNutritionSection {
    todayNutrition: TodayNutrition | null;
    nutritionPlan: NutritionPlan | null;
    nutritionRecommendation: NutritionRecommendation | null;
}
export interface CoachRecoverySection {
    recoverySnapshot: RecoverySnapshot | null;
}
export interface CoachGoalsSection {
    currentGoal: Goal | null;
    progressSnapshot: GoalProgressSnapshot | null;
    forecast: GoalForecast | null;
    milestones: GoalMilestone[];
    achievements: GoalAchievement[];
}
export interface CoachHabitsSection {
    habitSnapshot: HabitSnapshot | null;
    consistencySummary: ConsistencySummary | null;
    habitRiskSignals: HabitRiskSignal[];
}
export interface CoachProgressSection {
    progressSummary: ProgressSummaryResponse['summary'] | null;
    dailyCheckIn: DailyCheckIn | null;
}
export interface CoachPersonalizationSection {
    personalizationSnapshot: PersonalizationSnapshot | null;
    userBehaviorProfile: UserBehaviorProfile | null;
    behavioralPatterns: BehavioralPattern[];
}
export interface CoachNotificationsSection {
    notificationDecision: NotificationDecision | null;
    engagementSummary: NotificationEngagementSummary | null;
}
export interface CoachIntelligenceSections {
    training: CoachIntelligenceSectionState<CoachTrainingSection>;
    nutrition: CoachIntelligenceSectionState<CoachNutritionSection>;
    recovery: CoachIntelligenceSectionState<CoachRecoverySection>;
    goals: CoachIntelligenceSectionState<CoachGoalsSection>;
    habits: CoachIntelligenceSectionState<CoachHabitsSection>;
    progress: CoachIntelligenceSectionState<CoachProgressSection>;
    personalization: CoachIntelligenceSectionState<CoachPersonalizationSection>;
    notifications: CoachIntelligenceSectionState<CoachNotificationsSection>;
}
export interface CoachIntelligenceAggregate {
    header: CoachIntelligenceHeader;
    ownership: CoachIntelligenceOwnership;
    insight: CoachIntelligenceInsight;
    evidence: CoachEvidence[];
    explainability: CoachExplanation;
    warnings: CoachIntelligenceWarning[];
    availability: CoachIntelligenceAvailability;
    freshness: CoachIntelligenceFreshness;
    sections: CoachIntelligenceSections;
    metadata: CoachIntelligenceMetadata;
}
export type CoachUnifiedCoachIntelligence = CoachIntelligenceAggregate;
