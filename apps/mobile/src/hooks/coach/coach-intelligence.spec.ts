import type { CoachDecision } from '@elev9/types';

import { buildAskCoachModel } from './ask-coach-helpers';
import {
  buildCoachExplanation,
  buildCoachIntelligence,
  buildCoachPersonaGuidance,
  getCoachBadgeLabel,
  getCoachConfidenceLabel,
  getCoachFocusLabel,
  getCoachRecommendationTarget,
  mapCoachConfidence,
  mapCoachEvidence,
  mapCoachRecommendation,
  mapCoachRisk,
  mapUnifiedCoachInsight,
} from './coach-intelligence';
import { buildConversationContext } from './coach-conversation-helpers';

describe('coach intelligence helpers', () => {
  const workoutDecision: CoachDecision = {
    id: 'decision-workout',
    userProfileId: 'user-1',
    date: '2026-07-05',
    priority: 'training',
    headline: 'Push the session',
    summary: 'Today is a good workout day.',
    actionItems: ['Warm up well', 'Warm up well', 'Increase tempo'],
    influences: [],
    sourceContext: {},
    formulaVersion: '1',
    generatedBy: 'deterministic',
    createdAt: '2026-07-05T08:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
  };

  const recoveryDecision: CoachDecision = {
    ...workoutDecision,
    id: 'decision-recovery',
    priority: 'recovery',
    headline: 'Prioritize recovery',
    summary: 'Keep intensity low today.',
    actionItems: ['Reduce intensity', 'Sleep 8 hours'],
  };

  const progressDecision: CoachDecision = {
    ...workoutDecision,
    id: 'decision-progress',
    priority: 'motivation',
    headline: 'Review your progress',
    summary: 'You are in a plateau window.',
    actionItems: ['Review the trend', 'Keep the streak alive'],
  };

  const multiSignalInput = {
    coachDecision: recoveryDecision,
    currentGoal: {
      id: 'goal-1',
      type: 'lose_weight',
      status: 'active',
    } as any,
    workout: {
      title: 'Easy run',
      focus: 'Aerobic base',
      exercises: [{ id: 'workout-1' }],
      intensity: 'easy',
      format: 'cardio',
    } as any,
    recoverySnapshot: {
      date: '2026-07-05',
      readinessScore: 35,
      fatigueScore: 72,
      recoveryTrend: 'down',
      recommendedIntensity: 'light',
    } as any,
    nutrition: {
      date: '2026-07-05',
      nutritionFocus: 'Increase calories',
      progress: {
        adherencePercentage: 48,
      },
      meals: [{ title: 'Breakfast' }],
      nextMeal: { title: 'Lunch' },
    } as any,
    goalProgressSnapshot: {
      goalId: 'goal-1',
      progressPercentage: 30,
      trend: 'declining',
      currentValue: 80,
      targetValue: 70,
    } as any,
    goalForecast: {
      goalId: 'goal-1',
      confidence: 'low',
      estimatedDaysRemaining: 10,
      predictedCompletionDate: '2026-07-15',
    } as any,
    goalMilestones: [
      {
        id: 'milestone-1',
        title: 'First 5 workouts',
        achievedAt: '2026-07-04',
      },
    ] as any,
    goalAchievements: [
      {
        id: 'achievement-1',
        title: 'Completed first week',
        achievedAt: '2026-07-04',
      },
    ] as any,
    habitSnapshot: {
      date: '2026-07-05',
      consistencyScore: 78,
      streakDays: 6,
      trend: 'flat',
      adherenceScore: 75,
    } as any,
    consistencySummary: {
      updatedAt: '2026-07-05T08:00:00.000Z',
      score: 78,
      riskLevel: 'high',
      trend: 'flat',
      currentStreak: 6,
      longestStreak: 10,
    } as any,
    progressSummary: {
      period: 'weekly',
      currentStreak: 4,
      workoutsCompleted: 3,
      totalDurationMinutes: 180,
      averageDurationMinutes: 45,
      lastWorkoutDate: '2026-07-04',
    } as any,
    personalizationSnapshot: {
      date: '2026-07-05',
      preferredCoachingStyle: 'motivational',
      engagementProfile: 'low',
      trend: 'down',
      riskOfDisengagement: 'high',
    } as any,
  };

  it('builds a single expert workout intelligence with deduped recommendations', () => {
    const intelligence = buildCoachIntelligence({
      coachDecision: workoutDecision,
      currentGoal: null,
    });

    expect(intelligence?.primaryExpert).toBe('Workout');
    expect(intelligence?.participatingExperts).toEqual(['Workout']);
    expect(intelligence?.currentFocus).toBe('WORKOUT');
    expect(intelligence?.recommendations).toHaveLength(2);
    expect(intelligence?.currentRisk).toBeNull();
    expect(
      getCoachBadgeLabel(
        intelligence?.primaryExpert ?? null,
        intelligence?.currentRisk ?? null,
      ),
    ).toBe('Workout Focus');
    expect(
      getCoachRecommendationTarget(intelligence?.topRecommendation ?? null),
    ).toBe('workout');
  });

  it('merges multiple expert signals into a critical recovery intelligence', () => {
    const intelligence = buildCoachIntelligence(multiSignalInput);
    const explanation = buildCoachExplanation({
      intelligence,
      persona: buildCoachPersonaGuidance({
        intelligence,
        personalizationSnapshot: {
          preferredCoachingStyle: 'motivational',
        } as any,
        currentGoal: multiSignalInput.currentGoal,
      }),
    });

    expect(intelligence?.primaryExpert).toBe('Recovery');
    expect(intelligence?.participatingExperts).toEqual([
      'Workout',
      'Nutrition',
      'Recovery',
      'Goal',
      'Habit',
      'Progress',
      'Motivation',
    ]);
    expect(intelligence?.currentFocus).toBe('SAFETY');
    expect(intelligence?.currentRisk?.level).toBe('CRITICAL');
    expect(intelligence?.confidence.level).toBe('HIGH');
    expect(intelligence?.topRecommendation?.priority).toBe('SAFETY_CRITICAL');
    expect(explanation?.confidenceExplanation.confidence).toBe('HIGH');
    expect(explanation?.missingEvidence).toHaveLength(0);
    expect(explanation?.decisionReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LOW_RECOVERY' }),
      ]),
    );
    expect(explanation?.summary).toBe(
      'Safety focus. Critical risk. cautious guidance.',
    );
  });

  it('derives persona guidance for recovery, plateau and milestone contexts', () => {
    const criticalIntelligence = buildCoachIntelligence(multiSignalInput);
    const criticalPersona = buildCoachPersonaGuidance({
      intelligence: criticalIntelligence,
      personalizationSnapshot: {
        preferredCoachingStyle: 'motivational',
      } as any,
      currentGoal: multiSignalInput.currentGoal,
    });

    const plateauIntelligence = buildCoachIntelligence({
      coachDecision: progressDecision,
      currentGoal: {
        id: 'goal-2',
        type: 'improve_endurance',
        status: 'active',
      } as any,
      goalProgressSnapshot: {
        goalId: 'goal-2',
        progressPercentage: 35,
        trend: 'declining',
        currentValue: 12,
        targetValue: 18,
      } as any,
      progressSummary: {
        period: 'weekly',
        currentStreak: 1,
        workoutsCompleted: 1,
        totalDurationMinutes: 60,
        averageDurationMinutes: 60,
        lastWorkoutDate: '2026-07-04',
      } as any,
      personalizationSnapshot: {
        preferredCoachingStyle: 'direct',
      } as any,
    });

    const milestoneIntelligence = buildCoachIntelligence({
      coachDecision: {
        ...workoutDecision,
        id: 'decision-milestone',
        priority: 'motivation',
        headline: 'Celebrate the milestone',
        summary: 'You reached a new streak milestone.',
        actionItems: ['Acknowledge the streak'],
      },
      currentGoal: {
        id: 'goal-3',
        type: 'improve_endurance',
        status: 'achieved',
      } as any,
      goalMilestones: [
        {
          id: 'milestone-2',
          title: 'Ten-day streak',
          achievedAt: '2026-07-05',
        },
      ] as any,
    });

    const plateauPersona = buildCoachPersonaGuidance({
      intelligence: plateauIntelligence,
      personalizationSnapshot: {
        preferredCoachingStyle: 'direct',
      } as any,
      currentGoal: {
        id: 'goal-2',
        type: 'improve_endurance',
        status: 'active',
      } as any,
    });

    const milestonePersona = buildCoachPersonaGuidance({
      intelligence: milestoneIntelligence,
      personalizationSnapshot: {
        preferredCoachingStyle: 'balanced',
      } as any,
      currentGoal: {
        id: 'goal-3',
        type: 'improve_endurance',
        status: 'achieved',
      } as any,
    });

    expect(criticalPersona?.tone).toBe('CAUTIOUS');
    expect(criticalPersona?.verbosity).toBe('VERY_SHORT');
    expect(criticalPersona?.urgency).toBe('CRITICAL');
    expect(criticalPersona?.safetyLevel).toBe('STRICT');
    expect(criticalPersona?.technicalDepth).toBe('BEGINNER');

    expect(plateauPersona?.tone).toBe('ANALYTICAL');
    expect(plateauPersona?.focus).toBe('MOTIVATION');
    expect(plateauPersona?.technicalDepth).toBe('ADVANCED');
    expect(plateauPersona?.verbosity).toBe('DETAILED');

    expect(milestonePersona?.tone).toBe('CELEBRATORY');
    expect(milestonePersona?.celebrationLevel).toBe('HIGH');
    expect(milestonePersona?.safetyLevel).toBe('NORMAL');
  });

  it('adapts the ask coach and conversation adapters from unified intelligence', () => {
    const intelligence = buildCoachIntelligence(multiSignalInput);
    const persona = buildCoachPersonaGuidance({
      intelligence,
      personalizationSnapshot: {
        preferredCoachingStyle: 'motivational',
      } as any,
      currentGoal: multiSignalInput.currentGoal,
    });
    const explanation = buildCoachExplanation({ intelligence, persona });

    const askCoachModel = buildAskCoachModel({
      coachDecision: multiSignalInput.coachDecision,
      intelligence,
      insight: mapUnifiedCoachInsight({ intelligence }),
      persona,
      currentGoal: multiSignalInput.currentGoal,
      habitSnapshot: multiSignalInput.habitSnapshot,
      personalizationSnapshot: multiSignalInput.personalizationSnapshot,
      chatHistory: [],
      recoveryScore: 35,
      hasWorkout: true,
      nutritionFocus: 'Increase calories',
      nextMealTitle: 'Lunch',
      selectedCategory: 'recovery',
    });

    const conversationContext = buildConversationContext({
      coachStatus: '2026-07-05T08:00:00.000Z',
      hasWorkout: true,
      hasRecovery: true,
      hasNutrition: true,
      hasProgress: true,
      priority: 'recovery',
      intelligence,
      persona,
      explanation,
    });

    expect(askCoachModel?.heroSubtitle).toContain('cautious guidance');
    expect(askCoachModel?.accessibilityLabel).toContain('Prioritize recovery');
    expect(conversationContext.focus).toBe('Safety');
    expect(conversationContext.risk).toBe('Critical risk');
    expect(conversationContext.confidence).toBe('High confidence');
    expect(conversationContext.persona).toBe('cautious · very_short');
    expect(conversationContext.topRecommendation).toBe('Reduce intensity');
  });

  it('exposes stable mapping helpers', () => {
    const intelligence = buildCoachIntelligence(multiSignalInput);

    const insight = mapUnifiedCoachInsight({ intelligence });

    expect(insight.headline).toBe('Prioritize recovery');
    expect(getCoachFocusLabel(insight.currentFocus)).toBe('Safety');
    expect(getCoachConfidenceLabel(insight.confidence?.level ?? null)).toBe(
      'High confidence',
    );
    expect(mapCoachRecommendation(intelligence!.topRecommendation!)).toBe(
      intelligence!.topRecommendation,
    );
    expect(mapCoachRisk(intelligence!.currentRisk!)).toBe(
      intelligence!.currentRisk,
    );
    expect(mapCoachConfidence(intelligence!.confidence)).toBe(
      intelligence!.confidence,
    );
    expect(mapCoachEvidence(intelligence!.evidence[0])).toBe(
      intelligence!.evidence[0],
    );
  });
});
