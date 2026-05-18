import { AiPromptBuilder } from "./ai-prompt-builder.service";

describe("AiPromptBuilder", () => {
  it("sanitizes sensitive fields and builds a structured conversational prompt", () => {
    const builder = new AiPromptBuilder();
    const prompt = builder.build({
      message: "Should I train today?",
      healthContext: {
        authUserId: "auth_user_123",
        userProfileId: "profile_123",
        userName: "Rodrigo Paiva",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklyFrequency: 4,
        adherenceScore: 75,
        currentStreak: 5,
        averageWorkoutDuration: 48,
        fatigueLevel: "HIGH",
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        activeTrainingPlanId: "training_123",
        recentWorkoutLogs: [
          {
            id: "workout_1",
            trainingPlanId: "training_123",
            workoutDayIndex: 1,
            durationMinutes: 50,
            completedExercises: [{ name: "Bench Press", setsDone: 3, repsDone: 8 }],
            feedback: {
              difficulty: "hard",
            },
            date: "2026-05-18",
            createdAt: new Date("2026-05-18T08:00:00.000Z"),
            updatedAt: new Date("2026-05-18T08:00:00.000Z"),
          },
        ],
        generatedAt: new Date("2026-05-18T10:00:00.000Z"),
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 3,
          createdAt: new Date("2026-05-18T09:00:00.000Z"),
        },
        nutritionProfile: {
          goal: "muscle_gain",
          mealsPerDay: 4,
          dietaryRestrictions: ["gluten_free"],
          allergies: ["peanuts"],
          dislikedFoods: ["broccoli"],
          preferredFoods: ["rice", "eggs"],
        },
      },
      conversationHistory: [
        {
          role: "user",
          content: "What should I train?",
          createdAt: "2026-05-18T09:30:00.000Z",
        },
        {
          role: "assistant",
          content: "Keep today lighter.",
          createdAt: "2026-05-18T09:30:01.000Z",
        },
      ],
    });

    const joined = prompt.messages.map((message) => message.content).join("\n");

    expect(prompt.messages[0]).toMatchObject({
      role: "system",
    });
    expect(prompt.promptVersion).toBe("coach-chat-prompt-v1");
    expect(joined).toContain("Do not make medical claims");
    expect(joined).toContain("fatigue level: HIGH");
    expect(joined).toContain("nutrition goal: muscle_gain");
    expect(joined).toContain("recent workout logs");
    expect(joined).toContain("What should I train?");
    expect(joined).not.toContain("auth_user_123");
    expect(joined).not.toContain("profile_123");
    expect(joined).not.toContain("Rodrigo Paiva");
    expect(prompt.messages.at(-1)).toEqual({
      role: "user",
      content: "Should I train today?",
    });
  });
});
