import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { CoachNutritionContext } from '../../context-builder/coach-nutrition-context.types';
import { unavailableCoachNutritionContext } from '../../context-builder/coach-nutrition-context.types';
import type {
  NutritionAnalysis,
  NutritionCanonicalResponse,
  NutritionExplainabilityFact,
  NutritionExpertContribution,
  NutritionPriority,
  NutritionRecommendation,
  NutritionRecommendationCode,
  NutritionRiskAssessment,
  NutritionStatus,
} from './nutrition-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const NUTRITION_EXPERT_ID = 'NutritionExpert';

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
          confidence: analysis.confidence,
          riskLevel: analysis.riskAssessment.level,
        }),
      }),
    });
  }

  override analyze(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertResult {
    const analysis = this.buildAnalysis(context, input.userMessage);
    const contribution = this.buildContribution(analysis, context);
    return {
      expertId: this.metadata.id,
      summary: contribution.summary,
      contributions: this.buildContributions(contribution),
      metadata: Object.freeze({
        expertId: this.metadata.id,
        category: this.metadata.category,
        priority: contribution.priority,
        intent: input.intent,
        runtimeMode: 'deterministic-domain-specialist',
        analysis: contribution.analysis,
        nutritionBoundary: Object.freeze({
          source: 'nutrition_read_model',
          contractVersion: 'nutrition-read-model-v1',
          factsUsed: analysis.canonicalResponse?.factsUsed ?? ['availability'],
        }),
      }),
    };
  }

  override contribute(
    _input: CoachExpertRequest,
    _context: CoachExpertContext,
    result: CoachExpertResult,
  ): readonly CoachExpertContribution[] {
    return result.contributions;
  }

  private buildAnalysis(
    context: CoachExpertContext,
    userMessage = '',
  ): NutritionAnalysis {
    const nutrition =
      context.nutritionContext ??
      context.healthContext?.nutritionContext ??
      unavailableCoachNutritionContext();
    const response = this.buildResponse(nutrition, userMessage);
    const priority = this.mapPriority(nutrition);
    const recommendation: NutritionRecommendation = Object.freeze({
      code: this.mapAction(response.action.type),
      summary: response.text,
      reason: 'The response is based on the canonical NutritionReadModel.',
      priority,
      metadata: Object.freeze({ source: 'nutrition_read_model' }),
    });
    const risk: NutritionRiskAssessment = Object.freeze({
      level: priority,
      summary: 'Nutrition state is represented by the canonical daily model.',
      factors: Object.freeze([`availability=${nutrition.availability}`]),
      metadata: Object.freeze({ source: 'nutrition_read_model' }),
    });
    return Object.freeze({
      nutritionStatus: this.mapStatus(nutrition),
      macroAssessment: this.emptyMacroAssessment(),
      mealAssessment: this.emptyMealAssessment(),
      goalAlignment: 'unknown',
      recoverySupport: {
        level: 'UNKNOWN' as const,
        summary: 'Recovery support is not inferred from Nutrition data.',
        factors: ['canonical_nutrition_boundary'],
        metadata: {},
      },
      riskAssessment: risk,
      recommendations: Object.freeze([recommendation]),
      confidence: nutrition.availability === 'available' ? 'HIGH' : 'LOW',
      priority,
      signals: Object.freeze([
        'source=nutrition_read_model',
        `availability=${nutrition.availability}`,
        `freshness=${nutrition.freshness}`,
      ]),
      trainingScheduledToday: false,
      restrictionConflicts: 0,
      allergyConflicts: 0,
      dislikedFoodConflicts: 0,
      preferredFoodMatches: 0,
      readinessLevel: 'UNKNOWN',
      canonicalAvailability: nutrition.availability,
      canonicalFreshness: nutrition.freshness,
      canonicalResponse: response,
    });
  }

  private buildResponse(
    nutrition: CoachNutritionContext,
    message: string,
  ): NutritionCanonicalResponse {
    const facts: NutritionExplainabilityFact[] = ['availability', 'freshness'];
    const action = nutrition.focus?.action ??
      nutrition.insight?.action ??
      nutrition.actions[0] ?? { type: 'none' as const };
    const normalized = message.toLowerCase();
    let text: string;
    if (this.isSafetyQuestion(normalized)) {
      text =
        'I can explain your current nutrition targets and logged progress, but I cannot prescribe a diet or assess a medical condition. For personalised medical guidance, speak with a qualified healthcare professional.';
    } else if (nutrition.availability === 'not_configured') {
      text =
        nutrition.focus?.message ??
        'Your nutrition setup is not complete yet. Finish your nutrition profile to start receiving daily targets.';
      facts.push('focus');
    } else if (nutrition.availability === 'processing_failed') {
      text = 'I could not retrieve today’s nutrition progress right now.';
    } else if (nutrition.availability === 'not_available') {
      text = 'Today’s nutrition information is temporarily unavailable.';
    } else if (nutrition.availability === 'insufficient_data') {
      text =
        nutrition.focus?.message ??
        nutrition.insight?.message ??
        'There is not enough information to summarize today’s nutrition progress.';
      if (nutrition.focus) facts.push('focus');
      if (nutrition.insight) facts.push('insight');
    } else if (
      normalized.includes('protein') ||
      normalized.includes('proteína')
    ) {
      facts.push('macro_progress');
      const protein = nutrition.macros.find(
        (macro) => macro.nutrient === 'protein',
      );
      text = protein
        ? protein.target === null
          ? `You have logged ${protein.consumed} ${protein.unit} of protein, but no protein target is currently configured.`
          : `You have logged ${protein.consumed} ${protein.unit} of protein toward a target of ${protein.target} ${protein.unit}.`
        : 'Protein progress is not available in today’s nutrition data.';
    } else if (normalized.includes('meal') || normalized.includes('refeição')) {
      facts.push('meal_progress');
      text = nutrition.meals
        ? `You have completed ${nutrition.meals.completed} of ${nutrition.meals.planned} planned meals.${nutrition.meals.nextMeal ? ` Your next planned meal is ${nutrition.meals.nextMeal.title}.` : ''}`
        : 'Meal progress is not available in today’s nutrition data.';
    } else if (
      normalized.includes('calorie') ||
      normalized.includes('caloria')
    ) {
      facts.push('calorie_progress');
      text = this.calorieText(nutrition);
    } else if (
      normalized.includes('focus') ||
      normalized.includes('agora') ||
      normalized.includes('foco')
    ) {
      facts.push('focus');
      text =
        nutrition.focus?.message ??
        'There is no current nutrition focus available.';
    } else {
      facts.push('calorie_progress', 'meal_progress');
      text = `${this.calorieText(nutrition)}${nutrition.meals ? ` You have completed ${nutrition.meals.completed} of ${nutrition.meals.planned} planned meals.` : ''}`;
    }
    if (nutrition.freshness === 'stale')
      text += ' This nutrition summary may not include your latest updates.';
    if (nutrition.freshness === 'legacy')
      text += ' Some nutrition information may need to be refreshed.';
    return Object.freeze({
      text,
      factsUsed: Object.freeze([...new Set(facts)]),
      action,
    });
  }

  private calorieText(nutrition: CoachNutritionContext): string {
    if (!nutrition.calories || nutrition.calories.target === null)
      return 'Calorie progress is available, but no calorie target is currently configured.';
    if (nutrition.calories.state === 'above_target')
      return nutrition.calories.excess === null
        ? 'Your logged intake is above today’s calorie target.'
        : `Your logged intake is above today’s calorie target by ${nutrition.calories.excess} calories.`;
    return nutrition.calories.remaining === null
      ? `You have logged ${nutrition.calories.consumed} calories toward a target of ${nutrition.calories.target}.`
      : `You have ${nutrition.calories.remaining} calories remaining today.`;
  }

  private isSafetyQuestion(message: string): boolean {
    return [
      'diet',
      'allerg',
      'supplement',
      'medication',
      'medical',
      'diagnos',
      'lose 10 kg',
      'remédio',
    ].some((term) => message.includes(term));
  }

  private mapStatus(nutrition: CoachNutritionContext): NutritionStatus {
    if (nutrition.availability === 'not_configured') return 'NO_PROFILE';
    if (nutrition.availability === 'insufficient_data') return 'PARTIAL';
    if (nutrition.availability !== 'available') return 'UNKNOWN';
    switch (nutrition.adherenceStatus) {
      case 'within_range':
        return 'ON_TRACK';
      case 'above_range':
        return 'MISSED';
      default:
        return 'PARTIAL';
    }
  }

  private mapPriority(nutrition: CoachNutritionContext): NutritionPriority {
    return nutrition.availability === 'processing_failed' ||
      nutrition.availability === 'not_available'
      ? 'HIGH'
      : nutrition.availability === 'not_configured'
        ? 'CRITICAL'
        : nutrition.availability === 'insufficient_data'
          ? 'MEDIUM'
          : 'LOW';
  }

  private mapAction(
    type: CoachNutritionContext['actions'][number]['type'],
  ): NutritionRecommendationCode {
    const map: Record<string, NutritionRecommendationCode> = {
      open_profile: 'SET_UP_NUTRITION_PROFILE',
      create_plan: 'CREATE_OR_REFRESH_NUTRITION_PLAN',
      open_today_meals: 'FOLLOW_TODAYS_NUTRITION_SCHEDULE',
      log_meal: 'COMPLETE_REMAINING_MEALS',
    };
    return map[type] ?? 'MAINTAIN_CURRENT_PLAN';
  }

  private emptyMacroAssessment(): NutritionAnalysis['macroAssessment'] {
    const target = (summary: string) => ({
      target: 0,
      consumed: 0,
      delta: 0,
      ratio: null,
      status: 'UNKNOWN' as const,
      summary,
    });
    return {
      calories: target('Unavailable'),
      protein: target('Unavailable'),
      carbs: target('Unavailable'),
      fat: target('Unavailable'),
      overallStatus: 'UNKNOWN' as NutritionStatus,
      adherencePercentage: 0,
      summary: 'Canonical macro progress is presented by the read model.',
    };
  }

  private emptyMealAssessment(): NutritionAnalysis['mealAssessment'] {
    return {
      mealTiming: 'UNKNOWN',
      mealStatuses: [],
      completedCount: 0,
      partialCount: 0,
      missedCount: 0,
      pendingCount: 0,
      totalMeals: 0,
      nextMealId: null,
      summary: 'Canonical meal progress is presented by the read model.',
    };
  }

  private buildContribution(
    analysis: NutritionAnalysis,
    context: CoachExpertContext,
  ): NutritionExpertContribution {
    const recommendation = analysis.recommendations[0];
    return {
      expertId: this.metadata.id,
      summary:
        analysis.canonicalResponse?.text ??
        'Nutrition information is unavailable.',
      analysis,
      recommendations: analysis.recommendations,
      risks: [analysis.riskAssessment],
      goalAlignment: analysis.goalAlignment,
      recoverySupport: analysis.recoverySupport,
      confidence: analysis.confidence,
      priority: analysis.priority,
      metadata: {
        selectionReason: context.selectionReason,
        recommendationCode: recommendation?.code,
      },
    };
  }

  private buildContributions(
    contribution: NutritionExpertContribution,
  ): readonly CoachExpertContribution[] {
    return Object.freeze([
      {
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: { kind: 'analysis' },
      },
      {
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: contribution.summary,
        metadata: { kind: 'contribution' },
      },
    ]);
  }
}
