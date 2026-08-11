import type {
  CoachChatHistoryMessage,
  CoachDecision,
  ConsistencySummary,
  GoalAchievement,
  GoalForecast,
  GoalMilestone,
  GoalProgressSnapshot,
  GetCurrentGoalResponse,
  HabitSnapshot,
  PersonalizationSnapshot,
  ProgressSummaryResponse,
  RecoverySnapshot,
  NutritionReadModel,
  TodayWorkout,
} from '@elev9/types';

type CurrentGoal = GetCurrentGoalResponse['goal'];
type ProgressSummary = ProgressSummaryResponse['summary'];

export type CoachExpertName =
  | 'Workout'
  | 'Nutrition'
  | 'Recovery'
  | 'Goal'
  | 'Habit'
  | 'Progress'
  | 'Motivation';

export type CoachUnifiedAssessmentCode =
  | 'LOW_RECOVERY'
  | 'STRONG_PROGRESS'
  | 'CONSISTENT_HABITS'
  | 'PLATEAU'
  | 'HIGH_MOTIVATION'
  | 'RECENT_MILESTONE'
  | 'NUTRITION_INCONSISTENCY';

export type CoachRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type CoachConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachRecommendationPriority =
  | 'PRIMARY'
  | 'SAFETY_CRITICAL'
  | 'SUPPORTING'
  | 'INFORMATIONAL';

export type CoachEvidenceImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CoachEvidenceAvailability = 'AVAILABLE' | 'PARTIAL' | 'MISSING';

export type CoachTone =
  | 'SUPPORTIVE'
  | 'DIRECT'
  | 'ANALYTICAL'
  | 'CELEBRATORY'
  | 'CAUTIOUS'
  | 'CALM';

export type CoachVerbosity = 'VERY_SHORT' | 'SHORT' | 'NORMAL' | 'DETAILED';

export type CoachFocus =
  | 'WORKOUT'
  | 'RECOVERY'
  | 'NUTRITION'
  | 'GOALS'
  | 'CONSISTENCY'
  | 'PROGRESS'
  | 'MOTIVATION'
  | 'SAFETY';

export type CoachDirectiveLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachEmpathyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachEncouragementLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachTechnicalDepth = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type CoachUrgency = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CoachCelebrationLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachSafetyLevel = 'NORMAL' | 'ELEVATED' | 'STRICT';

export type CoachEvidenceSource = CoachExpertName;

export type CoachEvidence = {
  id: string;
  type: string;
  source: CoachEvidenceSource;
  expert: CoachExpertName;
  importance: CoachEvidenceImportance;
  confidence: CoachConfidenceLevel;
  availability: CoachEvidenceAvailability;
  title: string;
  detail?: string;
  metadata: Record<string, unknown>;
};

export type CoachUnifiedAssessment = {
  code: CoachUnifiedAssessmentCode;
  title: string;
  detail: string;
  expert: CoachExpertName;
  evidenceIds: string[];
  metadata: Record<string, unknown>;
};

export type CoachUnifiedRecommendation = {
  code: string;
  title: string;
  detail: string;
  expert: CoachExpertName;
  priority: CoachRecommendationPriority;
  supportingEvidenceIds: string[];
  metadata: Record<string, unknown>;
};

export type CoachUnifiedRisk = {
  level: CoachRiskLevel;
  sources: CoachExpertName[];
  title: string;
  detail: string;
  evidenceIds: string[];
  metadata: Record<string, unknown>;
};

export type CoachUnifiedConfidence = {
  level: CoachConfidenceLevel;
  evidenceCount: number;
  supportingEvidenceCount: number;
  missingEvidenceCount: number;
  policyConfidence: CoachConfidenceLevel;
  runtimeCompleteness: CoachConfidenceLevel;
  detail: string;
};

export type CoachCompositionConflict = {
  type: string;
  experts: CoachExpertName[];
  severity: CoachRiskLevel;
  resolution: string;
  metadata: Record<string, unknown>;
};

export type CoachCompositionMetadata = {
  source: 'legacy';
  generatedAt: string;
  updatedAt: string;
  executionDurationMs: number;
};

export type CoachUnifiedCoachIntelligence = {
  primaryExpert: CoachExpertName;
  participatingExperts: CoachExpertName[];
  summary: string;
  keyFindings: CoachUnifiedAssessment[];
  recommendations: CoachUnifiedRecommendation[];
  risks: CoachUnifiedRisk[];
  confidence: CoachUnifiedConfidence;
  conflicts: CoachCompositionConflict[];
  supportingExperts: CoachExpertName[];
  metadata: CoachCompositionMetadata;
  currentFocus: CoachFocus;
  currentRisk: CoachUnifiedRisk | null;
  topRecommendation: CoachUnifiedRecommendation | null;
  supportingEvidenceSummary: string;
  evidence: CoachEvidence[];
};

export type CoachPersonaMetadata = {
  source: 'legacy';
  generatedAt: string;
  updatedAt: string;
};

export type CoachPersonaProfile = {
  tone: CoachTone;
  verbosity: CoachVerbosity;
  focus: CoachFocus;
  directiveLevel: CoachDirectiveLevel;
  empathyLevel: CoachEmpathyLevel;
  encouragementLevel: CoachEncouragementLevel;
  technicalDepth: CoachTechnicalDepth;
  urgency: CoachUrgency;
  celebrationLevel: CoachCelebrationLevel;
  safetyLevel: CoachSafetyLevel;
  communicationRules: string[];
  metadata: CoachPersonaMetadata;
};

export type CoachCommunicationStyle = Pick<
  CoachPersonaProfile,
  | 'tone'
  | 'verbosity'
  | 'directiveLevel'
  | 'empathyLevel'
  | 'encouragementLevel'
>;

export type CoachExplainabilityMetadata = {
  generatedAt: string;
  durationMs: number;
  evidenceCount: number;
  explanationCount: number;
  missingEvidenceCount: number;
};

export type CoachDecisionReason = {
  code: string;
  title: string;
  supportingEvidenceIds: string[];
  supportingExperts: CoachExpertName[];
  priority: 'primary' | 'supporting' | 'informational';
  reasonCategory:
    | 'SAFETY'
    | 'RECOVERY'
    | 'PERFORMANCE'
    | 'CONSISTENCY'
    | 'PROGRESS'
    | 'GOALS'
    | 'NUTRITION'
    | 'WORKOUT';
  metadata: Record<string, unknown>;
};

