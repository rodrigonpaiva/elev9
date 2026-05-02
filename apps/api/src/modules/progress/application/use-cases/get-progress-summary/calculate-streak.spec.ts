import { WorkoutLog } from "../../../domain/entities/workout-log.entity";
import { calculateStreak } from "./calculate-streak";

describe("calculateStreak", () => {
  it("returns the continuous streak for consecutive workout days", () => {
    const workoutLogs = [
      createWorkoutLog("2026-05-01"),
      createWorkoutLog("2026-04-30"),
      createWorkoutLog("2026-04-29"),
    ];

    expect(calculateStreak(workoutLogs)).toBe(3);
  });

  it("stops the streak when there is a missing day", () => {
    const workoutLogs = [
      createWorkoutLog("2026-05-01"),
      createWorkoutLog("2026-04-29"),
      createWorkoutLog("2026-04-28"),
    ];

    expect(calculateStreak(workoutLogs)).toBe(1);
  });

  it("returns zero when there are no workout logs", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("counts same-day logs only once", () => {
    const workoutLogs = [
      createWorkoutLog("2026-05-01", "log_1"),
      createWorkoutLog("2026-05-01", "log_2"),
      createWorkoutLog("2026-04-30", "log_3"),
    ];

    expect(calculateStreak(workoutLogs)).toBe(2);
  });
});

function createWorkoutLog(date: string, id = `log_${date}`) {
  return new WorkoutLog({
    id,
    trainingPlanId: "training_123",
    workoutDayIndex: 1,
    durationMinutes: 45,
    completedExercises: [],
    date,
    createdAt: new Date(`${date}T10:00:00.000Z`),
    updatedAt: new Date(`${date}T10:00:00.000Z`),
  });
}
