import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';
import type { RecoverySnapshot } from '../../../../../recovery/domain/entities/recovery-snapshot.entity';
import type {
  RecoveryAnalysis,
  RecoveryConfidence,
  RecoveryGoalAlignment,
  RecoveryNutritionSupportLevel,
  RecoveryPriority,
  RecoveryReadinessAssessment,
  RecoveryRecommendation,
  RecoveryRecommendationCode,
  RecoveryRiskAssessment,
  RecoveryStatus,
  RecoveryTrainingImpact,
  RecoveryTrendAssessment,
  RecoveryTrendAssessmentShape,
  TrainingImpactAssessment,
  RecoveryExpertContribution,
} from './recovery-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const RECOVERY_EXPERT_ID = 'RecoveryExpert';

const RECOVERY_PRIORITY_WEIGHT: Record<RecoveryPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RECOVERY_RECOMMENDATION_ORDER: readonly RecoveryRecommendationCode[] =
  Object.freeze([
    'TAKE_FULL_RECOVERY_DAY',
    'PRIORITIZE_RECOVERY',
    'REDUCE_TODAYS_INTENSITY',
    'REDUCE_TODAYS_VOLUME',
    'USE_TECHNIQUE_ONLY',
    'COMPLETE_MOBILITY_WORK',
    'MAINTAIN_RECOVERY_ROUTINE',
    'IMPROVE_SLEEP_CONSISTENCY',
    'PRIORITIZE_HYDRATION',
    'PROCEED_WITH_TODAYS_SESSION',
  ]);

type RecoverySnapshotLike = Pick<
  RecoverySnapshot,
  | 'date'
  | 'readinessScore'
  | 'fatigueScore'
  | 'recoveryTrend'
  | 'recommendedIntensity'
  | 'influences'
> & {
  createdAt?: Date;
};