export type CoachRecommendationReason = {
  recommendationCode: string;
  supportingEvidenceIds: string[];
  supportingExperts: CoachExpertName[];
  priority: CoachRecommendationPriority;
  reasonCategory:
    | 'SAFETY'
    | 'RECOVERY'
    | 'PERFORMANCE'
    | 'CONSISTENCY'
    | 'PROGRESS'
    | 'GOALS'
    | 'NUTRITION'
    | 'WORKOUT';
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

export type CoachExplanation = {
  decisionReasons: CoachDecisionReason[];
  recommendationReasons: CoachRecommendationReason[];
  riskExplanations: CoachRiskExplanation[];
  confidenceExplanation: CoachConfidenceExplanation;
  conflictExplanations: CoachConflictExplanation[];
  missingEvidence: CoachMissingEvidence[];
  evidence: CoachEvidence[];
  metadata: CoachExplainabilityMetadata;
  summary: string;
};

type CoachIntelligenceInput = {
  coachDecision: CoachDecision | null;
  currentGoal: CurrentGoal | null;
  goalProgressSnapshot?: GoalProgressSnapshot | null;
  goalForecast?: GoalForecast | null;
  goalMilestones?: GoalMilestone[];
  goalAchievements?: GoalAchievement[];
  habitSnapshot?: HabitSnapshot | null;
  consistencySummary?: ConsistencySummary | null;
  personalizationSnapshot?: PersonalizationSnapshot | null;
  recoverySnapshot?: RecoverySnapshot | null;
  progressSummary?: ProgressSummary | null;
  nutrition?: NutritionReadModel | null;
  workout?: TodayWorkout | null;
  chatHistory?: CoachChatHistoryMessage[];
};

const EXPERT_ORDER: CoachExpertName[] = [
  'Workout',
  'Nutrition',
  'Recovery',
  'Goal',
  'Habit',
  'Progress',
  'Motivation',
];

const KEY_FINDING_ORDER: CoachUnifiedAssessmentCode[] = [
  'LOW_RECOVERY',
  'NUTRITION_INCONSISTENCY',
  'PLATEAU',
  'RECENT_MILESTONE',
  'STRONG_PROGRESS',
  'CONSISTENT_HABITS',
  'HIGH_MOTIVATION',
];

const SAFETY_TERMS = [
  'rest',
  'recover',
  'recovery',
  'sleep',
  'reduce',
  'lower',
  'light',
  'check-in',
  'check in',
  'pause',
];

export function buildCoachIntelligence(
  input: CoachIntelligenceInput,
): CoachUnifiedCoachIntelligence | null {
  if (!input.coachDecision) {
    return null;
  }

  const primaryExpert = resolvePrimaryExpert(input.coachDecision.priority);
  const participatingExperts = resolveParticipatingExperts(
    input,
    primaryExpert,
  );
  const coachDecision = input.coachDecision;
  const evidence = buildEvidence(
    coachDecision,
    primaryExpert,
    participatingExperts,
    input,
  );
  const recommendations = buildRecommendations(
    coachDecision,
    primaryExpert,
    evidence,
  );
  const risks = buildRisks(input, participatingExperts, evidence);
  const currentRisk = risks[0] ?? null;
  const confidence = buildConfidence({
    evidence,
    participatingExperts,
    input,
    currentRisk,
    coachDecision,
  });
  const keyFindings = buildKeyFindings(input, evidence);
  const conflicts = buildConflicts(input, currentRisk, participatingExperts);
  const currentFocus = resolveFocus(primaryExpert, currentRisk);
  const topRecommendation = recommendations[0] ?? null;
  const summary = buildSummary(
    coachDecision,
    currentFocus,
    topRecommendation,
    currentRisk,
  );

  return {
    primaryExpert,
    participatingExperts,
    summary,
    keyFindings,
    recommendations,
    risks,
    confidence,
    conflicts,
    supportingExperts: participatingExperts.filter(
      (expert) => expert !== primaryExpert,
    ),
    metadata: buildMetadata(input.coachDecision),
    currentFocus,
    currentRisk,
    topRecommendation,
    supportingEvidenceSummary: buildSupportingEvidenceSummary(evidence),
    evidence,
  };
}

export function buildCoachPersonaGuidance(input: {
  intelligence: CoachUnifiedCoachIntelligence | null;
  personalizationSnapshot?: PersonalizationSnapshot | null;
  currentGoal?: CurrentGoal | null;
}): CoachPersonaProfile | null {
  if (!input.intelligence) {
    return null;
  }

  const intelligence = input.intelligence;
  const riskLevel = intelligence.currentRisk?.level ?? 'UNKNOWN';
  const hasMilestone = intelligence.keyFindings.some(
    (finding) => finding.code === 'RECENT_MILESTONE',
  );
  const hasPlateau = intelligence.keyFindings.some(
    (finding) => finding.code === 'PLATEAU',
  );
  const hasStrongProgress = intelligence.keyFindings.some(
    (finding) => finding.code === 'STRONG_PROGRESS',
  );

  const tone = resolveTone({
    riskLevel,
    hasMilestone,
    hasPlateau,
    hasStrongProgress,
    focus: intelligence.currentFocus,
  });

  const urgency = resolveUrgency(riskLevel, intelligence.confidence.level);
  const safetyLevel = resolveSafetyLevel(riskLevel);
  const verbosity = resolveVerbosity(
    intelligence,
    input.personalizationSnapshot,
    urgency,
  );
  const directiveLevel = resolveDirectiveLevel(riskLevel, intelligence);
  const empathyLevel = resolveEmpathyLevel(intelligence, input.currentGoal);
  const encouragementLevel = resolveEncouragementLevel(intelligence);
  const celebrationLevel = resolveCelebrationLevel(intelligence);
  const technicalDepth = resolveTechnicalDepth(input.personalizationSnapshot);

  return {
    tone,
    verbosity,
    focus: intelligence.currentFocus,
    directiveLevel,
    empathyLevel,
    encouragementLevel,
    technicalDepth,
    urgency,
    celebrationLevel,
    safetyLevel,
    communicationRules: buildCommunicationRules({
      tone,
      urgency,
      safetyLevel,
      intelligence,
    }),
    metadata: {
      source: 'legacy',
      generatedAt: intelligence.metadata.generatedAt,
      updatedAt: intelligence.metadata.updatedAt,
    },
  };
}

export function buildCoachExplanation(input: {
  intelligence: CoachUnifiedCoachIntelligence | null;
  persona: CoachPersonaProfile | null;
}): CoachExplanation | null {
  if (!input.intelligence) {
    return null;
  }

  const intelligence = input.intelligence;
  const recommendationReasons = intelligence.recommendations.map(
    (recommendation) =>
      mapRecommendationReason(recommendation, intelligence.evidence),
  );
  const decisionReasons = intelligence.keyFindings.map((finding) =>
    mapDecisionReason(finding),
  );
  const riskExplanations = intelligence.risks.map((risk) =>
    mapRiskExplanation(risk),
  );
  const conflictExplanations = intelligence.conflicts.map((conflict) =>
    mapConflictExplanation(conflict),
  );
  const missingEvidence = buildMissingEvidence(intelligence.evidence);
  const confidenceExplanation = mapConfidenceExplanation(
    intelligence.confidence,
    intelligence.supportingExperts.length,
    missingEvidence.length,
  );

  return {
    decisionReasons,
    recommendationReasons,
    riskExplanations,
    confidenceExplanation,
    conflictExplanations,
    missingEvidence,
    evidence: intelligence.evidence,
    metadata: {
      generatedAt: intelligence.metadata.generatedAt,
      durationMs: intelligence.metadata.executionDurationMs,
      evidenceCount: intelligence.evidence.length,
      explanationCount:
        decisionReasons.length +
        recommendationReasons.length +
        riskExplanations.length +
        conflictExplanations.length,
      missingEvidenceCount: missingEvidence.length,
    },
    summary: buildExplanationSummary(intelligence, input.persona),
  };
}

export function mapUnifiedCoachInsight(input: {
  intelligence: CoachUnifiedCoachIntelligence | null;
  fallbackHeadline?: string;
  fallbackSummary?: string;
}): {
  headline: string;
  summary: string;
  currentFocus: CoachFocus | null;
  currentRisk: CoachUnifiedRisk | null;
  confidence: CoachUnifiedConfidence | null;
  topRecommendation: CoachUnifiedRecommendation | null;
  supportingEvidenceSummary: string;
  primaryExpert: CoachExpertName | null;
  participatingExperts: CoachExpertName[];
  supportingExperts: CoachExpertName[];
  keyFindings: CoachUnifiedAssessment[];
  recommendations: CoachUnifiedRecommendation[];
  risks: CoachUnifiedRisk[];
  conflicts: CoachCompositionConflict[];
  evidence: CoachEvidence[];
} {
  if (!input.intelligence) {
    return {
      headline: input.fallbackHeadline ?? 'Coach insight unavailable.',
      summary:
        input.fallbackSummary ?? 'Your coach is still gathering context.',
      currentFocus: null,
      currentRisk: null,
      confidence: null,
      topRecommendation: null,
      supportingEvidenceSummary: '',
      primaryExpert: null,
      participatingExperts: [],
      supportingExperts: [],
      keyFindings: [],
      recommendations: [],
      risks: [],
      conflicts: [],
      evidence: [],
    };
  }

  return {
    headline: input.fallbackHeadline ?? input.intelligence.summary,
    summary:
      input.fallbackSummary ?? input.intelligence.supportingEvidenceSummary,
    currentFocus: input.intelligence.currentFocus,
    currentRisk: input.intelligence.currentRisk,
    confidence: input.intelligence.confidence,
    topRecommendation: input.intelligence.topRecommendation,
    supportingEvidenceSummary: input.intelligence.supportingEvidenceSummary,
    primaryExpert: input.intelligence.primaryExpert,
    participatingExperts: input.intelligence.participatingExperts,
    supportingExperts: input.intelligence.supportingExperts,
    keyFindings: input.intelligence.keyFindings,
    recommendations: input.intelligence.recommendations,
    risks: input.intelligence.risks,
    conflicts: input.intelligence.conflicts,
    evidence: input.intelligence.evidence,
  };
}

export function mapCoachRecommendation(
  recommendation: CoachUnifiedRecommendation,
): CoachUnifiedRecommendation {
  return recommendation;
}

export function mapCoachRisk(risk: CoachUnifiedRisk): CoachUnifiedRisk {
  return risk;
}

export function mapCoachConfidence(
  confidence: CoachUnifiedConfidence,
): CoachUnifiedConfidence {
  return confidence;
}

export function mapCoachEvidence(evidence: CoachEvidence): CoachEvidence {
  return evidence;
}

export function getCoachFocusLabel(focus: CoachFocus | null): string {
  switch (focus) {
    case 'WORKOUT':
      return 'Workout';
    case 'RECOVERY':
      return 'Recovery';
    case 'NUTRITION':
      return 'Nutrition';
    case 'GOALS':
      return 'Goals';
    case 'CONSISTENCY':
      return 'Consistency';
    case 'PROGRESS':
      return 'Progress';
    case 'MOTIVATION':
      return 'Motivation';
    case 'SAFETY':
      return 'Safety';
    default:
      return 'Coach';
  }
}

export function getCoachRiskLabel(level: CoachRiskLevel | null): string {
  switch (level) {
    case 'CRITICAL':
      return 'Critical risk';
    case 'HIGH':
      return 'High risk';
    case 'MEDIUM':
      return 'Moderate risk';
    case 'LOW':
      return 'Low risk';
    case 'UNKNOWN':
    default:
      return 'Risk unknown';
  }
}

export function getCoachConfidenceLabel(
  confidence: CoachConfidenceLevel | null,
): string {
  switch (confidence) {
    case 'HIGH':
      return 'High confidence';
    case 'MEDIUM':
      return 'Medium confidence';
    case 'LOW':
    default:
      return 'Low confidence';
  }
}

export function getCoachRiskVariant(
  level: CoachRiskLevel | null,
): 'primary' | 'muted' | 'danger' {
  switch (level) {
    case 'CRITICAL':
    case 'HIGH':
      return 'danger';
    case 'MEDIUM':
      return 'muted';
    case 'LOW':
    case 'UNKNOWN':
    default:
      return 'primary';
  }
}

export function getCoachConfidenceVariant(
  confidence: CoachConfidenceLevel | null,
): 'primary' | 'muted' | 'danger' {
  switch (confidence) {
    case 'HIGH':
      return 'primary';
    case 'MEDIUM':
      return 'muted';
    case 'LOW':
    default:
      return 'danger';
  }
}

export function getCoachRecommendationTarget(
  recommendation: CoachUnifiedRecommendation | null,
): 'workout' | 'nutrition' | 'recovery' | 'conversation' {
  if (!recommendation) {
    return 'conversation';
  }

  switch (recommendation.expert) {
    case 'Workout':
      return 'workout';
    case 'Nutrition':
      return 'nutrition';
    case 'Recovery':
      return 'recovery';
    default:
      return 'conversation';
  }
}

export function getCoachBadgeLabel(
  primaryExpert: CoachExpertName | null,
  currentRisk: CoachUnifiedRisk | null,
): string {
  if (currentRisk?.level === 'CRITICAL' || currentRisk?.level === 'HIGH') {
    return 'Safety Focus';
  }

  switch (primaryExpert) {
    case 'Workout':
      return 'Workout Focus';
    case 'Nutrition':
      return 'Nutrition Focus';
    case 'Recovery':
      return 'Recovery Focus';
    case 'Goal':
      return 'Goal Focus';
    case 'Habit':
      return 'Consistency Focus';
    case 'Progress':
      return 'Progress Focus';
    case 'Motivation':
      return 'Motivation Focus';
    default:
      return 'Coach Insight';
  }
}

function resolvePrimaryExpert(
  priority: CoachDecision['priority'],
): CoachExpertName {
  switch (priority) {
    case 'training':
      return 'Workout';
    case 'nutrition':
      return 'Nutrition';
    case 'recovery':
      return 'Recovery';
    case 'consistency':
      return 'Habit';
    case 'motivation':
    default:
      return 'Motivation';
  }
}

function resolveFocus(
  primaryExpert: CoachExpertName,
  currentRisk: CoachUnifiedRisk | null,
): CoachFocus {
  if (currentRisk?.level === 'CRITICAL' || currentRisk?.level === 'HIGH') {
    return 'SAFETY';
  }

  switch (primaryExpert) {
    case 'Workout':
      return 'WORKOUT';
    case 'Nutrition':
      return 'NUTRITION';
    case 'Recovery':
      return 'RECOVERY';
    case 'Goal':
      return 'GOALS';
    case 'Habit':
      return 'CONSISTENCY';
    case 'Progress':
      return 'PROGRESS';
    case 'Motivation':
    default:
      return 'MOTIVATION';
  }
}

function resolveParticipatingExperts(
  input: CoachIntelligenceInput,
  primaryExpert: CoachExpertName,
): CoachExpertName[] {
  const experts = new Set<CoachExpertName>([primaryExpert]);

  if (input.workout) {
    experts.add('Workout');
  }

  const nutritionProgress = input.nutrition?.progress;
  if (input.nutrition && nutritionProgress) {
    experts.add('Nutrition');
  }

  if (input.recoverySnapshot) {
    experts.add('Recovery');
  }

  if (
    input.currentGoal ||
    input.goalForecast ||
    input.goalProgressSnapshot ||
    input.goalAchievements?.length ||
    input.goalMilestones?.length
  ) {
    experts.add('Goal');
  }

  if (input.habitSnapshot || input.consistencySummary) {
    experts.add('Habit');
  }

  if (input.progressSummary) {
    experts.add('Progress');
  }

  if (input.personalizationSnapshot) {
    experts.add('Motivation');
  }

  return EXPERT_ORDER.filter((expert) => experts.has(expert));
}

function buildEvidence(
  coachDecision: CoachDecision,
  primaryExpert: CoachExpertName,
  participatingExperts: CoachExpertName[],
  input: CoachIntelligenceInput,
): CoachEvidence[] {
  const evidence: CoachEvidence[] = [];

  if (coachDecision.headline.trim()) {
    evidence.push(
      createEvidence({
        id: `${coachDecision.id}:headline`,
        type: 'coach_decision_headline',
        source: primaryExpert,
        expert: primaryExpert,
        importance: 'HIGH',
        confidence: confidenceFromGeneratedBy(coachDecision),
        availability: 'AVAILABLE',
        title: 'Coach headline',
        detail: coachDecision.headline.trim(),
        metadata: {
          generatedBy: coachDecision.generatedBy,
        },
      }),
    );
  }

  if (coachDecision.summary.trim()) {
    evidence.push(
      createEvidence({
        id: `${coachDecision.id}:summary`,
        type: 'coach_decision_summary',
        source: primaryExpert,
        expert: primaryExpert,
        importance: 'HIGH',
        confidence: confidenceFromGeneratedBy(coachDecision),
        availability: 'AVAILABLE',
        title: 'Coach summary',
        detail: coachDecision.summary.trim(),
        metadata: {},
      }),
    );
  }

  coachDecision.actionItems.forEach((item, index) => {
    const text = item.trim();

    if (!text) {
      return;
    }

    evidence.push(
      createEvidence({
        id: `${coachDecision.id}:action:${index}`,
        type: 'coach_action_item',
        source: primaryExpert,
        expert: primaryExpert,
        importance: isSafetyAction(text) ? 'CRITICAL' : 'MEDIUM',
        confidence: confidenceFromGeneratedBy(coachDecision),
        availability: 'AVAILABLE',
        title: 'Recommended action',
        detail: text,
        metadata: {
          index,
        },
      }),
    );
  });

  if (input.recoverySnapshot) {
    evidence.push(
      createEvidence({
        id: `${input.recoverySnapshot.date}:recovery`,
        type: 'recovery_readiness',
        source: 'Recovery',
        expert: 'Recovery',
        importance: getRecoveryImportance(
          input.recoverySnapshot.readinessScore,
        ),
        confidence: confidenceFromScore(input.recoverySnapshot.readinessScore),
        availability: 'AVAILABLE',
        title: 'Recovery readiness',
        detail: `${Math.round(input.recoverySnapshot.readinessScore)}/100 readiness`,
        metadata: {
          readinessScore: input.recoverySnapshot.readinessScore,
          fatigueScore: input.recoverySnapshot.fatigueScore,
          recoveryTrend: input.recoverySnapshot.recoveryTrend,
          recommendedIntensity: input.recoverySnapshot.recommendedIntensity,
        },
      }),
    );
  }

  if (input.workout) {
    evidence.push(
      createEvidence({
        id: `${input.workout.title}:${input.workout.focus}`,
        type: 'today_workout',
        source: 'Workout',
        expert: 'Workout',
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        title: "Today's workout",
        detail: buildWorkoutEvidenceDetail(input.workout),
        metadata: {
          exerciseCount: input.workout.exercises.length,
          intensity: input.workout.intensity,
          format: input.workout.format,
        },
      }),
    );
  }

  const nutritionProgress = input.nutrition?.progress;
  if (input.nutrition && nutritionProgress) {
    evidence.push(
      createEvidence({
        id: `${input.nutrition.date}:nutrition`,
        type: 'today_nutrition',
        source: 'Nutrition',
        expert: 'Nutrition',
        importance: getNutritionImportance(
          nutritionProgress.adherencePercentage,
        ),
        confidence: confidenceFromScore(nutritionProgress.adherencePercentage),
        availability: 'AVAILABLE',
        title: 'Nutrition adherence',
        detail: `${Math.round(nutritionProgress.adherencePercentage)}% adherence`,
        metadata: {
          nutritionFocus: input.nutrition.nutritionFocus,
          mealCount: input.nutrition.meals.length,
          nextMeal: input.nutrition.nextMeal?.title ?? null,
        },
      }),
    );
  }

  if (input.currentGoal) {
    evidence.push(
      createEvidence({
        id: `${input.currentGoal.id}:goal`,
        type: 'current_goal',
        source: 'Goal',
        expert: 'Goal',
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        title: 'Current goal',
        detail: formatGoalTitle(input.currentGoal),
        metadata: {
          goalType: input.currentGoal.type,
          goalStatus: input.currentGoal.status,
        },
      }),
    );
  }

  if (input.goalProgressSnapshot) {
    evidence.push(
      createEvidence({
        id: `${input.goalProgressSnapshot.goalId}:goal-progress`,
        type: 'goal_progress',
        source: 'Goal',
        expert: 'Goal',
        importance: getGoalProgressImportance(
          input.goalProgressSnapshot.progressPercentage,
        ),
        confidence: confidenceFromScore(
          input.goalProgressSnapshot.progressPercentage,
        ),
        availability: 'AVAILABLE',
        title: 'Goal progress',
        detail: `${Math.round(input.goalProgressSnapshot.progressPercentage)}% complete`,
        metadata: {
          trend: input.goalProgressSnapshot.trend,
          currentValue: input.goalProgressSnapshot.currentValue,
          targetValue: input.goalProgressSnapshot.targetValue,
        },
      }),
    );
  }

  if (input.goalForecast) {
    evidence.push(
      createEvidence({
        id: `${input.goalForecast.goalId}:goal-forecast`,
        type: 'goal_forecast',
        source: 'Goal',
        expert: 'Goal',
        importance: input.goalForecast.confidence === 'low' ? 'MEDIUM' : 'LOW',
        confidence:
          input.goalForecast.confidence === 'high' ? 'HIGH' : 'MEDIUM',
        availability: 'AVAILABLE',
        title: 'Goal forecast',
        detail: `${input.goalForecast.estimatedDaysRemaining} days remaining`,
        metadata: {
          confidence: input.goalForecast.confidence,
          estimatedDaysRemaining: input.goalForecast.estimatedDaysRemaining,
          predictedCompletionDate:
            input.goalForecast.predictedCompletionDate ?? null,
        },
      }),
    );
  }

  if (input.habitSnapshot) {
    evidence.push(
      createEvidence({
        id: `${input.habitSnapshot.date}:habit`,
        type: 'habit_snapshot',
        source: 'Habit',
        expert: 'Habit',
        importance: getHabitImportance(input.habitSnapshot.consistencyScore),
        confidence: confidenceFromScore(input.habitSnapshot.consistencyScore),
        availability: 'AVAILABLE',
        title: 'Habit consistency',
        detail: `${Math.round(input.habitSnapshot.consistencyScore)} consistency score`,
        metadata: {
          streakDays: input.habitSnapshot.streakDays,
          trend: input.habitSnapshot.trend,
          adherenceScore: input.habitSnapshot.adherenceScore,
        },
      }),
    );
  }

  if (input.consistencySummary) {
    evidence.push(
      createEvidence({
        id: `${input.consistencySummary.updatedAt}:consistency`,
        type: 'consistency_summary',
        source: 'Habit',
        expert: 'Habit',
        importance: getHabitImportance(input.consistencySummary.score),
        confidence: confidenceFromScore(input.consistencySummary.score),
        availability: 'AVAILABLE',
        title: 'Consistency summary',
        detail: `${input.consistencySummary.currentStreak} day streak`,
        metadata: {
          score: input.consistencySummary.score,
          riskLevel: input.consistencySummary.riskLevel,
          trend: input.consistencySummary.trend,
          longestStreak: input.consistencySummary.longestStreak,
        },
      }),
    );
  }

  if (input.progressSummary) {
    evidence.push(
      createEvidence({
        id: `${input.progressSummary.period}:progress`,
        type: 'progress_summary',
        source: 'Progress',
        expert: 'Progress',
        importance: getProgressImportance(input.progressSummary.currentStreak),
        confidence: confidenceFromScore(input.progressSummary.currentStreak),
        availability: 'AVAILABLE',
        title: 'Weekly progress',
        detail: `${input.progressSummary.workoutsCompleted} workouts completed`,
        metadata: {
          period: input.progressSummary.period,
          totalDurationMinutes: input.progressSummary.totalDurationMinutes,
          averageDurationMinutes: input.progressSummary.averageDurationMinutes,
          lastWorkoutDate: input.progressSummary.lastWorkoutDate,
        },
      }),
    );
  }

  if (input.personalizationSnapshot) {
    evidence.push(
      createEvidence({
        id: `${input.personalizationSnapshot.date}:personalization`,
        type: 'personalization_snapshot',
        source: 'Motivation',
        expert: 'Motivation',
        importance: getMotivationImportance(
          input.personalizationSnapshot.engagementProfile,
        ),
        confidence:
          input.personalizationSnapshot.engagementProfile === 'high'
            ? 'HIGH'
            : 'MEDIUM',
        availability: 'AVAILABLE',
        title: 'Personalization',
        detail: `Coaching style ${input.personalizationSnapshot.preferredCoachingStyle}`,
        metadata: {
          trend: input.personalizationSnapshot.trend,
          riskOfDisengagement:
            input.personalizationSnapshot.riskOfDisengagement,
        },
      }),
    );
  }

  return dedupeEvidence(evidence).filter((item) =>
    participatingExperts.includes(item.expert),
  );
}

function buildRecommendations(
  coachDecision: CoachDecision,
  primaryExpert: CoachExpertName,
  evidence: CoachEvidence[],
): CoachUnifiedRecommendation[] {
  const seen = new Set<string>();
  const recommendations: CoachUnifiedRecommendation[] = [];

  coachDecision.actionItems.forEach((item, index) => {
    const text = item.trim();

    if (!text) {
      return;
    }

    const normalized = normalizeText(text);
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);

    const priority = isSafetyAction(text)
      ? 'SAFETY_CRITICAL'
      : index === 0
        ? 'PRIMARY'
        : 'SUPPORTING';

    recommendations.push({
      code: normalized,
      title: text,
      detail: text,
      expert: primaryExpert,
      priority,
      supportingEvidenceIds: evidence
        .filter((item) => item.expert === primaryExpert)
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        index,
      },
    });
  });

  return recommendations.sort((left, right) => {
    const priorityOrder: Record<CoachRecommendationPriority, number> = {
      PRIMARY: 0,
      SAFETY_CRITICAL: 1,
      SUPPORTING: 2,
      INFORMATIONAL: 3,
    };

    return priorityOrder[left.priority] - priorityOrder[right.priority];
  });
}

