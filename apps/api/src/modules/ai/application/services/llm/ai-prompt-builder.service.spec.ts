import { AiPromptBuilder } from './ai-prompt-builder.service';

describe('AiPromptBuilder', () => {
  it('sanitizes sensitive fields and builds a structured conversational prompt', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
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
            durationMinutes: 50,
            completedExercises: [
              { name: 'Bench Press', setsDone: 3, repsDone: 8 },
            ],
            feedback: {
              difficulty: 'hard',
            },
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
      },
      conversationHistory: [
        {
          role: 'user',
          content: 'What should I train?',
          createdAt: '2026-05-18T09:30:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Keep today lighter.',
          createdAt: '2026-05-18T09:30:01.000Z',
        },
      ],
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(prompt.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(prompt.promptVersion).toBe('coach-chat-prompt-v1');
    expect(joined).toContain('Do not make medical claims');
    expect(joined).toContain('fatigue level: HIGH');
    expect(joined).toContain('nutrition goal: muscle_gain');
    expect(joined).toContain('recent workout logs');
    expect(joined).toContain('What should I train?');
    expect(joined).not.toContain('auth_user_123');
    expect(joined).not.toContain('profile_123');
    expect(joined).not.toContain('Rodrigo Paiva');
    expect(prompt.messages.at(-1)).toEqual({
      role: 'user',
      content: 'Should I train today?',
    });
  });

  it('includes canonical notification context without sourceContext leakage', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
      conversationHistory: [],
      notification: {
        current: {
          type: 'coach_nudge',
          priority: 'low',
          status: 'planned',
          suppressed: true,
          fatigueLevel: 'high',
        },
        engagementSummary: {
          engagementScore: 84,
          fatigueLevel: 'high',
          openedCount: 2,
          clickedCount: 1,
          dismissedCount: 2,
          completedCount: 1,
          recentEventsCount: 6,
        },
      },
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(joined).toContain('Notifications (canonical):');
    expect(joined).toContain('- type: coach_nudge');
    expect(joined).toContain('- suppressed: true');
    expect(joined).toContain('- engagement score: 84');
    expect(joined).toContain(
      'do not recalculate notifications; treat the notification decision as canonical.',
    );
    expect(joined).not.toContain('sourceContext');
  });

  it('includes canonical habit context without sourceContext leakage', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
      conversationHistory: [],
      habit: {
        current: {
          userProfileId: 'profile_123',
          date: '2026-05-18',
          consistencyScore: 78,
          streakDays: 5,
          adherenceScore: 82,
          trend: 'improving',
          sourceContext: {
            formulaVersion: 'habit-engine-v1',
            generatedAt: '2026-05-18T10:00:00.000Z',
          },
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-05-18T10:00:00.000Z',
        } as never,
        summary: {
          userProfileId: 'profile_123',
          score: 78,
          trend: 'improving',
          currentStreak: 5,
          longestStreak: 7,
          adherenceRate: 82,
          riskLevel: 'low',
          updatedAt: '2026-05-18T10:00:00.000Z',
          formulaVersion: 'habit-engine-v1',
        } as never,
        riskSignals: [
          {
            userProfileId: 'profile_123',
            type: 'streak_at_risk',
            level: 'medium',
            title: 'Streak at risk',
            description: 'Consistency is still healthy, but watch the rhythm.',
            generatedAt: '2026-05-18T10:00:00.000Z',
            formulaVersion: 'habit-engine-v1',
          } as never,
        ],
      },
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(joined).toContain('Habits & Consistency (canonical):');
    expect(joined).toContain('- consistency score: 78');
    expect(joined).toContain(
      '- instruction: do not recalculate consistency; treat Habit Engine outputs as canonical.',
    );
    expect(prompt.messages).toHaveLength(4);
    expect(JSON.stringify(prompt)).not.toContain('sourceContext');
  });

  it('includes canonical personalization context without recalculation instructions omitted', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
      conversationHistory: [],
      personalization: {
        preferredCoachingStyle: 'direct',
        engagementProfile: 'high',
        notificationResponsiveness: 'low',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'high',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'high',
        topBehavioralPatterns: ['responds_to_streaks', 'responds_to_goals'],
        trend: 'declining',
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-05-18T10:00:00.000Z',
      },
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(joined).toContain('Personalization (canonical):');
    expect(joined).toContain('- preferred coaching style: direct');
    expect(joined).toContain('- notification responsiveness: low');
    expect(joined).toContain(
      'do not recalculate personalization. Treat Personalization Engine outputs as canonical.',
    );
    expect(JSON.stringify(prompt)).not.toContain('sourceContext');
  });

  it('builds a sanitized debug snapshot without raw prompt leakage', () => {
    const builder = new AiPromptBuilder();
    const snapshot = builder.buildDebugSnapshot({
      message: 'I feel tired today after my workout',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
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
            durationMinutes: 50,
            completedExercises: [
              { name: 'Bench Press', setsDone: 3, repsDone: 8 },
            ],
            feedback: {
              difficulty: 'hard',
            },
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
      },
      conversationHistory: [
        {
          role: 'user',
          content: 'What should I train?',
          createdAt: '2026-05-18T09:30:00.000Z',
        },
      ],
    });

    expect(snapshot.promptVersion).toBe('coach-chat-prompt-v1');
    expect(snapshot.promptPreview.systemSections).toEqual([
      'safety_rules',
      'adaptive_context',
      'conversation_context',
    ]);
    expect(snapshot.promptPreview.userMessagePreview).toBe(
      'I feel tired today after my workout',
    );
    expect(snapshot.context).toEqual({
      fatigueLevel: 'HIGH',
      recoveryTrend: 'needs_recovery',
      hasNutritionProfile: true,
      hasLatestCheckIn: true,
      recentWorkoutCount: 1,
      recentConversationMessages: 1,
    });
    expect(JSON.stringify(snapshot)).not.toContain('auth_user_123');
    expect(JSON.stringify(snapshot)).not.toContain('profile_123');
    expect(JSON.stringify(snapshot)).not.toContain('Rodrigo Paiva');
  });

  it('includes conversation memory in the prompt and debug snapshot when available', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
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
      },
      conversationHistory: [],
      conversationMemory: {
        summary:
          'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:3; user_concern=recovery',
        metadata: {
          generatedFromMessageCount: 4,
          version: 'memory-v1',
        },
      },
    });
    const snapshot = builder.buildDebugSnapshot({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
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
      },
      conversationHistory: [],
      conversationMemory: {
        summary:
          'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:3; user_concern=recovery',
        metadata: {
          generatedFromMessageCount: 4,
          version: 'memory-v1',
        },
      },
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(joined).toContain('Conversation memory summary:');
    expect(joined).toContain('version: memory-v1');
    expect(snapshot.promptPreview.systemSections).toContain(
      'conversation_memory',
    );
    expect(snapshot.conversationMemory).toEqual({
      version: 'memory-v1',
      generatedFromMessageCount: 4,
      summaryPreview:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:3; user_concern=recovery',
    });
  });

  it('includes coach decision context without exposing raw source context', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
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
      },
      conversationHistory: [],
      coachDecision: {
        priority: 'recovery',
        headline: 'Recovery should be your focus today',
        summary: 'The best next step is to reduce training stress.',
        actionItems: [
          'Reduce training intensity today',
          'Prioritize sleep tonight',
          'Improve hydration',
        ],
        influences: [
          {
            code: 'LOW_READINESS',
            label: 'Low readiness',
            impact: 'negative',
            source: 'recovery',
          },
        ],
      },
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(
      prompt.messages.some((message) =>
        message.content.includes('Coach decision (canonical):'),
      ),
    ).toBe(true);
    expect(joined).toContain('Treat any coach decision as canonical context');
    expect(joined).toContain('priority: recovery');
    expect(joined).toContain('headline: Recovery should be your focus today');
    expect(joined).toContain('action items:');
    expect(joined).toContain('LOW_READINESS: Low readiness');
    expect(joined).not.toContain('sourceContext');
    expect(joined).not.toContain('auth_user_123');
    expect(joined).not.toContain('profile_123');
  });

  it('includes unified coach intelligence and persona guidance blocks', () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: 'Should I train today?',
      healthContext: {
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: 'training_123',
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
      conversationHistory: [],
      unifiedCoachIntelligence: {
        primaryExpert: {
          id: 'WorkoutExpert',
          displayName: 'Workout Expert',
          version: '1.0.0',
          category: 'TRAINING',
          supportedIntents: ['TRAINING'],
          supportedDomains: ['training'],
          estimatedCost: 1,
          estimatedLatencyMs: 1,
          priority: 100,
          capabilities: ['TRAINING_SPECIALIST'],
          enabled: true,
        },
        participatingExperts: [
          {
            expertId: 'WorkoutExpert',
            expertName: 'Workout Expert',
            role: 'PRIMARY',
            sequence: 0,
            summary: 'Workout summary.',
            recommendationCodes: ['MAINTAIN_TODAY'],
            riskLevels: ['LOW'],
            confidence: 'HIGH',
            keyFindings: ['WORKOUT_CONSISTENCY'],
            metadata: {},
          },
        ],
        assessment: {
          summary: 'summary',
          keyFindings: ['WORKOUT_CONSISTENCY'],
          metadata: {},
        },
        summary: 'summary',
        keyFindings: ['WORKOUT_CONSISTENCY'],
        recommendations: [
          {
            code: 'MAINTAIN_TODAY',
            summary: 'Maintain today.',
            reason: 'Maintain today.',
            priority: 'LOW',
            category: 'PRIMARY',
            sourceExperts: ['WorkoutExpert'],
            metadata: {},
          },
        ],
        risks: [
          {
            level: 'LOW',
            summary: 'risk=LOW; sources=WorkoutExpert',
            factors: ['stable'],
            sources: ['WorkoutExpert'],
            metadata: {},
          },
        ],
        confidence: {
          level: 'HIGH',
          summary: 'confidence=HIGH; score=2.40',
          factors: ['PRIMARY_EXPERT_PRESENT'],
          metadata: {},
        },
        conflicts: [],
        supportingExperts: [],
        metadata: {
          requestId: 'request_123',
          intent: 'TRAINING',
          selectedDomains: ['training'],
          primaryExpertId: 'WorkoutExpert',
          participatingExpertIds: ['WorkoutExpert'],
          supportingExpertIds: [],
          blockedExpertIds: [],
          skippedExpertIds: [],
          routeValid: true,
          routeConfidence: 'HIGH',
          policyApproved: true,
          policyBlocked: false,
          policyFallbackRequired: false,
          candidateExpertCount: 1,
          participatingExpertCount: 1,
          recommendationCount: 1,
          riskCount: 1,
          conflictCount: 0,
          expertResultCount: 1,
          expertContributionCount: 1,
          compositionDurationMs: 1,
          planningDurationMs: 2,
          orchestrationDurationMs: 4,
          expertExecutionDurationMs: 5,
          executionDurationMs: 8,
          runtimeCompleteness: 'FULL',
        },
      },
      personaGuidance: {
        tone: 'SUPPORTIVE',
        verbosity: 'SHORT',
        focus: 'WORKOUT',
        directiveLevel: 'MEDIUM',
        empathyLevel: 'MEDIUM',
        encouragementLevel: 'MEDIUM',
        technicalDepth: 'INTERMEDIATE',
        urgency: 'LOW',
        celebrationLevel: 'LOW',
        safetyLevel: 'NORMAL',
        communicationStyle: {
          tone: 'SUPPORTIVE',
          verbosity: 'SHORT',
          focus: 'WORKOUT',
          directiveLevel: 'MEDIUM',
          empathyLevel: 'MEDIUM',
          encouragementLevel: 'MEDIUM',
          technicalDepth: 'INTERMEDIATE',
          urgency: 'LOW',
          celebrationLevel: 'LOW',
          safetyLevel: 'NORMAL',
        } as never,
        communicationRules: ['PRIORITIZE_WORKOUT', 'KEEP_SHORT'],
        metadata: {
          requestId: 'request_123',
          intent: 'TRAINING',
          selectedDomains: ['training'],
          primaryExpertId: 'WorkoutExpert',
          participatingExpertIds: ['WorkoutExpert'],
          supportingExpertIds: [],
          blockedExpertIds: [],
          routeConfidence: 'HIGH',
          policyApproved: true,
          policyBlocked: false,
          policyFallbackRequired: false,
          riskLevel: 'LOW',
          conflictCount: 0,
          recommendationCount: 1,
          communicationRuleCount: 2,
          runtimeCompleteness: 'FULL',
          userProfileId: 'profile_123',
          activityLevel: 'medium',
          technicalDepthSource: 'INTERMEDIATE',
          toneSource: 'SUPPORTIVE',
          safetySource: 'NORMAL',
          focusSource: 'WorkoutExpert',
        },
      } as never,
      explanation: {
        primaryExpertId: 'WorkoutExpert',
        participatingExperts: ['WorkoutExpert'],
        supportingExperts: ['RecoveryExpert'],
        evidence: [
          {
            type: 'WORKOUT_HISTORY',
            source: 'HEALTH_CONTEXT',
            expert: 'WorkoutExpert',
            importance: 'HIGH',
            confidence: 'HIGH',
            availability: 'AVAILABLE',
            metadata: {},
          },
        ],
        decisionReasons: [
          {
            code: 'FOCUS_WORKOUT',
            decisionType: 'FOCUS',
            supportingEvidence: [],
            supportingExperts: ['WorkoutExpert'],
            priority: 'MEDIUM',
            reasonCategory: 'WORKOUT',
            metadata: {},
          },
        ],
        recommendationReasons: [
          {
            recommendationCode: 'MAINTAIN_TODAY',
            supportingEvidence: [],
            supportingExperts: ['WorkoutExpert'],
            priority: 'LOW',
            reasonCategory: 'WORKOUT',
            metadata: {},
          },
        ],
        riskExplanations: [],
        confidenceExplanation: {
          confidence: 'HIGH',
          supportingEvidenceCount: 1,
          supportingExpertCount: 1,
          missingEvidenceCount: 0,
          policyRestrictions: [],
          metadata: {},
        },
        conflictExplanations: [],
        missingEvidence: [],
        metadata: {
          requestId: 'request_123',
          intent: 'TRAINING',
          selectedDomains: ['training'],
          primaryExpertId: 'WorkoutExpert',
          participatingExpertIds: ['WorkoutExpert'],
          supportingExpertIds: ['RecoveryExpert'],
          routeConfidence: 'HIGH',
          policyApproved: true,
          policyBlocked: false,
          policyFallbackRequired: false,
          runtimeCompleteness: 'FULL',
          evidenceCount: 1,
          explanationCount: 2,
          recommendationCount: 1,
          riskCount: 0,
          conflictCount: 0,
          missingEvidenceCount: 0,
          blockedExpertCount: 0,
          blockedRecommendationCount: 0,
          personaTone: 'SUPPORTIVE',
          personaFocus: 'WORKOUT',
          personaSafetyLevel: 'NORMAL',
          personaUrgency: 'LOW',
          explanationVersion: 'coach-explainability-v1',
        },
      } as never,
    });

    const joined = prompt.messages.map((message) => message.content).join('\n');

    expect(joined).toContain('Unified coach intelligence (canonical):');
    expect(joined).toContain('Coach persona guidance (canonical):');
    expect(joined).toContain('Coach explanation (canonical):');
    expect(joined).toContain('primary expert: WorkoutExpert');
    expect(joined).toContain('- tone: SUPPORTIVE');
    expect(joined).toContain('- communication rules:');
    expect(prompt.messages).toHaveLength(6);
  });
});
