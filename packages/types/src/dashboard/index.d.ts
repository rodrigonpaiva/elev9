import { FitnessProfileActivityLevel, FitnessProfileGoal } from "../fitness";
import { TrainingPlanIntensity } from "../training";
export type DashboardHomeResponse = {
    dashboard: {
        user: {
            name: string;
        };
        fitnessProfile: {
            id: string;
            goal: FitnessProfileGoal;
            activityLevel: FitnessProfileActivityLevel;
        } | null;
        trainingPlan: {
            id: string;
            todayWorkout: {
                dayIndex: number;
                title: string;
                focus: string;
                format: string;
                intensity: TrainingPlanIntensity;
                exercises: Array<{
                    name: string;
                    sets: number;
                    reps: string;
                    restSeconds: number;
                }>;
            } | null;
        } | null;
        progressSummary: {
            period: "week";
            workoutsCompleted: number;
            totalDurationMinutes: number;
            averageDurationMinutes: number;
            lastWorkoutDate: string | null;
        };
    };
};