function buildRisks(
  input: CoachIntelligenceInput,
  participatingExperts: CoachExpertName[],
  evidence: CoachEvidence[],
): CoachUnifiedRisk[] {
  const risks: CoachUnifiedRisk[] = [];

  if (input.recoverySnapshot) {
    const level = getRecoveryRiskLevel(input.recoverySnapshot.readinessScore);
    if (level !== 'LOW' && level !== 'UNKNOWN') {
      risks.push({
        level,
        sources: [
          'Recovery',
          ...(input.workout ? ['Workout'] : []),
        ] as CoachExpertName[],
        title: 'Recovery load',
        detail:
          level === 'CRITICAL'
            ? 'Recovery should be prioritized before higher intensity work.'
            : 'Training intensity should stay conservative today.',
        evidenceIds: evidence
          .filter(
            (item) => item.expert === 'Recovery' || item.expert === 'Workout',
          )
          .map((item) => item.id)
          .slice(0, 4),
        metadata: {
          readinessScore: input.recoverySnapshot.readinessScore,
          fatigueScore: input.recoverySnapshot.fatigueScore,
        },
      });
    }
  }

  if (
    input.nutrition?.progress &&
    input.nutrition.progress.adherencePercentage < 75
  ) {
    risks.push({
      level:
        input.nutrition.progress.adherencePercentage < 55 ? 'HIGH' : 'MEDIUM',
      sources: ['Nutrition', 'Goal'] as CoachExpertName[],
      title: 'Nutrition consistency',
      detail: 'Nutrition adherence is lagging behind the plan.',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Nutrition' || item.expert === 'Goal')
        .map((item) => item.id)
        .slice(0, 4),
      metadata: {
        adherencePercentage: input.nutrition.progress.adherencePercentage,
      },
    });
  }

  if (
    input.consistencySummary &&
    input.consistencySummary.riskLevel !== 'low'
  ) {
    risks.push({
      level: input.consistencySummary.riskLevel === 'high' ? 'HIGH' : 'MEDIUM',
      sources: ['Habit', 'Motivation'] as CoachExpertName[],
      title: 'Habit consistency',
      detail: 'Consistency needs attention to keep momentum stable.',
      evidenceIds: evidence
        .filter(
          (item) => item.expert === 'Habit' || item.expert === 'Motivation',
        )
        .map((item) => item.id)
        .slice(0, 4),
      metadata: {
        riskLevel: input.consistencySummary.riskLevel,
        currentStreak: input.consistencySummary.currentStreak,
      },
    });
  }

  if (
    input.goalProgressSnapshot &&
    input.goalProgressSnapshot.trend === 'declining'
  ) {
    risks.push({
      level: 'MEDIUM',
      sources: ['Goal', 'Progress'] as CoachExpertName[],
      title: 'Goal progress trend',
      detail: 'Progress is trending down and needs a small correction.',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Goal' || item.expert === 'Progress')
        .map((item) => item.id)
        .slice(0, 4),
      metadata: {
        trend: input.goalProgressSnapshot.trend,
      },
    });
  }

  if (
    input.currentGoal &&
    input.currentGoal.status === 'active' &&
    input.progressSummary &&
    input.progressSummary.currentStreak === 0 &&
    input.progressSummary.workoutsCompleted === 0
  ) {
    risks.push({
      level: 'LOW',
      sources: ['Progress', 'Goal'] as CoachExpertName[],
      title: 'Momentum risk',
      detail: 'No recent progress signal is available yet.',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Progress' || item.expert === 'Goal')
        .map((item) => item.id)
        .slice(0, 4),
      metadata: {},
    });
  }

  return risks.sort(
    (left, right) => riskRank(left.level) - riskRank(right.level),
  );
}

