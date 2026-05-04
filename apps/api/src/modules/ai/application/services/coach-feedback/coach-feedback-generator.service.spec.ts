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