export class RecoveryExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: RECOVERY_EXPERT_ID,
      displayName: 'Recovery Expert',
      version: COACH_EXPERT_VERSION,
      category: 'RECOVERY',
      supportedIntents: [
        'RECOVERY',
        'TRAINING',
        'GOALS',
        'PLANNING',
        'MOTIVATION',
      ],
      supportedDomains: ['recovery', 'training', 'goals', 'progress'],
      estimatedCost: 2,
      estimatedLatencyMs: 18,
      priority: 95,
      capabilities: [
        'RECOVERY_SPECIALIST',
        'COACH_ROUTING',
        'CONTEXT_SYNTHESIS',
      ],
      enabled: true,
    });
  }

  override loadContext(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertContext {
    void input;
    const analysis = this.buildAnalysis(context);

    return Object.freeze({
      ...context,
      runtimeMetadata: Object.freeze({
        ...context.runtimeMetadata,
        recoveryExpert: Object.freeze({
          expertId: this.metadata.id,
          recoveryStatus: analysis.recoveryStatus,
          readinessLevel: analysis.readiness.level,
          trend: analysis.trend.trend,
          trainingImpact: analysis.trainingImpact.impact,
          confidence: analysis.confidence,
          riskLevel: analysis.risks[0]?.level ?? 'LOW',
          recommendationCodes: analysis.recommendations.map(
            (recommendation) => recommendation.code,
          ),
        }),
      }),
    });
  }

  override analyze(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertResult {
    const analysis = this.buildAnalysis(context);
    const contribution = this.buildContribution(analysis, context);
    const contributions = this.buildContributions(contribution);

    return {
      expertId: this.metadata.id,
      summary: contribution.summary,
      contributions,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        category: this.metadata.category,
        priority: contribution.priority,
        intent: input.intent,
        selectedDomainCount: input.selectedDomains.length,
        selectionReason: context.selectionReason,
        runtimeMode: 'deterministic-domain-specialist',
        analysis: contribution.analysis,
        recommendations: contribution.recommendations,
        risks: contribution.risks,
        recoveryStatus: contribution.recoveryStatus,
        readiness: contribution.readiness,
        trend: contribution.trend,
        trainingImpact: contribution.trainingImpact,
        nutritionSupport: contribution.nutritionSupport,
        goalAlignment: contribution.goalAlignment,
        confidence: contribution.confidence,
      }),
    };
  }

  override contribute(
    input: CoachExpertRequest,
    context: CoachExpertContext,
    result: CoachExpertResult,
  ): readonly CoachExpertContribution[] {
    void input;
    void context;
    return result.contributions;
  }

  private buildAnalysis(context: CoachExpertContext): RecoveryAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildBlockedAnalysis(Boolean(healthContext));
    }

    const recoveryHistory = [...(context.recoveryHistory ?? [])];
    const latestSnapshot = this.resolveLatestSnapshot(
      healthContext.recoverySnapshot,
      recoveryHistory,
    );

    if (!latestSnapshot) {
      return this.buildMissingRecoveryAnalysis(healthContext, recoveryHistory);
    }

    const readiness = this.buildReadinessAssessment(
      latestSnapshot,
      healthContext,
    );
    const trend = this.buildTrendAssessment(latestSnapshot, recoveryHistory);
    const nutritionSupport = this.buildNutritionSupport({
      healthContext,
      todayNutrition: context.todayNutrition,
      nutritionLogs: context.nutritionLogs,
    });
    const goalAlignment = this.resolveGoalAlignment(
      healthContext,
      latestSnapshot,
    );
    const trainingImpact = this.buildTrainingImpact({
      healthContext,
      snapshot: latestSnapshot,
      readiness,
      trend,
      nutritionSupport,
    });
    const recoveryStatus = this.resolveRecoveryStatus({
      readiness,
      trend,
      nutritionSupport,
      healthContext,
      snapshot: latestSnapshot,
      recoveryHistory,
    });
    const recommendations = this.buildRecommendations({
      recoveryStatus,
      readiness,
      trend,
      trainingImpact,
      nutritionSupport,
      goalAlignment,
      healthContext,
      recoveryHistory,
    });
    const risks = [
      this.buildRiskAssessment({
        recoveryStatus,
        readiness,
        trend,
        trainingImpact,
        nutritionSupport,
        healthContext,
        recoveryHistory,
      }),
    ];
    const confidence = this.buildConfidence({
      healthContext,
      recoveryHistory,
      snapshot: latestSnapshot,
      nutritionSupport,
      readiness,
      trend,
    });
    const priority = risks[0].level;
    const signals = this.buildSignals({
      recoveryStatus,
      readiness,
      trend,
      trainingImpact,
      nutritionSupport,
      goalAlignment,
      healthContext,
      todayNutrition: context.todayNutrition,
      nutritionLogs: context.nutritionLogs,
      snapshot: latestSnapshot,
      recoveryHistory,
    });

    return Object.freeze({
      recoveryStatus,
      readiness,
      trend,
      trainingImpact,
      nutritionSupport,
      goalAlignment,
      recommendations: Object.freeze(recommendations),
      risks: Object.freeze(risks),
      confidence,
      priority,
      signals: Object.freeze(signals),
      recoverySnapshotPresent: Boolean(healthContext.recoverySnapshot),
      recoveryHistoryCount: recoveryHistory.length,
      recentWorkoutCount: healthContext.recentWorkoutLogs.length,
      sleepQuality: healthContext.latestCheckIn?.sleepQuality ?? null,
      muscleSoreness: healthContext.latestCheckIn?.muscleSoreness ?? null,
      readinessScore: latestSnapshot.readinessScore ?? null,
      fatigueScore: latestSnapshot.fatigueScore ?? null,
      recommendedIntensity: latestSnapshot.recommendedIntensity ?? null,
    });
  }

  private buildBlockedAnalysis(
    healthContextAvailable: boolean,
  ): RecoveryAnalysis {
    const riskAssessment: RecoveryRiskAssessment = Object.freeze({
      level: 'CRITICAL',
      summary:
        'Recovery analysis is blocked by policy or missing trusted health context.',
      factors: Object.freeze([
        'policy_blocked',
        ...(healthContextAvailable ? [] : ['missing_health_context']),
      ]),
      metadata: Object.freeze({
        policyBlocked: true,
        healthContextAvailable,
      }),
    });

    return Object.freeze({
      recoveryStatus: 'UNKNOWN',
      readiness: Object.freeze({
        score: null,
        level: 'UNKNOWN',
        recommendedIntensity: null,
        fatigueScore: null,
        summary: 'Recovery readiness is unavailable.',
        metadata: Object.freeze({ policyBlocked: true }),
      }),
      trend: Object.freeze({
        trend: 'UNKNOWN',
        summary: 'Recovery trend is unavailable.',
        factors: Object.freeze(['policy_blocked']),
        metadata: Object.freeze({ policyBlocked: true }),
      }),
      trainingImpact: Object.freeze({
        impact: 'FULL_REST',
        summary: 'Training impact is unavailable.',
        factors: Object.freeze(['policy_blocked']),
        metadata: Object.freeze({ policyBlocked: true }),
      }),
      nutritionSupport: Object.freeze({
        level: 'UNKNOWN',
        summary: 'Nutrition support for recovery is unavailable.',
        factors: Object.freeze(['policy_blocked']),
        metadata: Object.freeze({ policyBlocked: true }),
      }),
      goalAlignment: 'unknown',
      recommendations: Object.freeze([]),
      risks: Object.freeze([riskAssessment]),
      confidence: 'LOW',
      priority: 'CRITICAL',
      signals: Object.freeze([
        'analysis_blocked_by_policy',
        `health_context_available=${healthContextAvailable}`,
      ]),
      recoverySnapshotPresent: false,
      recoveryHistoryCount: 0,
      recentWorkoutCount: 0,
      sleepQuality: null,
      muscleSoreness: null,
      readinessScore: null,
      fatigueScore: null,
      recommendedIntensity: null,
    });
  }

  private buildMissingRecoveryAnalysis(
    healthContext: UserHealthContext,
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): RecoveryAnalysis {
    const riskAssessment: RecoveryRiskAssessment = Object.freeze({
      level: 'HIGH',
      summary: 'Current recovery snapshot is missing.',
      factors: Object.freeze(['missing_recovery_snapshot']),
      metadata: Object.freeze({
        recoveryHistoryCount: recoveryHistory.length,
        recentWorkoutCount: healthContext.recentWorkoutLogs.length,
      }),
    });

    return Object.freeze({
      recoveryStatus: 'UNKNOWN',
      readiness: Object.freeze({
        score: null,
        level: 'UNKNOWN',
        recommendedIntensity: null,
        fatigueScore: null,
        summary: 'Recovery readiness cannot be evaluated without a snapshot.',
        metadata: Object.freeze({}),
      }),
      trend: Object.freeze({
        trend: this.resolveTrendFromHistory(recoveryHistory),
        summary: 'Recovery trend is inferred from historical snapshots only.',
        factors: Object.freeze(['missing_current_recovery_snapshot']),
        metadata: Object.freeze({
          recoveryHistoryCount: recoveryHistory.length,
        }),
      }),
      trainingImpact: Object.freeze({
        impact: healthContext.todayWorkout
          ? 'REDUCED_INTENSITY'
          : 'ACTIVE_RECOVERY',
        summary:
          'Training impact is conservative without a current recovery snapshot.',
        factors: Object.freeze(['missing_current_recovery_snapshot']),
        metadata: Object.freeze({
          todayWorkoutAvailable: Boolean(healthContext.todayWorkout),
        }),
      }),
      nutritionSupport: this.buildNutritionSupport({
        healthContext,
        todayNutrition: undefined,
        nutritionLogs: undefined,
      }),
      goalAlignment: this.resolveGoalAlignment(healthContext, undefined),
      recommendations: Object.freeze([
        this.buildRecommendation(
          'PRIORITIZE_RECOVERY',
          'Prioritize recovery.',
          'A current recovery snapshot is unavailable.',
          'HIGH',
          {
            recoverySnapshotAvailable: false,
          },
        ),
      ]),
      risks: Object.freeze([riskAssessment]),
      confidence: this.buildConfidence({
        healthContext,
        recoveryHistory,
        snapshot: undefined,
        nutritionSupport: this.buildNutritionSupport({
          healthContext,
          todayNutrition: undefined,
          nutritionLogs: undefined,
        }),
        readiness: {
          score: null,
          level: 'UNKNOWN',
          recommendedIntensity: null,
          fatigueScore: null,
          summary: 'Recovery readiness cannot be evaluated without a snapshot.',
          metadata: Object.freeze({}),
        },
        trend: {
          trend: this.resolveTrendFromHistory(recoveryHistory),
          summary: 'Recovery trend is inferred from historical snapshots only.',
          factors: Object.freeze(['missing_current_recovery_snapshot']),
          metadata: Object.freeze({
            recoveryHistoryCount: recoveryHistory.length,
          }),
        },
      }),
      priority: 'HIGH',
      signals: Object.freeze([
        'recovery_snapshot_present=false',
        `recovery_history_count=${recoveryHistory.length}`,
        `recent_workout_count=${healthContext.recentWorkoutLogs.length}`,
      ]),
      recoverySnapshotPresent: false,
      recoveryHistoryCount: recoveryHistory.length,
      recentWorkoutCount: healthContext.recentWorkoutLogs.length,
      sleepQuality: healthContext.latestCheckIn?.sleepQuality ?? null,
      muscleSoreness: healthContext.latestCheckIn?.muscleSoreness ?? null,
      readinessScore: null,
      fatigueScore: null,
      recommendedIntensity: null,
    });
  }

  private resolveLatestSnapshot(
    currentSnapshot: UserHealthContext['recoverySnapshot'] | RecoverySnapshot | undefined,
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): RecoverySnapshotLike | undefined {
    if (currentSnapshot) {
      return {
        ...currentSnapshot,
      };
    }

    if (recoveryHistory.length === 0) {
      return undefined;
    }

    return recoveryHistory[recoveryHistory.length - 1];
  }

  private buildReadinessAssessment(
    snapshot: RecoverySnapshotLike,
    healthContext: UserHealthContext,
  ): RecoveryReadinessAssessment {
    const score = snapshot.readinessScore;
    const fatigueScore = snapshot.fatigueScore;
    const level = this.resolveReadinessLevel(score);

    return Object.freeze({
      score,
      level,
      recommendedIntensity: snapshot.recommendedIntensity,
      fatigueScore,
      summary: [
        `readiness=${typeof score === 'number' ? score : 'unknown'}`,
        `fatigue=${typeof fatigueScore === 'number' ? fatigueScore : 'unknown'}`,
        `recommended_intensity=${snapshot.recommendedIntensity}`,
        `level=${level}`,
      ].join('; '),
      metadata: Object.freeze({
        currentGoal: healthContext.goal ?? null,
        latestCheckInAvailable: Boolean(healthContext.latestCheckIn),
      }),
    });
  }

  private buildTrendAssessment(
    snapshot: RecoverySnapshotLike,
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): RecoveryTrendAssessmentShape {
    const trend = this.resolveTrend(snapshot, recoveryHistory);

    return Object.freeze({
      trend,
      summary: `trend=${trend}; history_count=${recoveryHistory.length}`,
      factors: Object.freeze([
        `current_trend=${snapshot.recoveryTrend}`,
        ...this.buildTrendFactors(snapshot, recoveryHistory),
      ]),
      metadata: Object.freeze({
        currentSnapshotAvailable: true,
        recoveryHistoryCount: recoveryHistory.length,
      }),
    });
  }

  private buildNutritionSupport(input: {
    healthContext: UserHealthContext;
    todayNutrition: CoachExpertContext['todayNutrition'];
    nutritionLogs: CoachExpertContext['nutritionLogs'];
  }): RecoveryAnalysis['nutritionSupport'] {
    const healthContext = input.healthContext;
    const todayNutrition = input.todayNutrition ?? null;
    const nutritionLogs = [...(input.nutritionLogs ?? [])];

    if (!healthContext.nutritionProfile) {
      return Object.freeze({
        level: 'UNKNOWN',
        summary:
          'Nutrition support cannot be evaluated without a nutrition profile.',
        factors: Object.freeze(['missing_nutrition_profile']),
        metadata: Object.freeze({}),
      });
    }

    const nutritionPlan = healthContext.nutritionProfile;
    const nutritionSummary = [
      `goal=${nutritionPlan.goal}`,
      `meals_per_day=${nutritionPlan.mealsPerDay}`,
      `dietary_restrictions=${nutritionPlan.dietaryRestrictions.length}`,
      `allergies=${nutritionPlan.allergies.length}`,
    ];

    const readinessScore = healthContext.recoverySnapshot?.readinessScore;
    const fatigueScore = healthContext.recoverySnapshot?.fatigueScore;
    const factors: string[] = [];
    let level: RecoveryNutritionSupportLevel = 'PARTIAL';

    if (!healthContext.recoverySnapshot) {
      level = 'UNKNOWN';
      factors.push('missing_current_recovery_snapshot');
    }

    if (todayNutrition) {
      const adherence = todayNutrition.progress.adherencePercentage;
      const proteinTarget = todayNutrition.progress.targetProteinGrams || 1;
      const caloriesTarget = todayNutrition.progress.targetCalories || 1;
      const proteinAdherence =
        todayNutrition.progress.consumedProteinGrams / proteinTarget;
      const calorieAdherence =
        todayNutrition.progress.consumedCalories / caloriesTarget;
      const skippedMeals = nutritionLogs.filter(
        (log) => log.status === 'skipped',
      ).length;
      const partialMeals = nutritionLogs.filter(
        (log) => log.status === 'partial',
      ).length;

      nutritionSummary.push(
        `adherence=${adherence}`,
        `skipped_meals=${skippedMeals}`,
        `partial_meals=${partialMeals}`,
      );

      if (
        adherence >= 90 &&
        proteinAdherence >= 0.85 &&
        calorieAdherence >= 0.85 &&
        skippedMeals === 0
      ) {
        level = 'SUPPORTIVE';
        factors.push('strong_today_nutrition_adherence');
      } else if (
        adherence >= 70 &&
        proteinAdherence >= 0.7 &&
        skippedMeals === 0
      ) {
        level = level === 'UNKNOWN' ? 'PARTIAL' : level;
        factors.push('adequate_today_nutrition_adherence');
      } else if (adherence < 60 || skippedMeals > 0) {
        level = 'INSUFFICIENT';
        factors.push('weak_today_nutrition_adherence');
      } else {
        factors.push('moderate_today_nutrition_adherence');
      }
    } else {
      factors.push('missing_today_nutrition');
      nutritionSummary.push('adherence=unknown');
    }

    if (
      typeof readinessScore === 'number' &&
      readinessScore >= 75 &&
      typeof fatigueScore === 'number' &&
      fatigueScore <= 35
    ) {
      level = 'SUPPORTIVE';
      factors.push('high_readiness');
    }

    if (
      typeof readinessScore === 'number' &&
      readinessScore < 55 &&
      (typeof fatigueScore !== 'number' || fatigueScore >= 50)
    ) {
      level = 'INSUFFICIENT';
      factors.push('low_recovery_readiness');
    }

    if (
      healthContext.latestCheckIn &&
      (healthContext.latestCheckIn.sleepQuality <= 2 ||
        healthContext.latestCheckIn.muscleSoreness >= 4)
    ) {
      level = level === 'SUPPORTIVE' ? 'PARTIAL' : 'INSUFFICIENT';
      factors.push('poor_sleep_or_soreness');
    }

    return Object.freeze({
      level,
      summary: nutritionSummary.join('; '),
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        nutritionProfileAvailable: true,
        nutritionPlanAvailable: Boolean(healthContext.nutritionProfile.goal),
        todayNutritionAvailable: Boolean(todayNutrition),
        nutritionLogCount: nutritionLogs.length,
      }),
    });
  }

  private resolveGoalAlignment(
    healthContext: UserHealthContext,
    snapshot?: RecoverySnapshotLike,
  ): RecoveryGoalAlignment {
    const workoutFocus = [
      healthContext.todayWorkout?.focus,
      healthContext.todayWorkout?.title,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();

    if (workoutFocus.includes('strength') || workoutFocus.includes('power')) {
      return 'strength';
    }

    if (
      workoutFocus.includes('endurance') ||
      workoutFocus.includes('cardio') ||
      workoutFocus.includes('conditioning')
    ) {
      return 'endurance';
    }

    switch (healthContext.goal) {
      case 'lose_weight':
        return 'fat_loss';
      case 'gain_muscle':
        return 'muscle_gain';
      case 'maintain':
        return 'maintenance';
      default:
        return snapshot ? 'maintenance' : 'unknown';
    }
  }

  private buildTrainingImpact(input: {
    healthContext: UserHealthContext;
    snapshot: RecoverySnapshotLike;
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
  }): TrainingImpactAssessment {
    const recommendationType =
      input.healthContext.adaptiveTrainingRecommendation?.recommendationType;
    const recommendedIntensity = input.snapshot.recommendedIntensity;
    const readinessLevel = input.readiness.level;

    let impact: RecoveryTrainingImpact = 'FULL_SESSION';
    const factors: string[] = [];

    if (recommendationType === 'rest_day') {
      impact = 'FULL_REST';
      factors.push('adaptive_rest_day');
    } else if (recommendationType === 'recovery_workout') {
      impact = 'ACTIVE_RECOVERY';
      factors.push('adaptive_recovery_workout');
    } else if (recommendationType === 'reschedule_workout') {
      impact = 'FULL_REST';
      factors.push('adaptive_reschedule');
    } else if (recommendationType === 'decrease_volume') {
      impact = 'REDUCED_VOLUME';
      factors.push('adaptive_volume_decrease');
    } else if (recommendationType === 'decrease_intensity') {
      impact = 'REDUCED_INTENSITY';
      factors.push('adaptive_intensity_decrease');
    }

    if (impact === 'FULL_SESSION') {
      if (readinessLevel === 'LOW' || recommendedIntensity === 'recovery') {
        impact = 'FULL_REST';
      } else if (
        readinessLevel === 'MEDIUM' ||
        recommendedIntensity === 'light'
      ) {
        impact = 'REDUCED_INTENSITY';
      }
    }

    if (
      input.healthContext.todayWorkout &&
      input.nutritionSupport.level === 'INSUFFICIENT' &&
      impact === 'FULL_SESSION'
    ) {
      impact = 'REDUCED_VOLUME';
      factors.push('nutrition_support_insufficient');
    }

    if (
      input.healthContext.todayWorkout &&
      input.trend.trend === 'DECLINING' &&
      impact === 'FULL_SESSION'
    ) {
      impact = 'REDUCED_INTENSITY';
      factors.push('declining_trend');
    }

    if (!input.healthContext.todayWorkout && impact === 'FULL_SESSION') {
      impact = 'ACTIVE_RECOVERY';
      factors.push('no_planned_workout');
    }

    return Object.freeze({
      impact,
      summary: `training_impact=${impact}; recommended_intensity=${recommendedIntensity}; readiness=${readinessLevel}`,
      factors: Object.freeze([
        ...factors,
        `nutrition_support=${input.nutritionSupport.level}`,
      ]),
      metadata: Object.freeze({
        adaptiveRecommendationType:
          input.healthContext.adaptiveTrainingRecommendation
            ?.recommendationType ?? null,
        recommendedIntensity,
        readinessLevel,
      }),
    });
  }

  private resolveRecoveryStatus(input: {
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
    healthContext: UserHealthContext;
    snapshot: RecoverySnapshotLike;
    recoveryHistory: readonly RecoverySnapshotLike[];
  }): RecoveryStatus {
    const sleepQuality =
      input.healthContext.latestCheckIn?.sleepQuality ?? null;
    const soreness = input.healthContext.latestCheckIn?.muscleSoreness ?? null;
    const overloaded = this.hasConsecutiveOverload(input.recoveryHistory);

    if (
      input.readiness.score !== null &&
      input.readiness.score >= 85 &&
      input.readiness.fatigueScore !== null &&
      input.readiness.fatigueScore <= 20 &&
      input.trend.trend === 'IMPROVING' &&
      sleepQuality !== null &&
      sleepQuality >= 4 &&
      soreness !== null &&
      soreness <= 1 &&
      input.nutritionSupport.level === 'SUPPORTIVE'
    ) {
      return 'OPTIMAL';
    }

    if (
      input.readiness.score !== null &&
      input.readiness.score >= 70 &&
      input.readiness.fatigueScore !== null &&
      input.readiness.fatigueScore <= 35 &&
      input.trend.trend !== 'DECLINING'
    ) {
      return 'GOOD';
    }

    if (
      input.readiness.score !== null &&
      input.readiness.score >= 50 &&
      input.readiness.fatigueScore !== null &&
      input.readiness.fatigueScore <= 60 &&
      input.trend.trend !== 'DECLINING'
    ) {
      return 'MODERATE';
    }

    if (
      (input.readiness.score !== null && input.readiness.score <= 25) ||
      (input.readiness.fatigueScore !== null &&
        input.readiness.fatigueScore >= 85) ||
      overloaded
    ) {
      return 'CRITICAL';
    }

    if (
      (input.readiness.score !== null && input.readiness.score <= 40) ||
      (input.readiness.fatigueScore !== null &&
        input.readiness.fatigueScore >= 70) ||
      input.trend.trend === 'DECLINING' ||
      (sleepQuality !== null && sleepQuality <= 2) ||
      (soreness !== null && soreness >= 4)
    ) {
      return 'POOR';
    }

    return 'UNKNOWN';
  }

  private buildRecommendations(input: {
    recoveryStatus: RecoveryStatus;
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
    trainingImpact: TrainingImpactAssessment;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
    goalAlignment: RecoveryGoalAlignment;
    healthContext: UserHealthContext;
    recoveryHistory: readonly RecoverySnapshotLike[];
  }): RecoveryRecommendation[] {
    const recommendations: RecoveryRecommendation[] = [];
    const pushRecommendation = (
      code: RecoveryRecommendationCode,
      summary: string,
      reason: string,
      priority: RecoveryPriority,
      metadata: Readonly<Record<string, unknown>>,
    ): void => {
      recommendations.push(
        Object.freeze({
          code,
          summary,
          reason,
          priority,
          metadata,
        }),
      );
    };

    if (input.recoveryStatus === 'CRITICAL') {
      pushRecommendation(
        'TAKE_FULL_RECOVERY_DAY',
        'Take a full recovery day.',
        'Recovery readiness is too low for productive training.',
        'CRITICAL',
        Object.freeze({
          recoveryStatus: input.recoveryStatus,
        }),
      );
    }

    if (
      input.recoveryStatus === 'CRITICAL' ||
      input.recoveryStatus === 'POOR'
    ) {
      pushRecommendation(
        'PRIORITIZE_RECOVERY',
        'Prioritize recovery.',
        'Recovery signals indicate the body needs more time.',
        'HIGH',
        Object.freeze({
          recoveryStatus: input.recoveryStatus,
        }),
      );
    }

    if (
      input.trainingImpact.impact === 'REDUCED_INTENSITY' ||
      input.recoveryStatus === 'POOR'
    ) {
      pushRecommendation(
        'REDUCE_TODAYS_INTENSITY',
        'Reduce today’s intensity.',
        'Current recovery signals are not optimal for high intensity.',
        'HIGH',
        Object.freeze({
          trainingImpact: input.trainingImpact.impact,
        }),
      );
    }

    if (
      input.trainingImpact.impact === 'REDUCED_VOLUME' ||
      input.recoveryStatus === 'MODERATE'
    ) {
      pushRecommendation(
        'REDUCE_TODAYS_VOLUME',
        'Reduce today’s volume.',
        'Recovery signals support a lighter training load.',
        'MEDIUM',
        Object.freeze({
          trainingImpact: input.trainingImpact.impact,
        }),
      );
    }

    if (input.trainingImpact.impact === 'TECHNIQUE_ONLY') {
      pushRecommendation(
        'USE_TECHNIQUE_ONLY',
        'Use technique-only work.',
        'A lighter technical session better fits the current recovery state.',
        'MEDIUM',
        Object.freeze({
          trainingImpact: input.trainingImpact.impact,
        }),
      );
    }

    if (input.recoveryStatus === 'GOOD' || input.recoveryStatus === 'OPTIMAL') {
      pushRecommendation(
        'PROCEED_WITH_TODAYS_SESSION',
        'Proceed with today’s session.',
        'Recovery signals support the planned session.',
        'LOW',
        Object.freeze({
          recoveryStatus: input.recoveryStatus,
        }),
      );
    }

    if (
      input.recoveryStatus !== 'CRITICAL' &&
      input.recoveryStatus !== 'UNKNOWN'
    ) {
      pushRecommendation(
        'MAINTAIN_RECOVERY_ROUTINE',
        'Maintain recovery routine.',
        'Keep the current recovery habits in place.',
        'LOW',
        Object.freeze({
          recoveryStatus: input.recoveryStatus,
        }),
      );
    }

    if (
      input.healthContext.latestCheckIn &&
      (input.healthContext.latestCheckIn.sleepQuality <= 2 ||
        input.healthContext.latestCheckIn.muscleSoreness >= 4)
    ) {
      pushRecommendation(
        'IMPROVE_SLEEP_CONSISTENCY',
        'Improve sleep consistency.',
        'Sleep quality or muscle soreness is not yet optimal.',
        'MEDIUM',
        Object.freeze({
          sleepQuality: input.healthContext.latestCheckIn.sleepQuality,
          muscleSoreness: input.healthContext.latestCheckIn.muscleSoreness,
        }),
      );
    }

    if (
      input.nutritionSupport.level === 'INSUFFICIENT' ||
      (input.recoveryStatus !== 'OPTIMAL' &&
        input.trainingImpact.impact !== 'FULL_REST' &&
        input.trainingImpact.impact !== 'ACTIVE_RECOVERY')
    ) {
      pushRecommendation(
        'PRIORITIZE_HYDRATION',
        'Prioritize hydration.',
        'Recovery support can be improved with better hydration habits.',
        'MEDIUM',
        Object.freeze({
          nutritionSupport: input.nutritionSupport.level,
        }),
      );
    }

    if (
      input.recoveryStatus === 'MODERATE' &&
      input.goalAlignment !== 'unknown'
    ) {
      pushRecommendation(
        'COMPLETE_MOBILITY_WORK',
        'Complete mobility work.',
        'Mobility work supports recovery while preserving movement quality.',
        'LOW',
        Object.freeze({
          goalAlignment: input.goalAlignment,
        }),
      );
    }

    return this.uniqueRecommendations(recommendations);
  }

  private buildRiskAssessment(input: {
    recoveryStatus: RecoveryStatus;
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
    trainingImpact: TrainingImpactAssessment;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
    healthContext: UserHealthContext;
    recoveryHistory: readonly RecoverySnapshotLike[];
  }): RecoveryRiskAssessment {
    const factors: string[] = [];
    let level: RecoveryPriority = 'LOW';

    if (input.recoveryStatus === 'CRITICAL') {
      factors.push('critical_recovery_state');
      level = 'CRITICAL';
    }

    if (input.readiness.score !== null && input.readiness.score <= 35) {
      factors.push('low_readiness');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (
      input.readiness.fatigueScore !== null &&
      input.readiness.fatigueScore >= 70
    ) {
      factors.push('high_fatigue');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.trend.trend === 'DECLINING') {
      factors.push('declining_trend');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (this.hasConsecutiveOverload(input.recoveryHistory)) {
      factors.push('consecutive_overload');
      level = 'CRITICAL';
    }

    if (
      input.healthContext.latestCheckIn &&
      input.healthContext.latestCheckIn.sleepQuality <= 2
    ) {
      factors.push('poor_sleep');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (
      input.healthContext.latestCheckIn &&
      input.healthContext.latestCheckIn.muscleSoreness >= 4
    ) {
      factors.push('high_muscle_soreness');
      level = level === 'LOW' ? 'MEDIUM' : level;
    }

    if (input.nutritionSupport.level === 'INSUFFICIENT') {
      factors.push('nutrition_support_insufficient');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (
      input.recoveryStatus === 'OPTIMAL' &&
      input.trend.trend === 'IMPROVING' &&
      input.nutritionSupport.level === 'SUPPORTIVE' &&
      level !== 'CRITICAL'
    ) {
      level = 'LOW';
    }

    const summary = this.buildRiskSummary(level, factors);

    return Object.freeze({
      level,
      summary,
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        recoveryStatus: input.recoveryStatus,
        readinessScore: input.readiness.score,
        fatigueScore: input.readiness.fatigueScore,
        trend: input.trend.trend,
        trainingImpact: input.trainingImpact.impact,
        nutritionSupport: input.nutritionSupport.level,
      }),
    });
  }

  private buildConfidence(input: {
    healthContext: UserHealthContext;
    recoveryHistory: readonly RecoverySnapshotLike[];
    snapshot?: RecoverySnapshotLike;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
  }): RecoveryConfidence {
    let score = 0;

    if (input.snapshot) {
      score += 1;
    }

    if (input.recoveryHistory.length > 0) {
      score += 1;
    }

    if (input.healthContext.latestCheckIn) {
      score += 1;
    }

    if (input.healthContext.todayWorkout) {
      score += 1;
    }

    if (input.healthContext.goal) {
      score += 1;
    }

    if (input.nutritionSupport.level !== 'UNKNOWN') {
      score += 1;
    }

    if (input.readiness.level !== 'UNKNOWN') {
      score += 1;
    }

    if (input.trend.trend !== 'UNKNOWN') {
      score += 1;
    }

    if (input.healthContext.recentWorkoutLogs.length > 0) {
      score += 1;
    }

    if (score >= 7) {
      return 'HIGH';
    }

    if (score >= 4) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private buildContribution(
    analysis: RecoveryAnalysis,
    context: CoachExpertContext,
  ): RecoveryExpertContribution {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
      analysis.recoveryStatus,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: this.buildSummary(analysis, primaryRecommendation),
      analysis,
      recommendations: analysis.recommendations,
      risks: analysis.risks,
      recoveryStatus: analysis.recoveryStatus,
      readiness: analysis.readiness,
      trend: analysis.trend,
      trainingImpact: analysis.trainingImpact,
      nutritionSupport: analysis.nutritionSupport,
      goalAlignment: analysis.goalAlignment,
      confidence: analysis.confidence,
      priority: analysis.priority,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        recoveryStatus: analysis.recoveryStatus,
        readinessLevel: analysis.readiness.level,
        trend: analysis.trend.trend,
        trainingImpact: analysis.trainingImpact.impact,
        nutritionSupport: analysis.nutritionSupport.level,
        goalAlignment: analysis.goalAlignment,
        confidence: analysis.confidence,
        riskLevel: analysis.risks[0]?.level ?? 'LOW',
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
      }),
    });
  }

  private buildContributions(
    contribution: RecoveryExpertContribution,
  ): readonly CoachExpertContribution[] {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      contribution.recommendations,
      contribution.recoveryStatus,
    );

    return Object.freeze([
      Object.freeze({
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: Object.freeze({
          recoveryContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          recoveryContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildSummary(
    analysis: RecoveryAnalysis,
    recommendation: RecoveryRecommendation,
  ): string {
    return [
      `status=${analysis.recoveryStatus}`,
      `readiness=${analysis.readiness.level}`,
      `trend=${analysis.trend.trend}`,
      `impact=${analysis.trainingImpact.impact}`,
      `nutrition=${analysis.nutritionSupport.level}`,
      `goal=${analysis.goalAlignment}`,
      `priority=${analysis.priority}`,
      `confidence=${analysis.confidence}`,
      `recommendation=${recommendation.code}`,
    ].join('; ');
  }

  private buildSignals(input: {
    recoveryStatus: RecoveryStatus;
    readiness: RecoveryReadinessAssessment;
    trend: RecoveryTrendAssessmentShape;
    trainingImpact: TrainingImpactAssessment;
    nutritionSupport: RecoveryAnalysis['nutritionSupport'];
    goalAlignment: RecoveryGoalAlignment;
    healthContext: UserHealthContext;
    todayNutrition?: CoachExpertContext['todayNutrition'];
    nutritionLogs?: CoachExpertContext['nutritionLogs'];
    snapshot: RecoverySnapshotLike;
    recoveryHistory: readonly RecoverySnapshotLike[];
  }): string[] {
    const signals = [
      `recovery_status=${input.recoveryStatus}`,
      `readiness_level=${input.readiness.level}`,
      `recovery_trend=${input.trend.trend}`,
      `training_impact=${input.trainingImpact.impact}`,
      `nutrition_support=${input.nutritionSupport.level}`,
      `goal_alignment=${input.goalAlignment}`,
      `recovery_history_count=${input.recoveryHistory.length}`,
      `recent_workout_count=${input.healthContext.recentWorkoutLogs.length}`,
      `readiness_score=${input.snapshot.readinessScore}`,
      `fatigue_score=${input.snapshot.fatigueScore}`,
      `recommended_intensity=${input.snapshot.recommendedIntensity}`,
    ];

    if (typeof input.healthContext.latestCheckIn?.sleepQuality === 'number') {
      signals.push(
        `sleep_quality=${input.healthContext.latestCheckIn.sleepQuality}`,
      );
    }

    if (typeof input.healthContext.latestCheckIn?.muscleSoreness === 'number') {
      signals.push(
        `muscle_soreness=${input.healthContext.latestCheckIn.muscleSoreness}`,
      );
    }

    if (input.healthContext.goal) {
      signals.push(`fitness_goal=${input.healthContext.goal}`);
    }

    if (input.todayNutrition) {
      signals.push(
        `nutrition_adherence=${input.todayNutrition.progress.adherencePercentage}`,
      );
    }

    if (input.nutritionLogs?.length) {
      signals.push(`nutrition_log_count=${input.nutritionLogs.length}`);
    }

    return signals;
  }

  private buildTrendFactors(
    snapshot: RecoverySnapshotLike,
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): string[] {
    const factors: string[] = [];

    if (recoveryHistory.length > 0) {
      const previous = recoveryHistory[recoveryHistory.length - 1];
      if (
        typeof previous.readinessScore === 'number' &&
        typeof snapshot.readinessScore === 'number' &&
        snapshot.readinessScore > previous.readinessScore
      ) {
        factors.push('readiness_improving');
      } else if (
        typeof previous.readinessScore === 'number' &&
        typeof snapshot.readinessScore === 'number' &&
        snapshot.readinessScore < previous.readinessScore
      ) {
        factors.push('readiness_declining');
      }
    }

    if (snapshot.recoveryTrend === 'improving') {
      factors.push('snapshot_trend_improving');
    } else if (snapshot.recoveryTrend === 'declining') {
      factors.push('snapshot_trend_declining');
    } else {
      factors.push('snapshot_trend_stable');
    }

    return factors;
  }

  private resolveTrend(
    snapshot: RecoverySnapshotLike,
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): RecoveryTrendAssessment {
    if (snapshot.recoveryTrend === 'improving') {
      return 'IMPROVING';
    }

    if (snapshot.recoveryTrend === 'declining') {
      return 'DECLINING';
    }

    if (recoveryHistory.length < 2) {
      return 'STABLE';
    }

    const previous = recoveryHistory[recoveryHistory.length - 1];
    if (
      typeof previous.readinessScore === 'number' &&
      typeof snapshot.readinessScore === 'number'
    ) {
      if (snapshot.readinessScore > previous.readinessScore) {
        return 'IMPROVING';
      }

      if (snapshot.readinessScore < previous.readinessScore) {
        return 'DECLINING';
      }
    }

    return 'STABLE';
  }

  private resolveTrendFromHistory(
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): RecoveryTrendAssessment {
    if (recoveryHistory.length < 2) {
      return 'UNKNOWN';
    }

    const latest = recoveryHistory[recoveryHistory.length - 1];
    const previous = recoveryHistory[recoveryHistory.length - 2];

    if (
      typeof latest.readinessScore === 'number' &&
      typeof previous.readinessScore === 'number'
    ) {
      if (latest.readinessScore > previous.readinessScore) {
        return 'IMPROVING';
      }

      if (latest.readinessScore < previous.readinessScore) {
        return 'DECLINING';
      }
    }

    return 'STABLE';
  }

  private resolveReadinessLevel(
    readinessScore: number | null | undefined,
  ): RecoveryReadinessAssessment['level'] {
    if (typeof readinessScore !== 'number') {
      return 'UNKNOWN';
    }

    if (readinessScore >= 80) {
      return 'HIGH';
    }

    if (readinessScore >= 55) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private hasConsecutiveOverload(
    recoveryHistory: readonly RecoverySnapshotLike[],
  ): boolean {
    if (recoveryHistory.length < 3) {
      return false;
    }

    const recent = recoveryHistory.slice(-3);
    return recent.every(
      (snapshot) =>
        snapshot.recoveryTrend === 'declining' ||
        (typeof snapshot.readinessScore === 'number' &&
          snapshot.readinessScore <= 40),
    );
  }

  private selectPrimaryRecommendation(
    recommendations: readonly RecoveryRecommendation[],
    recoveryStatus?: RecoveryStatus,
  ): RecoveryRecommendation {
    if (recommendations.length === 0) {
      return Object.freeze({
        code:
          recoveryStatus === 'CRITICAL'
            ? 'TAKE_FULL_RECOVERY_DAY'
            : recoveryStatus === 'POOR'
              ? 'PRIORITIZE_RECOVERY'
              : 'PROCEED_WITH_TODAYS_SESSION',
        summary:
          recoveryStatus === 'CRITICAL'
            ? 'Take a full recovery day.'
            : recoveryStatus === 'POOR'
              ? 'Prioritize recovery.'
              : 'Proceed with today’s session.',
        reason: 'No stronger deterministic adjustment was required.',
        priority:
          recoveryStatus === 'CRITICAL'
            ? 'CRITICAL'
            : recoveryStatus === 'POOR'
              ? 'HIGH'
              : 'LOW',
        metadata: Object.freeze({ recoveryStatus }),
      });
    }

    return [...recommendations].sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOVERY_PRIORITY_WEIGHT[right.priority] -
          RECOVERY_PRIORITY_WEIGHT[left.priority]
        );
      }

      return (
        RECOVERY_RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOVERY_RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0];
  }

  private uniqueRecommendations(
    recommendations: readonly RecoveryRecommendation[],
  ): RecoveryRecommendation[] {
    const seen = new Set<RecoveryRecommendationCode>();
    const result: RecoveryRecommendation[] = [];

    for (const recommendation of recommendations) {
      if (seen.has(recommendation.code)) {
        continue;
      }

      seen.add(recommendation.code);
      result.push(recommendation);
    }

    return result.sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOVERY_PRIORITY_WEIGHT[right.priority] -
          RECOVERY_PRIORITY_WEIGHT[left.priority]
        );
      }

      return (
        RECOVERY_RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOVERY_RECOMMENDATION_ORDER.indexOf(right.code)
      );
    });
  }

  private buildRecommendation(
    code: RecoveryRecommendationCode,
    summary: string,
    reason: string,
    priority: RecoveryPriority,
    metadata: Readonly<Record<string, unknown>>,
  ): RecoveryRecommendation {
    return Object.freeze({
      code,
      summary,
      reason,
      priority,
      metadata,
    });
  }

  private buildRiskSummary(
    level: RecoveryPriority,
    factors: readonly string[],
  ): string {
    return [
      `level=${level}`,
      `factors=${[...new Set(factors)].join(',') || 'none'}`,
    ].join('; ');
  }
}