function buildConfidence(input: {
  evidence: CoachEvidence[];
  participatingExperts: CoachExpertName[];
  input: CoachIntelligenceInput;
  currentRisk: CoachUnifiedRisk | null;
  coachDecision: CoachDecision;
}): CoachUnifiedConfidence {
  const evidenceCount = input.evidence.length;
  const supportingEvidenceCount = Math.max(0, evidenceCount - 1);
  const missingEvidenceCount = getMissingEvidenceCount(input.input);
  const policyConfidence = missingEvidenceCount > 2 ? 'MEDIUM' : 'HIGH';
  const runtimeCompleteness =
    evidenceCount >= 5 ? 'HIGH' : evidenceCount >= 3 ? 'MEDIUM' : 'LOW';

  const level = resolveConfidenceLevel({
    evidenceCount,
    missingEvidenceCount,
    currentRisk: input.currentRisk,
    generatedBy: input.coachDecision.generatedBy,
  });

  return {
    level,
    evidenceCount,
    supportingEvidenceCount,
    missingEvidenceCount,
    policyConfidence,
    runtimeCompleteness,
    detail: buildConfidenceDetail(level, evidenceCount, missingEvidenceCount),
  };
}

function buildKeyFindings(
  input: CoachIntelligenceInput,
  evidence: CoachEvidence[],
): CoachUnifiedAssessment[] {
  const findings: CoachUnifiedAssessment[] = [];

  if (input.recoverySnapshot && input.recoverySnapshot.readinessScore < 60) {
    findings.push({
      code: 'LOW_RECOVERY',
      title: 'Low recovery',
      detail: 'Recovery is below the preferred threshold.',
      expert: 'Recovery',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Recovery')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        readinessScore: input.recoverySnapshot.readinessScore,
      },
    });
  }

  if (
    input.nutrition?.progress &&
    input.nutrition.progress.adherencePercentage < 75
  ) {
    findings.push({
      code: 'NUTRITION_INCONSISTENCY',
      title: 'Nutrition inconsistency',
      detail: 'Nutrition adherence is not matching the plan yet.',
      expert: 'Nutrition',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Nutrition')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        adherencePercentage: input.nutrition.progress.adherencePercentage,
      },
    });
  }

  if (
    input.goalProgressSnapshot &&
    input.goalProgressSnapshot.progressPercentage < 40 &&
    input.goalProgressSnapshot.trend === 'declining'
  ) {
    findings.push({
      code: 'PLATEAU',
      title: 'Plateau detected',
      detail: 'Goal progress is flattening out.',
      expert: 'Progress',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Goal' || item.expert === 'Progress')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        progressPercentage: input.goalProgressSnapshot.progressPercentage,
      },
    });
  }

  if (
    input.progressSummary &&
    input.progressSummary.workoutsCompleted >= 3 &&
    input.progressSummary.currentStreak >= 3
  ) {
    findings.push({
      code: 'STRONG_PROGRESS',
      title: 'Strong progress',
      detail: 'Training consistency is trending in the right direction.',
      expert: 'Progress',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Progress')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        workoutsCompleted: input.progressSummary.workoutsCompleted,
        currentStreak: input.progressSummary.currentStreak,
      },
    });
  }

  if (
    input.habitSnapshot &&
    (input.habitSnapshot.streakDays >= 5 ||
      input.habitSnapshot.consistencyScore >= 75)
  ) {
    findings.push({
      code: 'CONSISTENT_HABITS',
      title: 'Consistent habits',
      detail: 'Habit adherence is holding steady.',
      expert: 'Habit',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Habit')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        streakDays: input.habitSnapshot.streakDays,
        consistencyScore: input.habitSnapshot.consistencyScore,
      },
    });
  }

  if (
    input.personalizationSnapshot &&
    input.personalizationSnapshot.engagementProfile === 'high'
  ) {
    findings.push({
      code: 'HIGH_MOTIVATION',
      title: 'High motivation',
      detail: 'The current engagement signal is strong.',
      expert: 'Motivation',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Motivation')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        engagementProfile: input.personalizationSnapshot.engagementProfile,
      },
    });
  }

  if (
    input.currentGoal &&
    (input.currentGoal.status === 'achieved' ||
      input.goalAchievements?.some(
        (achievement) => achievement.goalId === input.currentGoal?.id,
      ))
  ) {
    findings.push({
      code: 'RECENT_MILESTONE',
      title: 'Recent milestone',
      detail: 'The goal is close to or has reached a milestone.',
      expert: 'Goal',
      evidenceIds: evidence
        .filter((item) => item.expert === 'Goal')
        .map((item) => item.id)
        .slice(0, 3),
      metadata: {
        goalStatus: input.currentGoal.status,
      },
    });
  }

  const byOrder = new Map(
    KEY_FINDING_ORDER.map((code, index) => [code, index]),
  );

  return findings.sort(
    (left, right) =>
      (byOrder.get(left.code) ?? 999) - (byOrder.get(right.code) ?? 999),
  );
}

