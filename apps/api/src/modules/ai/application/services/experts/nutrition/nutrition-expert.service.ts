import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type {
  MacroAssessment,
  MacroAssessmentStatus,
  MealAssessment,
  MealAssessmentItem,
  MealAssessmentStatus,
  MealTimingStatus,
  NutritionAnalysis,
  NutritionConfidence,
  NutritionGoalAlignment,
  NutritionPriority,
  NutritionRecommendation,
  NutritionRecommendationCode,
  NutritionRecoverySupport,
  NutritionRecoverySupportLevel,
  NutritionRiskAssessment,
  NutritionStatus,
} from './nutrition-expert.types';
import type {
  Meal,
  MealType,
} from '../../../../../nutrition/domain/entities/meal.entity';
import type { NutritionLog } from '../../../../../nutrition/domain/entities/nutrition-log.entity';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';

const COACH_EXPERT_VERSION = '1.0.0';
const NUTRITION_EXPERT_ID = 'NutritionExpert';

const RECOMMENDATION_PRIORITY: Record<NutritionPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RECOMMENDATION_ORDER: readonly NutritionRecommendationCode[] =
  Object.freeze([
    'SET_UP_NUTRITION_PROFILE',
    'CREATE_OR_REFRESH_NUTRITION_PLAN',
    'FOLLOW_TODAYS_NUTRITION_SCHEDULE',
    'ADDRESS_ALLERGY_CONFLICTS',
    'RESPECT_DIETARY_RESTRICTIONS',
    'COMPLETE_REMAINING_MEALS',
    'AVOID_SKIPPING_BREAKFAST',
    'INCREASE_PROTEIN_INTAKE',
    'DISTRIBUTE_PROTEIN_MORE_EVENLY',
    'PRIORITIZE_POST_WORKOUT_NUTRITION',
    'SUPPORT_RECOVERY_WITH_MEAL_TIMING',
    'REVIEW_CALORIE_INTAKE',
    'IMPROVE_HYDRATION',
    'MAINTAIN_CURRENT_PLAN',
  ]);

