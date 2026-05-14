import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import { CoachFeedbackGenerator } from "./coach-feedback-generator.service";

describe("CoachFeedbackGenerator", () => {
  let generator: CoachFeedbackGenerator;

  beforeEach(() => {
    generator = new CoachFeedbackGenerator();
  });

  it("returns motivational feedback when there are no logs", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 0,
      averageDurationMinutes: 0,
      workoutLogs: [],
      hasTrainingPlan: true,
    });

    expect(result.message).toBe(
      "You are ready to start your first training streak today.",
    );
    expect(result.insights).toEqual([
      "No completed workouts were found in the last 7 days",
    ]);
    expect(result.recommendations).toContain(
      "Complete your first workout today",
    );
  });

  it("prioritizes recovery guidance when fatigueLevel is HIGH", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 6,
      averageDurationMinutes: 78,
      workoutLogs: [
        buildWorkoutLog("2026-04-29", 70),
        buildWorkoutLog("2026-04-30", 75),
        buildWorkoutLog("2026-05-01", 80),
        buildWorkoutLog("2026-05-02", 82),
        buildWorkoutLog("2026-05-03", 78),
        buildWorkoutLog("2026-05-04", 83),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "HIGH",
    });

    expect(result.insights).toContain(
      "Your recent training load suggests elevated fatigue",
    );
    expect(result.recommendations).toContain(
      "Prioritize recovery and consider a lighter session if needed",
    );
  });

  it("supports controlled progression guidance when fatigueLevel is LOW", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 40,
      workoutLogs: [
        buildWorkoutLog("2026-05-03", 38),
        buildWorkoutLog("2026-05-04", 42),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "LOW",
    });

    expect(result.insights).toContain(
      "Your recent workload looks manageable",
    );
    expect(result.recommendations).toContain(
      "You can consider a small progression if your form stays solid",
    );
  });

  it("keeps balanced recovery messaging when fatigueLevel is MODERATE", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 1,
      averageDurationMinutes: 46,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 45),
        buildWorkoutLog("2026-05-04", 47),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "MODERATE",
    });

    expect(result.recommendations).toContain(
      "Keep your current plan and monitor recovery between sessions",
    );
  });

  it("falls back to MODERATE messaging when fatigueLevel is not provided", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 1,
      averageDurationMinutes: 46,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 45),
        buildWorkoutLog("2026-05-04", 47),
      ],
      hasTrainingPlan: true,
    });

    expect(result.recommendations).toContain(
      "Keep your current plan and monitor recovery between sessions",
    );
  });

  it("considers low energy from the latest check-in", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 42,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 40),
        buildWorkoutLog("2026-05-04", 44),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "HIGH",
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
      },
    });

    expect(result.recommendations).toContain(
      "Keep today's session lighter if your energy still feels low",
    );
  });

  it("considers poor sleep from the latest check-in", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 42,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 40),
        buildWorkoutLog("2026-05-04", 44),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "HIGH",
      latestCheckIn: {
        energyLevel: 3,
        sleepQuality: 2,
        muscleSoreness: 3,
        motivationLevel: 3,
      },
    });

    expect(result.insights).toContain(
      "Your latest check-in suggests sleep may be limiting recovery",
    );
  });

  it("considers high muscle soreness from the latest check-in", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 42,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 40),
        buildWorkoutLog("2026-05-04", 44),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "HIGH",
      latestCheckIn: {
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 4,
        motivationLevel: 3,
      },
    });

    expect(result.recommendations).toContain(
      "Consider mobility work, a lighter session, or extra recovery today",
    );
  });

  it("considers high motivation with low fatigue", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 3,
      averageDurationMinutes: 40,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 38),
        buildWorkoutLog("2026-05-03", 40),
        buildWorkoutLog("2026-05-04", 42),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "LOW",
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 5,
      },
    });

    expect(result.recommendations).toContain(
      "Your motivation looks strong, so a small progression can make sense if recovery stays solid",
    );
  });

  it("considers low motivation from the latest check-in", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 1,
      averageDurationMinutes: 35,
      workoutLogs: [
        buildWorkoutLog("2026-05-04", 35),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "MODERATE",
      latestCheckIn: {
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 2,
      },
    });

    expect(result.insights).toContain(
      "Your latest check-in shows motivation is lower right now",
    );
    expect(result.recommendations).toContain(
      "Focus on consistency with a lighter, easier-to-start session today",
    );
  });

  it("keeps fallback behavior when latestCheckIn is not provided", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 42,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 40),
        buildWorkoutLog("2026-05-04", 44),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "MODERATE",
    });

    expect(result.insights).not.toContain(
      "Your latest check-in suggests sleep may be limiting recovery",
    );
    expect(result.recommendations).not.toContain(
      "Keep today's session lighter if your energy still feels low",
    );
  });

  it("prioritizes high streak messaging over other classifications", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 4,
      averageDurationMinutes: 42,
      workoutLogs: [
        buildWorkoutLog("2026-05-01", 30, "2026-05-01T08:00:00.000Z"),
        buildWorkoutLog("2026-05-02", 35, "2026-05-02T08:00:00.000Z"),
        buildWorkoutLog("2026-05-03", 45, "2026-05-03T08:00:00.000Z"),
        buildWorkoutLog("2026-05-04", 50, "2026-05-04T08:00:00.000Z"),
      ],
      hasTrainingPlan: true,
    });

    expect(result.message).toBe(
      "Great consistency this week. You're on a 4-day streak.",
    );
    expect(result.insights).toContain("Your current streak is 4 days");
    expect(result.insights).toContain(
      "Your average duration improved across the week",
    );
  });

  it("returns a consistent message without high streak when expected frequency is met", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "high",
      expectedWorkouts: 3,
      currentStreak: 1,
      averageDurationMinutes: 47.5,
      workoutLogs: [
        buildWorkoutLog("2026-04-28", 45),
        buildWorkoutLog("2026-04-30", 50),
        buildWorkoutLog("2026-05-02", 48),
      ],
      hasTrainingPlan: true,
    });

    expect(result.message).toBe(
      "You matched your expected training rhythm this week.",
    );
    expect(result.insights).toContain(
      "Your weekly frequency is aligned with your expected target",
    );
  });

  it("returns beginner feedback for one or two logs", () => {
    const result = generator.generate({
      goal: "lose_weight",
      activityLevel: "low",
      expectedWorkouts: 4,
      currentStreak: 1,
      averageDurationMinutes: 35,
      workoutLogs: [
        buildWorkoutLog("2026-05-03", 35),
        buildWorkoutLog("2026-05-04", 35),
      ],
      hasTrainingPlan: true,
    });

    expect(result.message).toContain("Good start this week");
    expect(result.recommendations).toContain(
      "Repeat this rhythm for one more session this week",
    );
  });

  it("returns inconsistency feedback when frequency is below expected", () => {
    const result = generator.generate({
      goal: "maintain",
      activityLevel: "high",
      expectedWorkouts: 4,
      currentStreak: 1,
      averageDurationMinutes: 32,
      workoutLogs: [
        buildWorkoutLog("2026-04-28", 30),
        buildWorkoutLog("2026-05-01", 35),
        buildWorkoutLog("2026-05-04", 31),
      ],
      hasTrainingPlan: false,
    });

    expect(result.message).toBe(
      "You have room to rebuild your rhythm this week.",
    );
    expect(result.recommendations).toContain(
      "Schedule your next session within the next 24 hours",
    );
  });

  it("does not generate a duration trend insight with fewer than four logs", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 2,
      averageDurationMinutes: 40,
      workoutLogs: [
        buildWorkoutLog("2026-05-02", 30),
        buildWorkoutLog("2026-05-03", 40),
        buildWorkoutLog("2026-05-04", 50),
      ],
      hasTrainingPlan: true,
    });

    expect(result.insights).not.toContain(
      "Your average duration improved across the week",
    );
  });

  it("enforces output limits", () => {
    const result = generator.generate({
      goal: "gain_muscle",
      activityLevel: "medium",
      expectedWorkouts: 3,
      currentStreak: 10,
      averageDurationMinutes: 55,
      workoutLogs: [
        buildWorkoutLog("2026-04-28", 20, "2026-04-28T08:00:00.000Z"),
        buildWorkoutLog("2026-04-29", 30, "2026-04-29T08:00:00.000Z"),
        buildWorkoutLog("2026-04-30", 60, "2026-04-30T08:00:00.000Z"),
        buildWorkoutLog("2026-05-01", 80, "2026-05-01T08:00:00.000Z"),
      ],
      hasTrainingPlan: true,
      fatigueLevel: "HIGH",
    });

    expect(result.message.length).toBeLessThanOrEqual(240);
    expect(result.insights.length).toBeLessThanOrEqual(3);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    expect(
      [...result.insights, ...result.recommendations].every(
        (item) => item.length <= 160,
      ),
    ).toBe(true);
  });
});

function buildWorkoutLog(
  date: string,
  durationMinutes: number,
  createdAt = `${date}T10:00:00.000Z`,
): WorkoutLog {
  return new WorkoutLog({
    id: `${date}-${durationMinutes}`,
    trainingPlanId: "training_123",
    workoutDayIndex: 1,
    durationMinutes,
    completedExercises: [],
    date,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}