function buildConflicts(
  input: CoachIntelligenceInput,
  currentRisk: CoachUnifiedRisk | null,
  participatingExperts: CoachExpertName[],
): CoachCompositionConflict[] {
  const conflicts: CoachCompositionConflict[] = [];

  if (
    currentRisk &&
    currentRisk.level !== 'LOW' &&
    input.workout &&
    participatingExperts.includes('Workout') &&
    participatingExperts.includes('Recovery')
  ) {
    conflicts.push({
      type: 'WORKOUT_RECOVERY',
      experts: ['Workout', 'Recovery'],
      severity: currentRisk.level,
      resolution: 'Recovery takes priority before increasing load.',
      metadata: {
        readinessScore: input.recoverySnapshot?.readinessScore ?? null,
        workoutTitle: input.workout.title,
      },
    });
  }

  if (
    input.currentGoal?.type === 'lose_weight' &&
    typeof input.nutrition?.nutritionFocus === 'string' &&
    input.nutrition.nutritionFocus.toLowerCase().includes('increase calories')
  ) {
    conflicts.push({
      type: 'NUTRITION_GOAL',
      experts: ['Nutrition', 'Goal'],
      severity: 'HIGH',
      resolution: 'Keep nutrition aligned with the active goal.',
      metadata: {
        nutritionFocus: input.nutrition.nutritionFocus,
        goalType: input.currentGoal.type,
      },
    });
  }

  return conflicts;
}