export class NutritionExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: NUTRITION_EXPERT_ID,
      displayName: 'Nutrition Expert',
      version: COACH_EXPERT_VERSION,
      category: 'NUTRITION',
      supportedIntents: [
        'NUTRITION',
        'GOALS',
        'RECOVERY',
        'PLANNING',
        'MOTIVATION',
      ],
      supportedDomains: ['nutrition', 'goals', 'recovery', 'training'],
      estimatedCost: 2,
      estimatedLatencyMs: 18,
      priority: 90,
      capabilities: [
        'NUTRITION_SPECIALIST',
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
        nutritionExpert: Object.freeze({
          expertId: this.metadata.id,
          nutritionStatus: analysis.nutritionStatus,
          priority: analysis.priority,
          goalAlignment: analysis.goalAlignment,
          confidence: analysis.confidence,
          riskLevel: analysis.riskAssessment.level,
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
        goalAlignment: contribution.goalAlignment,
        recoverySupport: contribution.recoverySupport,
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

  private buildAnalysis(context: CoachExpertContext): NutritionAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildBlockedAnalysis(healthContext);
    }

    const nutritionProfile = healthContext.nutritionProfile;

    if (!nutritionProfile) {
      return this.buildMissingProfileAnalysis(healthContext, context);
    }

    const nutritionPlan = context.nutritionPlan ?? null;
    const todayNutrition = context.todayNutrition ?? null;
    const nutritionLogs = [...(context.nutritionLogs ?? [])];

    if (!nutritionPlan || !todayNutrition) {
      return this.buildMissingPlanAnalysis(
        healthContext,
        context,
        nutritionPlan,
      );
    }

    const macroAssessment = this.buildMacroAssessment(todayNutrition.progress);
    const mealAssessment = this.buildMealAssessment({
      meals: todayNutrition.meals,
      logs: nutritionLogs,
      nextMealId: todayNutrition.nextMeal?.id ?? null,
    });
    const goalAlignment = this.resolveGoalAlignment(
      healthContext,
      nutritionProfile.goal,
      todayNutrition.meals,
      healthContext.todayWorkout,
    );
    const readinessLevel = this.resolveReadinessLevel(healthContext);
    const trainingScheduledToday = Boolean(healthContext.todayWorkout);
    const conflictAnalysis = this.resolveConflictSignals({
      nutritionProfile,
      meals: todayNutrition.meals,
    });
    const recoverySupport = this.assessRecoverySupport({
      healthContext,
      macroAssessment,
      mealAssessment,
      trainingScheduledToday,
      readinessLevel,
    });
    const recommendations = this.buildRecommendations({
      nutritionStatus: this.resolveNutritionStatus({
        nutritionProfilePresent: true,
        nutritionPlanPresent: Boolean(nutritionPlan),
        todayNutritionPresent: Boolean(todayNutrition),
        macroAssessment,
        mealAssessment,
        conflictAnalysis,
      }),
      healthContext,
      nutritionProfile,
      nutritionPlan,
      todayNutrition,
      macroAssessment,
      mealAssessment,
      goalAlignment,
      recoverySupport,
      readinessLevel,
      conflictAnalysis,
      trainingScheduledToday,
    });
    const riskAssessment = this.assessRisk({
      healthContext,
      nutritionProfile,
      nutritionPlan,
      todayNutrition,
      macroAssessment,
      mealAssessment,
      recoverySupport,
      conflictAnalysis,
      trainingScheduledToday,
      readinessLevel,
    });
    const priority = this.resolvePriority(riskAssessment);
    const confidence = this.resolveConfidence({
      healthContext,
      nutritionProfile,
      nutritionPlan,
      todayNutrition,
      nutritionLogs,
      conflictAnalysis,
      mealAssessment,
    });
    const nutritionStatus = this.resolveNutritionStatus({
      nutritionProfilePresent: true,
      nutritionPlanPresent: Boolean(nutritionPlan),
      todayNutritionPresent: Boolean(todayNutrition),
      macroAssessment,
      mealAssessment,
      conflictAnalysis,
    });
    const signals = this.buildSignals({
      healthContext,
      nutritionProfile,
      nutritionPlan,
      todayNutrition,
      nutritionLogs,
      macroAssessment,
      mealAssessment,
      goalAlignment,
      recoverySupport,
      readinessLevel,
      conflictAnalysis,
      nutritionStatus,
      trainingScheduledToday,
    });

    return Object.freeze({
      nutritionStatus,
      macroAssessment,
      mealAssessment,
      goalAlignment,
      recoverySupport,
      riskAssessment,
      recommendations: Object.freeze(recommendations),
      confidence,
      priority,
      signals: Object.freeze(signals),
      nutritionProfilePresent: true,
      nutritionPlanPresent: Boolean(nutritionPlan),
      todayNutritionPresent: Boolean(todayNutrition),
      trainingScheduledToday,
      restrictionConflicts: conflictAnalysis.restrictionConflicts,
      allergyConflicts: conflictAnalysis.allergyConflicts,
      dislikedFoodConflicts: conflictAnalysis.dislikedFoodConflicts,
      preferredFoodMatches: conflictAnalysis.preferredFoodMatches,
      readinessLevel,
    });
  }

  private buildBlockedAnalysis(
    healthContext?: UserHealthContext,
  ): NutritionAnalysis {
    const riskAssessment: NutritionRiskAssessment = Object.freeze({
      level: 'CRITICAL',
      summary:
        'Nutrition analysis is blocked by policy or missing trusted health context.',
      factors: Object.freeze([
        'policy_blocked',
        ...(healthContext ? [] : ['missing_health_context']),
      ]),
      metadata: Object.freeze({
        policyBlocked: true,
        healthContextAvailable: Boolean(healthContext),
      }),
    });

    return Object.freeze({
      nutritionStatus: 'UNKNOWN',
      macroAssessment: this.buildEmptyMacroAssessment('UNKNOWN'),
      mealAssessment: this.buildEmptyMealAssessment('UNKNOWN'),
      goalAlignment: 'unknown',
      recoverySupport: Object.freeze({
        level: 'UNKNOWN',
        summary: 'Nutrition recovery support is unavailable.',
        factors: Object.freeze(['policy_blocked']),
        metadata: Object.freeze({
          policyBlocked: true,
          healthContextAvailable: Boolean(healthContext),
        }),
      }),
      riskAssessment,
      recommendations: Object.freeze([]),
      confidence: 'LOW',
      priority: 'CRITICAL',
      signals: Object.freeze([
        'analysis_blocked_by_policy',
        `health_context_available=${Boolean(healthContext)}`,
      ]),
      nutritionProfilePresent: Boolean(healthContext?.nutritionProfile),
      nutritionPlanPresent: false,
      todayNutritionPresent: false,
      trainingScheduledToday: Boolean(healthContext?.todayWorkout),
      restrictionConflicts: 0,
      allergyConflicts: 0,
      dislikedFoodConflicts: 0,
      preferredFoodMatches: 0,
      readinessLevel: 'UNKNOWN',
    });
  }

  private buildMissingProfileAnalysis(
    healthContext: UserHealthContext,
    context: CoachExpertContext,
  ): NutritionAnalysis {
    const nutritionStatus: NutritionStatus = 'NO_PROFILE';
    const riskAssessment: NutritionRiskAssessment = Object.freeze({
      level: 'CRITICAL',
      summary: 'Nutrition profile is missing.',
      factors: Object.freeze(['missing_nutrition_profile']),
      metadata: Object.freeze({
        nutritionPlanAvailable: Boolean(context.nutritionPlan),
        todayNutritionAvailable: Boolean(context.todayNutrition),
      }),
    });

    const macroAssessment = this.buildEmptyMacroAssessment(nutritionStatus);
    const mealAssessment = this.buildEmptyMealAssessment(nutritionStatus);

    return Object.freeze({
      nutritionStatus,
      macroAssessment,
      mealAssessment,
      goalAlignment: 'unknown',
      recoverySupport: Object.freeze({
        level: 'UNKNOWN',
        summary:
          'Recovery support cannot be evaluated without a nutrition profile.',
        factors: Object.freeze(['missing_nutrition_profile']),
        metadata: Object.freeze({}),
      }),
      riskAssessment,
      recommendations: Object.freeze([
        Object.freeze({
          code: 'SET_UP_NUTRITION_PROFILE',
          summary: 'Set up a nutrition profile.',
          reason: 'Nutrition analysis requires trusted profile state.',
          priority: 'CRITICAL',
          metadata: Object.freeze({
            nutritionStatus,
          }),
        }),
      ]),
      confidence: 'LOW',
      priority: 'CRITICAL',
      signals: Object.freeze([
        'nutrition_profile_present=false',
        `nutrition_plan_present=${Boolean(context.nutritionPlan)}`,
        `today_nutrition_present=${Boolean(context.todayNutrition)}`,
      ]),
      nutritionProfilePresent: false,
      nutritionPlanPresent: Boolean(context.nutritionPlan),
      todayNutritionPresent: Boolean(context.todayNutrition),
      trainingScheduledToday: Boolean(healthContext.todayWorkout),
      restrictionConflicts: 0,
      allergyConflicts: 0,
      dislikedFoodConflicts: 0,
      preferredFoodMatches: 0,
      readinessLevel: this.resolveReadinessLevel(healthContext),
    });
  }

  private buildMissingPlanAnalysis(
    healthContext: UserHealthContext,
    context: CoachExpertContext,
    nutritionPlan: NutritionPlan | null,
  ): NutritionAnalysis {
    const nutritionStatus: NutritionStatus = 'NO_PLAN';
    const riskAssessment: NutritionRiskAssessment = Object.freeze({
      level: 'HIGH',
      summary:
        'An active nutrition plan or today nutrition snapshot is missing.',
      factors: Object.freeze([
        ...(nutritionPlan ? [] : ['missing_nutrition_plan']),
        ...(context.todayNutrition ? [] : ['missing_today_nutrition']),
      ]),
      metadata: Object.freeze({
        nutritionPlanAvailable: Boolean(nutritionPlan),
        todayNutritionAvailable: Boolean(context.todayNutrition),
      }),
    });

    return Object.freeze({
      nutritionStatus,
      macroAssessment: this.buildEmptyMacroAssessment(nutritionStatus),
      mealAssessment: this.buildEmptyMealAssessment(nutritionStatus),
      goalAlignment: this.resolveGoalAlignment(
        healthContext,
        healthContext.nutritionProfile?.goal ?? 'maintenance',
        context.todayNutrition?.meals ?? [],
        healthContext.todayWorkout,
      ),
      recoverySupport: Object.freeze({
        level: 'INSUFFICIENT',
        summary:
          'Recovery support cannot be evaluated without a current nutrition plan.',
        factors: Object.freeze([
          ...(nutritionPlan ? [] : ['missing_nutrition_plan']),
          ...(context.todayNutrition ? [] : ['missing_today_nutrition']),
        ]),
        metadata: Object.freeze({}),
      }),
      riskAssessment,
      recommendations: Object.freeze([
        Object.freeze({
          code: 'CREATE_OR_REFRESH_NUTRITION_PLAN',
          summary: 'Create or refresh the nutrition plan.',
          reason:
            'A current nutrition plan is required for deterministic coaching.',
          priority: 'HIGH',
          metadata: Object.freeze({
            nutritionStatus,
          }),
        }),
      ]),
      confidence: 'LOW',
      priority: 'HIGH',
      signals: Object.freeze([
        `nutrition_plan_present=${Boolean(nutritionPlan)}`,
        `today_nutrition_present=${Boolean(context.todayNutrition)}`,
        `nutrition_profile_present=${Boolean(healthContext.nutritionProfile)}`,
      ]),
      nutritionProfilePresent: Boolean(healthContext.nutritionProfile),
      nutritionPlanPresent: Boolean(nutritionPlan),
      todayNutritionPresent: Boolean(context.todayNutrition),
      trainingScheduledToday: Boolean(healthContext.todayWorkout),
      restrictionConflicts: 0,
      allergyConflicts: 0,
      dislikedFoodConflicts: 0,
      preferredFoodMatches: 0,
      readinessLevel: this.resolveReadinessLevel(healthContext),
    });
  }

  private buildContribution(
    analysis: NutritionAnalysis,
    context: CoachExpertContext,
  ): NutritionExpertContribution {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
      analysis.nutritionStatus,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: this.buildSummary(analysis, primaryRecommendation),
      analysis,
      recommendations: analysis.recommendations,
      risks: Object.freeze([analysis.riskAssessment]),
      goalAlignment: analysis.goalAlignment,
      recoverySupport: analysis.recoverySupport,
      confidence: analysis.confidence,
      priority: analysis.priority,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        nutritionStatus: analysis.nutritionStatus,
        macroStatus: analysis.macroAssessment.overallStatus,
        mealTiming: analysis.mealAssessment.mealTiming,
        goalAlignment: analysis.goalAlignment,
        confidence: analysis.confidence,
        riskLevel: analysis.riskAssessment.level,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        restrictionConflicts: analysis.restrictionConflicts,
        allergyConflicts: analysis.allergyConflicts,
        dislikedFoodConflicts: analysis.dislikedFoodConflicts,
        preferredFoodMatches: analysis.preferredFoodMatches,
      }),
    });
  }

  private buildContributions(
    contribution: NutritionExpertContribution,
  ): readonly CoachExpertContribution[] {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      contribution.recommendations,
      contribution.analysis.nutritionStatus,
    );

    return Object.freeze([
      Object.freeze({
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: Object.freeze({
          nutritionContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          nutritionContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildSummary(
    analysis: NutritionAnalysis,
    recommendation: NutritionRecommendation,
  ): string {
    return [
      `status=${analysis.nutritionStatus}`,
      `macro=${analysis.macroAssessment.overallStatus}`,
      `meal_timing=${analysis.mealAssessment.mealTiming}`,
      `risk=${analysis.riskAssessment.level}`,
      `priority=${analysis.priority}`,
      `confidence=${analysis.confidence}`,
      `recommendation=${recommendation.code}`,
      `goal=${analysis.goalAlignment}`,
    ].join('; ');
  }

  private buildSignals(input: {
    healthContext: UserHealthContext;
    nutritionProfile: NonNullable<UserHealthContext['nutritionProfile']>;
    nutritionPlan: NutritionPlan | null;
    todayNutrition: NonNullable<CoachExpertContext['todayNutrition']>;
    nutritionLogs: readonly NutritionLog[];
    macroAssessment: MacroAssessment;
    mealAssessment: MealAssessment;
    goalAlignment: NutritionGoalAlignment;
    recoverySupport: NutritionRecoverySupport;
    readinessLevel: NutritionAnalysis['readinessLevel'];
    conflictAnalysis: {
      restrictionConflicts: number;
      allergyConflicts: number;
      dislikedFoodConflicts: number;
      preferredFoodMatches: number;
    };
    nutritionStatus: NutritionStatus;
    trainingScheduledToday: boolean;
  }): string[] {
    const signals = [
      `nutrition_status=${input.nutritionStatus}`,
      `macro_status=${input.macroAssessment.overallStatus}`,
      `meal_timing=${input.mealAssessment.mealTiming}`,
      `goal_alignment=${input.goalAlignment}`,
      `recovery_support=${input.recoverySupport.level}`,
      `training_scheduled_today=${input.trainingScheduledToday}`,
      `readiness_level=${input.readinessLevel}`,
      `nutrition_plan_present=${Boolean(input.nutritionPlan)}`,
      `nutrition_logs_count=${input.nutritionLogs.length}`,
      `restriction_conflicts=${input.conflictAnalysis.restrictionConflicts}`,
      `allergy_conflicts=${input.conflictAnalysis.allergyConflicts}`,
      `disliked_food_conflicts=${input.conflictAnalysis.dislikedFoodConflicts}`,
      `preferred_food_matches=${input.conflictAnalysis.preferredFoodMatches}`,
      `meals_count=${input.todayNutrition.meals.length}`,
      `meal_completed_count=${input.mealAssessment.completedCount}`,
      `meal_partial_count=${input.mealAssessment.partialCount}`,
      `meal_missed_count=${input.mealAssessment.missedCount}`,
      `meal_pending_count=${input.mealAssessment.pendingCount}`,
    ];

    if (input.healthContext.goal) {
      signals.push(`fitness_goal=${input.healthContext.goal}`);
    }

    if (input.nutritionProfile.goal) {
      signals.push(`nutrition_goal=${input.nutritionProfile.goal}`);
    }

    if (
      typeof input.healthContext.recoverySnapshot?.readinessScore === 'number'
    ) {
      signals.push(
        `readiness_score=${input.healthContext.recoverySnapshot.readinessScore}`,
      );
    }

    if (typeof input.healthContext.fatigueScore === 'number') {
      signals.push(`fatigue_score=${input.healthContext.fatigueScore}`);
    }

    return signals;
  }

  private buildMacroAssessment(progress: {
    consumedCalories: number;
    consumedProteinGrams: number;
    consumedCarbsGrams: number;
    consumedFatGrams: number;
    targetCalories: number;
    targetProteinGrams: number;
    targetCarbsGrams: number;
    targetFatGrams: number;
    adherencePercentage: number;
  }): MacroAssessment {
    const calories = this.assessMacroTarget(
      progress.consumedCalories,
      progress.targetCalories,
    );
    const protein = this.assessMacroTarget(
      progress.consumedProteinGrams,
      progress.targetProteinGrams,
    );
    const carbs = this.assessMacroTarget(
      progress.consumedCarbsGrams,
      progress.targetCarbsGrams,
    );
    const fat = this.assessMacroTarget(
      progress.consumedFatGrams,
      progress.targetFatGrams,
    );
    const overallStatus = this.resolveMacroOverallStatus([
      calories.status,
      protein.status,
      carbs.status,
      fat.status,
    ]);

    return Object.freeze({
      calories,
      protein,
      carbs,
      fat,
      overallStatus,
      adherencePercentage: progress.adherencePercentage,
      summary: [
        `calories=${calories.status}`,
        `protein=${protein.status}`,
        `carbs=${carbs.status}`,
        `fat=${fat.status}`,
        `overall=${overallStatus}`,
      ].join('; '),
    });
  }

  private buildMealAssessment(input: {
    meals: readonly Meal[];
    logs: readonly NutritionLog[];
    nextMealId: string | null;
  }): MealAssessment {
    const logsByMealId = new Map(
      input.logs.map((log) => [log.mealId, log] as const),
    );
    const mealStatuses: MealAssessmentItem[] = [];
    let completedCount = 0;
    let partialCount = 0;
    let missedCount = 0;
    let pendingCount = 0;

    for (const meal of input.meals) {
      const log = logsByMealId.get(meal.id);
      const status = this.resolveMealStatus({
        meal,
        log,
        nextMealId: input.nextMealId,
      });

      if (status === 'COMPLETED') {
        completedCount += 1;
      } else if (status === 'PARTIAL') {
        partialCount += 1;
      } else if (status === 'MISSED') {
        missedCount += 1;
      } else if (status === 'PENDING') {
        pendingCount += 1;
      }

      mealStatuses.push(
        Object.freeze({
          mealId: meal.id,
          mealType: meal.type,
          title: meal.title,
          status,
          ...(log ? { logStatus: log.status } : {}),
          summary: this.buildMealStatusSummary(meal.type, status, log?.status),
          metadata: Object.freeze({
            mealType: meal.type,
            logStatus: log?.status ?? null,
            mealStatus: status,
          }),
        }),
      );
    }

    const mealTiming = this.resolveMealTiming({
      completedCount,
      partialCount,
      missedCount,
      pendingCount,
      nextMealId: input.nextMealId,
    });

    return Object.freeze({
      mealTiming,
      mealStatuses: Object.freeze(mealStatuses),
      completedCount,
      partialCount,
      missedCount,
      pendingCount,
      totalMeals: input.meals.length,
      nextMealId: input.nextMealId,
      summary: [
        `completed=${completedCount}`,
        `partial=${partialCount}`,
        `missed=${missedCount}`,
        `pending=${pendingCount}`,
        `timing=${mealTiming}`,
      ].join('; '),
    });
  }

  private assessRisk(input: {
    healthContext: UserHealthContext;
    nutritionProfile: NonNullable<UserHealthContext['nutritionProfile']>;
    nutritionPlan: NutritionPlan;
    todayNutrition: NonNullable<CoachExpertContext['todayNutrition']>;
    macroAssessment: MacroAssessment;
    mealAssessment: MealAssessment;
    recoverySupport: NutritionRecoverySupport;
    conflictAnalysis: {
      restrictionConflicts: number;
      allergyConflicts: number;
      dislikedFoodConflicts: number;
      preferredFoodMatches: number;
    };
    trainingScheduledToday: boolean;
    readinessLevel: NutritionAnalysis['readinessLevel'];
  }): NutritionRiskAssessment {
    const factors: string[] = [];
    let level: NutritionPriority = 'LOW';

    if (input.conflictAnalysis.allergyConflicts > 0) {
      factors.push('allergy_conflict');
      level = 'CRITICAL';
    }

    if (input.conflictAnalysis.restrictionConflicts > 0) {
      factors.push('dietary_restriction_conflict');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.mealAssessment.missedCount > 0) {
      factors.push('missed_meals');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.mealAssessment.partialCount > 0) {
      factors.push('partial_meals');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (input.macroAssessment.protein.status === 'LOW') {
      factors.push('protein_below_target');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.macroAssessment.calories.status === 'LOW') {
      factors.push('calories_below_target');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (input.recoverySupport.level === 'INSUFFICIENT') {
      factors.push('recovery_support_insufficient');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (input.trainingScheduledToday && input.readinessLevel === 'LOW') {
      factors.push('training_day_with_low_readiness');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.nutritionPlan.days.length === 0) {
      factors.push('empty_nutrition_plan');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (
      input.macroAssessment.overallStatus === 'ON_TRACK' &&
      input.mealAssessment.missedCount === 0 &&
      input.conflictAnalysis.allergyConflicts === 0 &&
      input.conflictAnalysis.restrictionConflicts === 0
    ) {
      level = 'LOW';
    }

    if (
      input.macroAssessment.overallStatus === 'MISSED' ||
      input.mealAssessment.missedCount >= 2
    ) {
      level = 'CRITICAL';
    }

    const summary = this.buildRiskSummary(level, factors);

    return Object.freeze({
      level,
      summary,
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        nutritionStatus: this.resolveNutritionStatus({
          nutritionProfilePresent: true,
          nutritionPlanPresent: true,
          todayNutritionPresent: true,
          macroAssessment: input.macroAssessment,
          mealAssessment: input.mealAssessment,
          conflictAnalysis: input.conflictAnalysis,
        }),
        macroStatus: input.macroAssessment.overallStatus,
        mealTiming: input.mealAssessment.mealTiming,
        trainingScheduledToday: input.trainingScheduledToday,
        readinessLevel: input.readinessLevel,
        caloriesAdherence: input.macroAssessment.calories.status,
        proteinAdherence: input.macroAssessment.protein.status,
        recoverySupport: input.recoverySupport.level,
      }),
    });
  }

  private resolvePriority(
    riskAssessment: NutritionRiskAssessment,
  ): NutritionPriority {
    return riskAssessment.level;
  }

  private resolveConfidence(input: {
    healthContext: UserHealthContext;
    nutritionProfile: UserHealthContext['nutritionProfile'];
    nutritionPlan: NutritionPlan | null;
    todayNutrition: NonNullable<CoachExpertContext['todayNutrition']>;
    nutritionLogs: readonly NutritionLog[];
    conflictAnalysis: {
      restrictionConflicts: number;
      allergyConflicts: number;
      dislikedFoodConflicts: number;
      preferredFoodMatches: number;
    };
    mealAssessment: MealAssessment;
  }): NutritionConfidence {
    let score = 0;

    if (input.nutritionProfile) {
      score += 1;
    }

    if (input.nutritionPlan) {
      score += 1;
    }

    if (input.todayNutrition) {
      score += 1;
    }

    if (input.nutritionLogs.length > 0) {
      score += 1;
    }

    if (input.healthContext.goal) {
      score += 1;
    }

    if (
      typeof input.healthContext.recoverySnapshot?.readinessScore === 'number'
    ) {
      score += 1;
    }

    if (input.healthContext.todayWorkout) {
      score += 1;
    }

    if (
      input.conflictAnalysis.preferredFoodMatches > 0 ||
      input.conflictAnalysis.restrictionConflicts > 0
    ) {
      score += 1;
    }

    if (input.mealAssessment.totalMeals > 0) {
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

  private buildRecommendations(input: {
    nutritionStatus: NutritionStatus;
    healthContext: UserHealthContext;
    nutritionProfile: NonNullable<UserHealthContext['nutritionProfile']>;
    nutritionPlan: NutritionPlan | null;
    todayNutrition: NonNullable<CoachExpertContext['todayNutrition']>;
    macroAssessment: MacroAssessment;
    mealAssessment: MealAssessment;
    goalAlignment: NutritionGoalAlignment;
    recoverySupport: NutritionRecoverySupport;
    readinessLevel: NutritionAnalysis['readinessLevel'];
    conflictAnalysis: {
      restrictionConflicts: number;
      allergyConflicts: number;
      dislikedFoodConflicts: number;
      preferredFoodMatches: number;
    };
    trainingScheduledToday: boolean;
  }): NutritionRecommendation[] {
    const recommendations: NutritionRecommendation[] = [];
    const pushRecommendation = (
      code: NutritionRecommendationCode,
      summary: string,
      reason: string,
      priority: NutritionPriority,
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

    if (input.nutritionStatus === 'NO_PROFILE') {
      pushRecommendation(
        'SET_UP_NUTRITION_PROFILE',
        'Set up a nutrition profile.',
        'A nutrition profile is required for deterministic nutrition coaching.',
        'CRITICAL',
        Object.freeze({ nutritionStatus: input.nutritionStatus }),
      );
    }

    if (input.nutritionStatus === 'NO_PLAN') {
      pushRecommendation(
        'CREATE_OR_REFRESH_NUTRITION_PLAN',
        'Create or refresh the nutrition plan.',
        'A current nutrition plan is required to evaluate today’s meals.',
        'HIGH',
        Object.freeze({
          nutritionStatus: input.nutritionStatus,
          nutritionPlanAvailable: Boolean(input.nutritionPlan),
        }),
      );
    }

    if (input.conflictAnalysis.allergyConflicts > 0) {
      pushRecommendation(
        'ADDRESS_ALLERGY_CONFLICTS',
        'Address allergy conflicts immediately.',
        'A logged meal conflicts with a trusted allergy signal.',
        'CRITICAL',
        Object.freeze({
          allergyConflicts: input.conflictAnalysis.allergyConflicts,
        }),
      );
    }

    if (input.conflictAnalysis.restrictionConflicts > 0) {
      pushRecommendation(
        'RESPECT_DIETARY_RESTRICTIONS',
        'Respect dietary restrictions.',
        'A logged meal conflicts with a dietary restriction.',
        'HIGH',
        Object.freeze({
          restrictionConflicts: input.conflictAnalysis.restrictionConflicts,
        }),
      );
    }

    if (input.mealAssessment.missedCount > 0) {
      pushRecommendation(
        'COMPLETE_REMAINING_MEALS',
        'Complete remaining meals.',
        'One or more planned meals were not completed.',
        'HIGH',
        Object.freeze({
          missedMeals: input.mealAssessment.missedCount,
        }),
      );
    }

    if (
      input.mealAssessment.mealStatuses.some(
        (meal) => meal.mealType === 'breakfast' && meal.status === 'MISSED',
      )
    ) {
      pushRecommendation(
        'AVOID_SKIPPING_BREAKFAST',
        'Avoid skipping breakfast.',
        'Breakfast was not completed as planned.',
        'MEDIUM',
        Object.freeze({}),
      );
    }

    if (input.macroAssessment.protein.status === 'LOW') {
      pushRecommendation(
        'INCREASE_PROTEIN_INTAKE',
        'Increase protein intake.',
        'Protein is below the current target.',
        'HIGH',
        Object.freeze({
          proteinConsumed: input.macroAssessment.protein.consumed,
          proteinTarget: input.macroAssessment.protein.target,
        }),
      );
    } else if (input.macroAssessment.protein.status === 'PARTIAL') {
      pushRecommendation(
        'DISTRIBUTE_PROTEIN_MORE_EVENLY',
        'Distribute protein more evenly.',
        'Protein intake is only partially aligned with the current target.',
        'MEDIUM',
        Object.freeze({
          proteinConsumed: input.macroAssessment.protein.consumed,
          proteinTarget: input.macroAssessment.protein.target,
        }),
      );
    }

    const recoveryRecommendationNeeded =
      input.macroAssessment.overallStatus !== 'ON_TRACK' ||
      input.mealAssessment.mealTiming === 'BEHIND' ||
      input.mealAssessment.missedCount > 0;

    if (
      input.trainingScheduledToday &&
      input.recoverySupport.level !== 'SUPPORTIVE' &&
      recoveryRecommendationNeeded
    ) {
      pushRecommendation(
        'PRIORITIZE_POST_WORKOUT_NUTRITION',
        'Prioritize post-workout nutrition.',
        'A training session is scheduled today and recovery support is not yet optimal.',
        'MEDIUM',
        Object.freeze({
          trainingScheduledToday: input.trainingScheduledToday,
          recoverySupport: input.recoverySupport.level,
        }),
      );
    }

    if (
      input.recoverySupport.level === 'INSUFFICIENT' &&
      input.mealAssessment.mealTiming !== 'AHEAD'
    ) {
      pushRecommendation(
        'SUPPORT_RECOVERY_WITH_MEAL_TIMING',
        'Support recovery with meal timing.',
        'Meal timing is not fully aligned with the current recovery state.',
        'MEDIUM',
        Object.freeze({
          recoverySupport: input.recoverySupport.level,
          mealTiming: input.mealAssessment.mealTiming,
        }),
      );
    }

    if (input.macroAssessment.calories.status === 'LOW') {
      pushRecommendation(
        'REVIEW_CALORIE_INTAKE',
        'Review calorie intake.',
        'Calories are currently below the target.',
        'MEDIUM',
        Object.freeze({
          caloriesConsumed: input.macroAssessment.calories.consumed,
          caloriesTarget: input.macroAssessment.calories.target,
        }),
      );
    }

    if (
      input.mealAssessment.missedCount === 0 &&
      input.mealAssessment.partialCount === 0
    ) {
      pushRecommendation(
        'MAINTAIN_CURRENT_PLAN',
        'Maintain current nutrition plan.',
        'The current nutrition plan is being followed consistently.',
        'LOW',
        Object.freeze({
          nutritionStatus: input.nutritionStatus,
        }),
      );
    }

    if (
      input.mealAssessment.mealTiming === 'ON_TRACK' &&
      input.macroAssessment.overallStatus === 'PARTIAL'
    ) {
      pushRecommendation(
        'FOLLOW_TODAYS_NUTRITION_SCHEDULE',
        'Follow today’s nutrition schedule.',
        'Meals are scheduled, but adherence is not yet fully on target.',
        'LOW',
        Object.freeze({
          mealTiming: input.mealAssessment.mealTiming,
        }),
      );
    }

    if (
      input.conflictAnalysis.preferredFoodMatches > 0 &&
      input.recoverySupport.level === 'SUPPORTIVE' &&
      (input.macroAssessment.overallStatus !== 'ON_TRACK' ||
        input.mealAssessment.mealTiming !== 'AHEAD')
    ) {
      pushRecommendation(
        'PRIORITIZE_POST_WORKOUT_NUTRITION',
        'Prioritize post-workout nutrition.',
        'The meal pattern is supportive of training recovery.',
        'LOW',
        Object.freeze({
          preferredFoodMatches: input.conflictAnalysis.preferredFoodMatches,
        }),
      );
    }

    return this.uniqueRecommendations(recommendations);
  }

  private uniqueRecommendations(
    recommendations: readonly NutritionRecommendation[],
  ): NutritionRecommendation[] {
    const seen = new Set<NutritionRecommendationCode>();
    const result: NutritionRecommendation[] = [];

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
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority]
        );
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    });
  }

  private selectPrimaryRecommendation(
    recommendations: readonly NutritionRecommendation[],
    nutritionStatus?: NutritionStatus,
  ): NutritionRecommendation {
    if (recommendations.length === 0) {
      return Object.freeze({
        code:
          nutritionStatus === 'NO_PROFILE'
            ? 'SET_UP_NUTRITION_PROFILE'
            : nutritionStatus === 'NO_PLAN'
              ? 'CREATE_OR_REFRESH_NUTRITION_PLAN'
              : 'MAINTAIN_CURRENT_PLAN',
        summary:
          nutritionStatus === 'NO_PROFILE'
            ? 'Set up a nutrition profile.'
            : nutritionStatus === 'NO_PLAN'
              ? 'Create or refresh the nutrition plan.'
              : 'Maintain current nutrition plan.',
        reason: 'No stronger deterministic adjustment was required.',
        priority:
          nutritionStatus === 'NO_PROFILE'
            ? 'CRITICAL'
            : nutritionStatus === 'NO_PLAN'
              ? 'HIGH'
              : 'LOW',
        metadata: Object.freeze({ nutritionStatus }),
      });
    }

    return [...recommendations].sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority]
        );
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0];
  }

  private buildEmptyMacroAssessment(
    nutritionStatus: NutritionStatus,
  ): MacroAssessment {
    const emptyMacro = this.buildEmptyMacroTargetAssessment();

    return Object.freeze({
      calories: emptyMacro,
      protein: emptyMacro,
      carbs: emptyMacro,
      fat: emptyMacro,
      overallStatus: nutritionStatus,
      adherencePercentage: 0,
      summary: 'Macro assessment is unavailable.',
    });
  }

  private buildEmptyMealAssessment(
    nutritionStatus: NutritionStatus,
  ): MealAssessment {
    return Object.freeze({
      mealTiming: 'UNKNOWN',
      mealStatuses: Object.freeze([]),
      completedCount: 0,
      partialCount: 0,
      missedCount: 0,
      pendingCount: 0,
      totalMeals: 0,
      nextMealId: null,
      summary: `Meal assessment is unavailable for nutritionStatus=${nutritionStatus}.`,
    });
  }

  private buildEmptyMacroTargetAssessment() {
    return Object.freeze({
      target: 0,
      consumed: 0,
      delta: 0,
      ratio: null,
      status: 'UNKNOWN' as MacroAssessmentStatus,
      summary: 'Macro target is unavailable.',
    });
  }

  private assessMacroTarget(consumed: number, target: number) {
    if (!Number.isFinite(target) || target <= 0) {
      return Object.freeze({
        target,
        consumed,
        delta: consumed - target,
        ratio: null,
        status: 'UNKNOWN' as MacroAssessmentStatus,
        summary: 'Macro target is unavailable.',
      });
    }

    const ratio = (consumed / target) * 100;
    let status: MacroAssessmentStatus = 'PARTIAL';

    if (ratio >= 90 && ratio <= 110) {
      status = 'ON_TARGET';
    } else if (ratio < 75) {
      status = 'LOW';
    } else if (ratio > 120) {
      status = 'EXCEEDED';
    }

    return Object.freeze({
      target,
      consumed,
      delta: consumed - target,
      ratio: this.roundToTwoDecimals(ratio),
      status,
      summary: `consumed=${consumed}; target=${target}; status=${status}`,
    });
  }

  private resolveMacroOverallStatus(
    statuses: readonly MacroAssessmentStatus[],
  ): NutritionStatus {
    if (statuses.every((status) => status === 'ON_TARGET')) {
      return 'ON_TRACK';
    }

    if (statuses.some((status) => status === 'UNKNOWN')) {
      return 'UNKNOWN';
    }

    if (statuses.some((status) => status === 'LOW')) {
      return 'MISSED';
    }

    if (
      statuses.some((status) => status === 'PARTIAL' || status === 'EXCEEDED')
    ) {
      return 'PARTIAL';
    }

    return 'UNKNOWN';
  }

  private resolveMealStatus(input: {
    meal: Meal;
    log: NutritionLog | undefined;
    nextMealId: string | null;
  }): MealAssessmentStatus {
    if (input.log) {
      return this.mapMealLogStatus(input.log.status);
    }

    if (input.nextMealId && input.meal.id === input.nextMealId) {
      return 'PENDING';
    }

    return 'PENDING';
  }

  private mapMealLogStatus(status: MealLogStatus): MealAssessmentStatus {
    switch (status) {
      case 'consumed':
        return 'COMPLETED';
      case 'partial':
        return 'PARTIAL';
      case 'skipped':
        return 'MISSED';
      default:
        return 'UNKNOWN';
    }
  }

  private resolveMealTiming(input: {
    completedCount: number;
    partialCount: number;
    missedCount: number;
    pendingCount: number;
    nextMealId: string | null;
  }): MealTimingStatus {
    if (
      input.nextMealId === null &&
      input.pendingCount === 0 &&
      input.missedCount === 0
    ) {
      return 'AHEAD';
    }

    if (input.missedCount > 0) {
      return 'BEHIND';
    }

    if (input.partialCount > 0) {
      return 'ON_TRACK';
    }

    if (input.pendingCount > 0) {
      return 'ON_TRACK';
    }

    return 'UNKNOWN';
  }

  private buildMealStatusSummary(
    mealType: MealType,
    status: MealAssessmentStatus,
    logStatus?: MealLogStatus,
  ): string {
    const parts = [`mealType=${mealType}`, `status=${status}`];

    if (logStatus) {
      parts.push(`logStatus=${logStatus}`);
    }

    return parts.join('; ');
  }

  private resolveNutritionStatus(input: {
    nutritionProfilePresent: boolean;
    nutritionPlanPresent: boolean;
    todayNutritionPresent: boolean;
    macroAssessment: MacroAssessment;
    mealAssessment: MealAssessment;
    conflictAnalysis: {
      restrictionConflicts: number;
      allergyConflicts: number;
      dislikedFoodConflicts: number;
      preferredFoodMatches: number;
    };
  }): NutritionStatus {
    if (!input.nutritionProfilePresent) {
      return 'NO_PROFILE';
    }

    if (!input.nutritionPlanPresent || !input.todayNutritionPresent) {
      return 'NO_PLAN';
    }

    if (
      input.conflictAnalysis.allergyConflicts > 0 ||
      input.mealAssessment.missedCount > 1 ||
      input.macroAssessment.overallStatus === 'MISSED'
    ) {
      return 'MISSED';
    }

    if (
      input.macroAssessment.overallStatus === 'ON_TRACK' &&
      input.mealAssessment.missedCount === 0 &&
      input.mealAssessment.partialCount === 0 &&
      input.conflictAnalysis.restrictionConflicts === 0 &&
      input.conflictAnalysis.allergyConflicts === 0
    ) {
      return 'ON_TRACK';
    }

    if (
      input.macroAssessment.overallStatus === 'PARTIAL' ||
      input.mealAssessment.partialCount > 0 ||
      input.mealAssessment.pendingCount > 0 ||
      input.conflictAnalysis.restrictionConflicts > 0
    ) {
      return 'PARTIAL';
    }

    return 'UNKNOWN';
  }

  private assessRecoverySupport(input: {
    healthContext: UserHealthContext;
    macroAssessment: MacroAssessment;
    mealAssessment: MealAssessment;
    trainingScheduledToday: boolean;
    readinessLevel: NutritionAnalysis['readinessLevel'];
  }): NutritionRecoverySupport {
    const factors: string[] = [];
    let level: NutritionRecoverySupportLevel = 'UNKNOWN';

    if (input.trainingScheduledToday) {
      factors.push('training_scheduled_today');
    }

    if (input.readinessLevel === 'LOW') {
      factors.push('low_readiness');
      level = 'INSUFFICIENT';
    }

    if (input.macroAssessment.protein.status === 'LOW') {
      factors.push('low_protein_support');
      level = level === 'UNKNOWN' ? 'PARTIAL' : level;
    }

    if (input.macroAssessment.calories.status === 'LOW') {
      factors.push('low_calorie_support');
      level = level === 'UNKNOWN' ? 'PARTIAL' : level;
    }

    if (input.mealAssessment.missedCount > 0) {
      factors.push('missed_meals');
      level = 'INSUFFICIENT';
    }

    if (input.mealAssessment.mealTiming === 'BEHIND') {
      factors.push('meal_timing_behind');
      level = level === 'UNKNOWN' ? 'PARTIAL' : level;
    }

    if (
      !input.trainingScheduledToday &&
      input.macroAssessment.overallStatus === 'ON_TRACK' &&
      input.mealAssessment.missedCount === 0 &&
      input.readinessLevel !== 'LOW'
    ) {
      level = 'SUPPORTIVE';
    } else if (
      input.trainingScheduledToday &&
      input.readinessLevel === 'HIGH' &&
      input.macroAssessment.overallStatus === 'ON_TRACK' &&
      input.mealAssessment.mealTiming !== 'BEHIND'
    ) {
      level = 'SUPPORTIVE';
    } else if (
      level === 'UNKNOWN' &&
      (input.macroAssessment.overallStatus === 'PARTIAL' ||
        input.mealAssessment.partialCount > 0)
    ) {
      level = 'PARTIAL';
    }

    const summary =
      level === 'SUPPORTIVE'
        ? 'Nutrition is supporting recovery.'
        : level === 'PARTIAL'
          ? 'Nutrition partially supports recovery.'
          : level === 'INSUFFICIENT'
            ? 'Nutrition is not yet sufficient for recovery.'
            : 'Recovery support is unknown.';

    return Object.freeze({
      level,
      summary,
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        trainingScheduledToday: input.trainingScheduledToday,
        readinessLevel: input.readinessLevel,
        macroStatus: input.macroAssessment.overallStatus,
        mealTiming: input.mealAssessment.mealTiming,
      }),
    });
  }

  private resolveGoalAlignment(
    healthContext: UserHealthContext,
    nutritionGoal: NonNullable<UserHealthContext['nutritionProfile']>['goal'],
    meals: readonly Meal[],
    todayWorkout: UserHealthContext['todayWorkout'],
  ): NutritionGoalAlignment {
    const workoutText =
      `${todayWorkout?.title ?? ''} ${todayWorkout?.focus ?? ''} ${todayWorkout?.format ?? ''}`.toLowerCase();
    const mealText = meals
      .map((meal) => `${meal.title} ${meal.description} ${meal.type}`)
      .join(' ')
      .toLowerCase();

    if (workoutText.includes('strength') || workoutText.includes('power')) {
      return 'strength';
    }

    if (
      workoutText.includes('endurance') ||
      workoutText.includes('cardio') ||
      workoutText.includes('conditioning')
    ) {
      return 'endurance';
    }

    if (mealText.includes('strength') || mealText.includes('power')) {
      return 'strength';
    }

    if (
      mealText.includes('endurance') ||
      mealText.includes('cardio') ||
      mealText.includes('conditioning')
    ) {
      return 'endurance';
    }

    switch (healthContext.goal ?? nutritionGoal) {
      case 'lose_weight':
        return 'fat_loss';
      case 'gain_muscle':
        return 'muscle_gain';
      case 'maintain':
        return 'maintenance';
      default:
        return nutritionGoal;
    }
  }

  private resolveConflictSignals(input: {
    nutritionProfile: NonNullable<UserHealthContext['nutritionProfile']>;
    meals: readonly Meal[];
  }): {
    restrictionConflicts: number;
    allergyConflicts: number;
    dislikedFoodConflicts: number;
    preferredFoodMatches: number;
  } {
    const mealText = input.meals
      .map((meal) =>
        [
          meal.title,
          meal.description,
          ...meal.foodItems.map((foodItem) => foodItem.name),
          ...meal.foodItems.flatMap((foodItem) => foodItem.tags),
        ]
          .join(' ')
          .toLowerCase(),
      )
      .join(' ');

    const restrictionConflicts =
      input.nutritionProfile.dietaryRestrictions.filter((restriction) =>
        this.containsToken(mealText, restriction),
      ).length;
    const allergyConflicts = input.nutritionProfile.allergies.filter(
      (allergy) => this.containsToken(mealText, allergy),
    ).length;
    const dislikedFoodConflicts = input.nutritionProfile.dislikedFoods.filter(
      (food) => this.containsToken(mealText, food),
    ).length;
    const preferredFoodMatches = input.nutritionProfile.preferredFoods.filter(
      (food) => this.containsToken(mealText, food),
    ).length;

    return {
      restrictionConflicts,
      allergyConflicts,
      dislikedFoodConflicts,
      preferredFoodMatches,
    };
  }

  private containsToken(text: string, token: string): boolean {
    const normalizedToken = token.trim().toLowerCase();

    if (!normalizedToken) {
      return false;
    }

    return text.includes(normalizedToken);
  }

  private resolveReadinessLevel(
    healthContext: UserHealthContext,
  ): NutritionAnalysis['readinessLevel'] {
    const readinessScore = healthContext.recoverySnapshot?.readinessScore;

    if (typeof readinessScore === 'number') {
      if (readinessScore >= 75) {
        return 'HIGH';
      }

      if (readinessScore >= 45) {
        return 'MEDIUM';
      }

      return 'LOW';
    }

    if (healthContext.fatigueLevel === 'LOW') {
      return 'HIGH';
    }

    if (healthContext.fatigueLevel === 'MODERATE') {
      return 'MEDIUM';
    }

    if (healthContext.fatigueLevel === 'HIGH') {
      return 'LOW';
    }

    return 'UNKNOWN';
  }

  private buildRiskSummary(
    level: NutritionPriority,
    factors: readonly string[],
  ): string {
    if (factors.length === 0) {
      return `risk=${level.toLowerCase()}; factors=none`;
    }

    return `risk=${level.toLowerCase()}; factors=${factors.join(',')}`;
  }

  private selectPrimaryRecommendation(
    recommendations: readonly NutritionRecommendation[],
    nutritionStatus?: NutritionStatus,
  ): NutritionRecommendation {
    if (recommendations.length === 0) {
      return Object.freeze({
        code:
          nutritionStatus === 'NO_PROFILE'
            ? 'SET_UP_NUTRITION_PROFILE'
            : nutritionStatus === 'NO_PLAN'
              ? 'CREATE_OR_REFRESH_NUTRITION_PLAN'
              : 'MAINTAIN_CURRENT_PLAN',
        summary:
          nutritionStatus === 'NO_PROFILE'
            ? 'Set up a nutrition profile.'
            : nutritionStatus === 'NO_PLAN'
              ? 'Create or refresh the nutrition plan.'
              : 'Maintain current nutrition plan.',
        reason: 'No stronger deterministic adjustment was required.',
        priority:
          nutritionStatus === 'NO_PROFILE'
            ? 'CRITICAL'
            : nutritionStatus === 'NO_PLAN'
              ? 'HIGH'
              : 'LOW',
        metadata: Object.freeze({ nutritionStatus }),
      });
    }

    return [...recommendations].sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority]
        );
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0];
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
