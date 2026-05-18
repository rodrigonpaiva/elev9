import { CoachConversationMemorySummarizer } from './coach-conversation-memory-summarizer.service';

describe('CoachConversationMemorySummarizer', () => {
  it('builds a deterministic, sanitized memory summary', () => {
    const summarizer = new CoachConversationMemorySummarizer();

    const result = summarizer.summarize({
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 6,
        averageWorkoutDuration: 50,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [
          {
            id: 'workout_1',
            trainingPlanId: 'training_123',
            workoutDayIndex: 1,
            durationMinutes: 45,
            completedExercises: [],
            date: '2026-05-18',
            createdAt: new Date('2026-05-18T08:00:00.000Z'),
            updatedAt: new Date('2026-05-18T08:00:00.000Z'),
          },
        ],
        generatedAt: new Date('2026-05-18T10:00:00.000Z'),
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 3,
          createdAt: new Date('2026-05-18T09:00:00.000Z'),
        },
        nutritionProfile: {
          goal: 'muscle_gain',
          mealsPerDay: 4,
          dietaryRestrictions: ['gluten_free'],
          allergies: ['peanuts'],
          dislikedFoods: ['broccoli'],
          preferredFoods: ['rice', 'eggs'],
        },
      } as never,
      conversationMessages: [
        {
          role: 'user',
          content: 'I feel exhausted after my last workout',
          createdAt: '2026-05-18T09:30:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Keep the session lighter today.',
          createdAt: '2026-05-18T09:30:01.000Z',
        },
      ],
    });

    expect(result).toEqual({
      summary:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:6, recent_workouts:1; user_concern=recovery',
      metadata: {
        generatedFromMessageCount: 2,
        version: 'memory-v1',
      },
    });
    expect(JSON.stringify(result)).not.toContain('auth_user_123');
    expect(JSON.stringify(result)).not.toContain('profile_123');
    expect(JSON.stringify(result)).not.toContain('Rodrigo Paiva');
    expect(JSON.stringify(result)).not.toContain(
      'I feel exhausted after my last workout',
    );
  });
});