function buildSummary(
  coachDecision: CoachDecision,
  currentFocus: CoachFocus,
  topRecommendation: CoachUnifiedRecommendation | null,
  currentRisk: CoachUnifiedRisk | null,
): string {
  if (coachDecision.headline.trim()) {
    return coachDecision.headline.trim();
  }

  const focusLabel = getCoachFocusLabel(currentFocus);
  const recommendationLabel = topRecommendation?.title ?? 'Stay on plan';
  const riskLabel = currentRisk
    ? getCoachRiskLabel(currentRisk.level)
    : 'No major risk';

  return `${focusLabel} focus. ${recommendationLabel}. ${riskLabel}.`;
}

function buildConfidenceDetail(
  level: CoachConfidenceLevel,
  evidenceCount: number,
  missingEvidenceCount: number,
): string {
  if (level === 'HIGH') {
    return `${evidenceCount} evidence signals with limited gaps.`;
  }

  if (level === 'MEDIUM') {
    return `${evidenceCount} evidence signals with a few missing inputs.`;
  }

  return `${evidenceCount} evidence signals and ${missingEvidenceCount} gaps.`;
}

function buildSupportingEvidenceSummary(evidence: CoachEvidence[]): string {
  const titles = evidence.slice(0, 3).map((item) => item.title);
  return titles.join(' · ');
}

function buildExplanationSummary(
  intelligence: CoachUnifiedCoachIntelligence,
  persona: CoachPersonaProfile | null,
): string {
  const focus = getCoachFocusLabel(intelligence.currentFocus);
  const risk = intelligence.currentRisk
    ? getCoachRiskLabel(intelligence.currentRisk.level)
    : 'No major risk';
  const tone = persona?.tone ?? 'SUPPORTIVE';
  return `${focus} focus. ${risk}. ${tone.toLowerCase()} guidance.`;
}

function buildMetadata(coachDecision: CoachDecision): CoachCompositionMetadata {
  return {
    source: 'legacy',
    generatedAt: coachDecision.createdAt,
    updatedAt: coachDecision.updatedAt,
    executionDurationMs: 0,
  };
}

