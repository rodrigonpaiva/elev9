import type { CoachDecision, CoachChatHistoryMessage } from '@elev9/types';

import {
  buildAskCoachModel,
  buildPersonalizedSuggestions,
  buildRecentConversations,
  cleanMessageTitle,
  dedupeQuestions,
  getDefaultCategory,
} from './coach/ask-coach-helpers';

describe('ask coach helpers', () => {
  const coachDecision: CoachDecision = {
    id: 'decision-1',
    userProfileId: 'user-1',
    date: '2026-07-05',
    priority: 'nutrition',
    headline: 'Focus on protein',
    summary: 'Keep meals steady today.',
    actionItems: ['Prioritize protein', 'Keep meals consistent'],
    influences: [],
    sourceContext: {},
    formulaVersion: '1',
    generatedBy: 'deterministic',
    createdAt: '2026-07-05T08:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
  };

  it('maps coach priorities to the default category', () => {
    expect(getDefaultCategory('training')).toBe('training');
    expect(getDefaultCategory('nutrition')).toBe('nutrition');
    expect(getDefaultCategory('recovery')).toBe('recovery');
    expect(getDefaultCategory('consistency')).toBe('habits');
    expect(getDefaultCategory('motivation')).toBe('motivation');
  });

  it('returns no model when the coach has no contextual signal', () => {
    expect(
      buildAskCoachModel({
        coachDecision: undefined,
        currentGoal: null,
        habitSnapshot: null,
        personalizationSnapshot: null,
        chatHistory: [],
        recoveryScore: undefined,
        hasWorkout: false,
        nutritionFocus: undefined,
        nextMealTitle: undefined,
        selectedCategory: 'training',
      }),
    ).toBeNull();
  });

  it('filters questions by the selected category', () => {
    const trainingModel = buildAskCoachModel({
      coachDecision,
      currentGoal: null,
      habitSnapshot: null,
      personalizationSnapshot: null,
      chatHistory: [],
      recoveryScore: 50,
      hasWorkout: true,
      nutritionFocus: 'protein',
      nextMealTitle: 'Lunch',
      selectedCategory: 'training',
    });

    const nutritionModel = buildAskCoachModel({
      coachDecision,
      currentGoal: null,
      habitSnapshot: null,
      personalizationSnapshot: null,
      chatHistory: [],
      recoveryScore: 50,
      hasWorkout: true,
      nutritionFocus: 'protein',
      nextMealTitle: 'Lunch',
      selectedCategory: 'nutrition',
    });

    expect(
      trainingModel?.questions.every(
        (question) => question.category === 'training',
      ),
    ).toBe(true);
    expect(
      nutritionModel?.questions.every(
        (question) => question.category === 'nutrition',
      ),
    ).toBe(true);
    expect(nutritionModel?.questions[0]?.text).toBe(
      'What is my nutrition priority today?',
    );
  });

  it('builds personalized suggestions and recent conversation shortcuts', () => {
    expect(
      buildPersonalizedSuggestions({
        coachDecision,
        currentGoal: null,
        habitSnapshot: null,
        recoveryScore: 50,
        hasWorkout: true,
        nutritionFocus: 'protein',
      }),
    ).toEqual([
      {
        id: 'recovery-lower',
        title: 'Ask why recovery needs attention.',
        explanation:
          'Your coach can help you decide whether to lower intensity.',
        outcome: 'A safer plan for today',
        prompt: "Why is recovery important for today's plan?",
      },
      {
        id: 'workout-priority',
        title: "Understand today's workout priority.",
        explanation:
          'Get the reason behind the training focus before you start.',
        outcome: 'Clearer intent for the session',
        prompt: "What should I focus on in today's workout?",
      },
      {
        id: 'nutrition-goal',
        title: "Learn how today's meals affect your goal.",
        explanation:
          'Connect your next meals to recovery, energy and progress.',
        outcome: 'Better food choices today',
        prompt: "How do today's meals support my goal?",
      },
    ]);

    const history: CoachChatHistoryMessage[] = [
      {
        role: 'assistant',
        content: 'Keep going',
        createdAt: '2026-07-05T08:00:00.000Z',
      },
      {
        role: 'user',
        content: '  Protein timing  ',
        createdAt: '2026-07-05T08:05:00.000Z',
      },
      {
        role: 'user',
        content: 'Recovery after strength workout',
        createdAt: '2026-07-05T09:00:00.000Z',
      },
      {
        role: 'user',
        content: 'Sleep consistency',
        createdAt: '2026-07-05T10:00:00.000Z',
      },
      {
        role: 'user',
        content: 'Nutrition priority',
        createdAt: '2026-07-05T11:00:00.000Z',
      },
    ];

    expect(buildRecentConversations(history)).toEqual([
      {
        id: '2026-07-05T11:00:00.000Z-0',
        title: 'Nutrition priority',
        subtitle: expect.any(String),
      },
      {
        id: '2026-07-05T10:00:00.000Z-1',
        title: 'Sleep consistency',
        subtitle: expect.any(String),
      },
      {
        id: '2026-07-05T09:00:00.000Z-2',
        title: 'Recovery after strength workout',
        subtitle: expect.any(String),
      },
    ]);
  });

  it('deduplicates questions and cleans titles', () => {
    expect(
      dedupeQuestions([
        { id: '1', category: 'training', text: 'Should I train today?' },
        { id: '2', category: 'training', text: 'should i train today?' },
        { id: '3', category: 'nutrition', text: 'What should I eat?' },
      ]),
    ).toHaveLength(2);

    expect(cleanMessageTitle('  Protein timing?!  ')).toBe('Protein timing?!');
  });
});
