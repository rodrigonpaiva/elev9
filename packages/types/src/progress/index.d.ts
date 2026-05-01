export type ProgressSummaryResponse = {
    summary: {
        period: "week" | "month";
        workoutsCompleted: number;
        totalDurationMinutes: number;
        averageDurationMinutes: number;
        lastWorkoutDate: string | null;
    };
};