function buildMissingEvidence(
  evidence: CoachEvidence[],
): CoachMissingEvidence[] {
  const covered = new Set(evidence.map((item) => item.expert));
  const missing: CoachMissingEvidence[] = [];

  const candidates: Array<{
    type: string;
    source: string;
    expert: CoachExpertName;
  }> = [
    { type: 'recovery_check_in', source: 'Recovery', expert: 'Recovery' },
    { type: 'nutrition_logs', source: 'Nutrition', expert: 'Nutrition' },
    { type: 'goal_history', source: 'Goal', expert: 'Goal' },
    { type: 'habit_history', source: 'Habit', expert: 'Habit' },
    { type: 'progress_summary', source: 'Progress', expert: 'Progress' },
  ];

  candidates.forEach((candidate) => {
    if (!covered.has(candidate.expert)) {
      missing.push({
        type: candidate.type,
        source: candidate.source,
        expert: candidate.expert,
        availability: 'MISSING',
        metadata: {},
      });
    }
  });

  return missing;
}

function mapDecisionReason(
  finding: CoachUnifiedAssessment,
): CoachDecisionReason {
  return {
    code: finding.code,
    title: finding.title,
    supportingEvidenceIds: finding.evidenceIds,
    supportingExperts: [finding.expert],
    priority: finding.code === 'LOW_RECOVERY' ? 'primary' : 'supporting',
    reasonCategory: getReasonCategory(finding.code),
    metadata: finding.metadata,
  };
}

function mapRecommendationReason(
  recommendation: CoachUnifiedRecommendation,
  evidence: CoachEvidence[],
): CoachRecommendationReason {
  return {
    recommendationCode: recommendation.code,
    supportingEvidenceIds: recommendation.supportingEvidenceIds,
    supportingExperts: recommendation.supportingEvidenceIds.length
      ? evidence
          .filter((item) =>
            recommendation.supportingEvidenceIds.includes(item.id),
          )
          .map((item) => item.expert)
      : [recommendation.expert],
    priority: recommendation.priority,
    reasonCategory: getReasonCategoryFromExpert(recommendation.expert),
    metadata: recommendation.metadata,
  };
}

function mapRiskExplanation(risk: CoachUnifiedRisk): CoachRiskExplanation {
  return {
    riskLevel: risk.level,
    supportingEvidenceIds: risk.evidenceIds,
    supportingExperts: risk.sources,
    severity: risk.level,
    metadata: risk.metadata,
  };
}

function mapConfidenceExplanation(
  confidence: CoachUnifiedConfidence,
  supportingExpertCount: number,
  missingEvidenceCount: number,
): CoachConfidenceExplanation {
  return {
    confidence: confidence.level,
    supportingEvidenceCount: confidence.supportingEvidenceCount,
    supportingExpertCount,
    missingEvidenceCount,
    policyRestrictions: [],
    metadata: {
      policyConfidence: confidence.policyConfidence,
      runtimeCompleteness: confidence.runtimeCompleteness,
    },
  };
}

function mapConflictExplanation(
  conflict: CoachCompositionConflict,
): CoachConflictExplanation {
  return {
    conflictType: conflict.type,
    experts: conflict.experts,
    resolution: conflict.resolution,
    resolvedBy: 'deterministic-policy',
    severity: conflict.severity,
    metadata: conflict.metadata,
  };
}

function buildCommunicationRules(input: {
  tone: CoachTone;
  urgency: CoachUrgency;
  safetyLevel: CoachSafetyLevel;
  intelligence: CoachUnifiedCoachIntelligence;
}): string[] {
  const rules = new Set<string>(['DO_NOT_INFER_MISSING_DATA']);

  if (input.safetyLevel === 'STRICT') {
    rules.add('LEAD_WITH_SAFETY');
    rules.add('KEEP_COPY_CONCISE');
    rules.add('USE_CALM_LANGUAGE');
  }

  if (input.urgency === 'CRITICAL' || input.urgency === 'HIGH') {
    rules.add('GIVE_CLEAR_NEXT_STEP');
    rules.add('USE_DIRECT_LANGUAGE');
  }

  if (input.tone === 'CELEBRATORY') {
    rules.add('ACKNOWLEDGE_PROGRESS');
    rules.add('USE_ENCOURAGING_LANGUAGE');
  }

  if (input.tone === 'ANALYTICAL') {
    rules.add('EXPLAIN_TRADEOFFS');
    rules.add('USE_ANALYTICAL_LANGUAGE');
  }

  if (input.intelligence.conflicts.length > 0) {
    rules.add('CALL_OUT_CONFLICTS');
  }

  if (input.intelligence.confidence.level === 'LOW') {
    rules.add('KEEP_COPY_CONCISE');
  }

  return Array.from(rules);
}

function resolveTone(input: {
  riskLevel: CoachRiskLevel;
  hasMilestone: boolean;
  hasPlateau: boolean;
  hasStrongProgress: boolean;
  focus: CoachFocus;
}): CoachTone {
  if (input.riskLevel === 'CRITICAL' || input.focus === 'SAFETY') {
    return 'CAUTIOUS';
  }

  if (input.hasMilestone || input.hasStrongProgress) {
    return 'CELEBRATORY';
  }

  if (
    input.hasPlateau ||
    input.focus === 'PROGRESS' ||
    input.focus === 'GOALS'
  ) {
    return 'ANALYTICAL';
  }

  if (input.focus === 'RECOVERY') {
    return 'CALM';
  }

  if (input.riskLevel === 'HIGH') {
    return 'DIRECT';
  }

  return 'SUPPORTIVE';
}

function resolveVerbosity(
  intelligence: CoachUnifiedCoachIntelligence,
  personalizationSnapshot: PersonalizationSnapshot | null | undefined,
  urgency: CoachUrgency,
): CoachVerbosity {
  if (urgency === 'CRITICAL') {
    return 'VERY_SHORT';
  }

  if (urgency === 'HIGH') {
    return 'SHORT';
  }

  if (
    intelligence.keyFindings.length >= 4 ||
    intelligence.evidence.length >= 6
  ) {
    return 'DETAILED';
  }

  if (personalizationSnapshot?.preferredCoachingStyle === 'educational') {
    return 'DETAILED';
  }

  return 'NORMAL';
}

function resolveDirectiveLevel(
  riskLevel: CoachRiskLevel,
  intelligence: CoachUnifiedCoachIntelligence,
): CoachDirectiveLevel {
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    return 'HIGH';
  }

  if (intelligence.recommendations.length >= 2) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function resolveEmpathyLevel(
  intelligence: CoachUnifiedCoachIntelligence,
  currentGoal: CurrentGoal | null | undefined,
): CoachEmpathyLevel {
  if (intelligence.currentRisk?.level === 'CRITICAL') {
    return 'HIGH';
  }

  if (
    intelligence.keyFindings.some(
      (finding) => finding.code === 'CONSISTENT_HABITS',
    )
  ) {
    return 'LOW';
  }

  if (
    currentGoal?.status === 'active' &&
    intelligence.supportingExperts.length >= 3
  ) {
    return 'MEDIUM';
  }

  return 'HIGH';
}

function resolveEncouragementLevel(
  intelligence: CoachUnifiedCoachIntelligence,
): CoachEncouragementLevel {
  if (
    intelligence.keyFindings.some(
      (finding) => finding.code === 'RECENT_MILESTONE',
    )
  ) {
    return 'HIGH';
  }

  if (
    intelligence.keyFindings.some(
      (finding) => finding.code === 'STRONG_PROGRESS',
    )
  ) {
    return 'HIGH';
  }

  if (intelligence.currentRisk?.level === 'CRITICAL') {
    return 'LOW';
  }

  return 'MEDIUM';
}

function resolveTechnicalDepth(
  personalizationSnapshot: PersonalizationSnapshot | null | undefined,
): CoachTechnicalDepth {
  switch (personalizationSnapshot?.preferredCoachingStyle) {
    case 'direct':
      return 'ADVANCED';
    case 'educational':
      return 'INTERMEDIATE';
    case 'motivational':
      return 'BEGINNER';
    case 'balanced':
    default:
      return 'INTERMEDIATE';
  }
}

function resolveUrgency(
  riskLevel: CoachRiskLevel,
  confidenceLevel: CoachConfidenceLevel,
): CoachUrgency {
  if (riskLevel === 'CRITICAL') {
    return 'CRITICAL';
  }

  if (riskLevel === 'HIGH') {
    return 'HIGH';
  }

  if (riskLevel === 'MEDIUM' && confidenceLevel !== 'HIGH') {
    return 'MEDIUM';
  }

  if (confidenceLevel === 'LOW') {
    return 'LOW';
  }

  return 'NONE';
}

function resolveSafetyLevel(riskLevel: CoachRiskLevel): CoachSafetyLevel {
  if (riskLevel === 'CRITICAL') {
    return 'STRICT';
  }

  if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
    return 'ELEVATED';
  }

  return 'NORMAL';
}

function resolveCelebrationLevel(
  intelligence: CoachUnifiedCoachIntelligence,
): CoachCelebrationLevel {
  if (
    intelligence.keyFindings.some(
      (finding) => finding.code === 'RECENT_MILESTONE',
    )
  ) {
    return 'HIGH';
  }

  if (
    intelligence.keyFindings.some(
      (finding) => finding.code === 'STRONG_PROGRESS',
    )
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function resolveConfidenceLevel(input: {
  evidenceCount: number;
  missingEvidenceCount: number;
  currentRisk: CoachUnifiedRisk | null;
  generatedBy: CoachDecision['generatedBy'];
}): CoachConfidenceLevel {
  const baseScore =
    input.evidenceCount >= 6
      ? 3
      : input.evidenceCount >= 4
        ? 2
        : input.evidenceCount >= 2
          ? 1
          : 0;
  const completenessPenalty = Math.min(2, input.missingEvidenceCount);
  const generatedByBonus = input.generatedBy === 'deterministic' ? 1 : 0;
  const riskPenalty = input.currentRisk?.level === 'CRITICAL' ? 1 : 0;
  const score =
    baseScore + generatedByBonus - completenessPenalty - riskPenalty;

  if (score >= 3) {
    return 'HIGH';
  }

  if (score >= 1) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getRecoveryRiskLevel(score: number): CoachRiskLevel {
  if (score < 40) {
    return 'CRITICAL';
  }

  if (score < 60) {
    return 'HIGH';
  }

  if (score < 75) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getRecoveryImportance(score: number): CoachEvidenceImportance {
  if (score < 40) {
    return 'CRITICAL';
  }

  if (score < 60) {
    return 'HIGH';
  }

  if (score < 75) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getNutritionImportance(
  adherencePercentage: number,
): CoachEvidenceImportance {
  if (adherencePercentage < 55) {
    return 'CRITICAL';
  }

  if (adherencePercentage < 75) {
    return 'HIGH';
  }

  if (adherencePercentage < 90) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getGoalProgressImportance(
  progressPercentage: number,
): CoachEvidenceImportance {
  if (progressPercentage < 25) {
    return 'HIGH';
  }

  if (progressPercentage < 50) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getHabitImportance(score: number): CoachEvidenceImportance {
  if (score < 45) {
    return 'HIGH';
  }

  if (score < 70) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getProgressImportance(currentStreak: number): CoachEvidenceImportance {
  if (currentStreak === 0) {
    return 'HIGH';
  }

  if (currentStreak < 3) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getMotivationImportance(
  engagementProfile: PersonalizationSnapshot['engagementProfile'],
): CoachEvidenceImportance {
  if (engagementProfile === 'high') {
    return 'LOW';
  }

  if (engagementProfile === 'medium') {
    return 'MEDIUM';
  }

  return 'HIGH';
}

function confidenceFromScore(score: number): CoachConfidenceLevel {
  if (score >= 75) {
    return 'HIGH';
  }

  if (score >= 45) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function confidenceFromGeneratedBy(
  coachDecision: CoachDecision,
): CoachConfidenceLevel {
  return coachDecision.generatedBy === 'deterministic' ? 'HIGH' : 'MEDIUM';
}

function createEvidence(input: CoachEvidence): CoachEvidence {
  return input;
}

function buildWorkoutEvidenceDetail(workout: TodayWorkout): string {
  if (workout.focus.trim() && workout.format.trim()) {
    return `${workout.focus.trim()} · ${workout.format.trim()}`;
  }

  if (workout.focus.trim()) {
    return workout.focus.trim();
  }

  return workout.title.trim();
}

function formatGoalTitle(goal: CurrentGoal): string {
  return `${goal.type.replaceAll('_', ' ')} goal`;
}

function isSafetyAction(text: string): boolean {
  const normalized = normalizeText(text);
  return SAFETY_TERMS.some((term) => normalized.includes(term));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupeEvidence(evidence: CoachEvidence[]): CoachEvidence[] {
  const seen = new Set<string>();
  const items: CoachEvidence[] = [];

  evidence.forEach((item) => {
    const key = `${item.expert}:${normalizeText(item.title)}:${normalizeText(
      item.detail ?? '',
    )}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(item);
  });

  return items;
}

function getMissingEvidenceCount(input: CoachIntelligenceInput): number {
  return [
    input.recoverySnapshot,
    input.nutrition,
    input.goalProgressSnapshot,
    input.habitSnapshot,
    input.progressSummary,
  ].filter(Boolean).length >= 3
    ? 0
    : 3 -
        [
          input.recoverySnapshot,
          input.nutrition,
          input.goalProgressSnapshot,
          input.habitSnapshot,
          input.progressSummary,
        ].filter(Boolean).length;
}

function riskRank(level: CoachRiskLevel): number {
  switch (level) {
    case 'CRITICAL':
      return 0;
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 3;
    case 'UNKNOWN':
    default:
      return 4;
  }
}

function getReasonCategory(
  code: CoachUnifiedAssessmentCode | string,
): CoachDecisionReason['reasonCategory'] {
  switch (code) {
    case 'LOW_RECOVERY':
      return 'RECOVERY';
    case 'NUTRITION_INCONSISTENCY':
      return 'NUTRITION';
    case 'PLATEAU':
      return 'PROGRESS';
    case 'CONSISTENT_HABITS':
      return 'CONSISTENCY';
    case 'HIGH_MOTIVATION':
      return 'GOALS';
    case 'RECENT_MILESTONE':
      return 'GOALS';
    case 'STRONG_PROGRESS':
    default:
      return 'PERFORMANCE';
  }
}

function getReasonCategoryFromExpert(
  expert: CoachExpertName,
): CoachRecommendationReason['reasonCategory'] {
  switch (expert) {
    case 'Workout':
      return 'WORKOUT';
    case 'Nutrition':
      return 'NUTRITION';
    case 'Recovery':
      return 'RECOVERY';
    case 'Goal':
      return 'GOALS';
    case 'Habit':
      return 'CONSISTENCY';
    case 'Progress':
      return 'PROGRESS';
    case 'Motivation':
    default:
      return 'PERFORMANCE';
  }
}
