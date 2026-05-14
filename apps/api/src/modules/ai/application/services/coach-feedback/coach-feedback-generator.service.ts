import { Injectable } from "@nestjs/common";

import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import { FatigueLevel } from "../context-builder/build-user-health-context.service";

export type CoachFeedbackGeneratorInput = {
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  expectedWorkouts: number;
  currentStreak: number;
  averageDurationMinutes: number;
  workoutLogs: WorkoutLog[];
  hasTrainingPlan: boolean;
  fatigueLevel?: FatigueLevel;
};

export type CoachFeedbackGeneratorOutput = {
  message: string;
  insights: string[];
  recommendations: string[];
};

@Injectable()
export class CoachFeedbackGenerator {
  generate(
    input: CoachFeedbackGeneratorInput,
  ): CoachFeedbackGeneratorOutput {
    const logsCount = input.workoutLogs.length;
    const hasHighStreak = input.currentStreak >= 3;
    const isNoLogs = logsCount === 0;
    const isBeginner = logsCount === 1 || logsCount === 2;
    const isConsistent = logsCount >= input.expectedWorkouts;
    const isInconsistent = logsCount < input.expectedWorkouts;
    const hasDurationTrendIncrease =
      this.hasIncreasingDurationTrend(input.workoutLogs);

    const message = this.limitMessage(
      this.buildMessage({
        logsCount,
        currentStreak: input.currentStreak,
        expectedWorkouts: input.expectedWorkouts,
        isNoLogs,
        hasHighStreak,
        isConsistent,
        isBeginner,
        isInconsistent,
      }),
    );

    const insights: string[] = [];
    const recommendations: string[] = [];
    const fatigueLevel = input.fatigueLevel ?? "MODERATE";
    const hasExplicitFatigueLevel = input.fatigueLevel !== undefined;

    if (isNoLogs) {
      insights.push("No completed workouts were found in the last 7 days");
      recommendations.push("Complete your first workout today");
      recommendations.push(
        input.hasTrainingPlan
          ? "Start with your active plan to build momentum"
          : "Start with one manageable session to build momentum",
      );
    } else {
      insights.push(
        `You completed ${logsCount} workout${logsCount === 1 ? "" : "s"} in the last 7 days`,
      );

      if (hasHighStreak) {
        insights.push(`Your current streak is ${input.currentStreak} days`);
      } else if (isConsistent) {
        insights.push("Your weekly frequency is aligned with your expected target");
      } else if (isBeginner) {
        insights.push("You already started building a weekly training rhythm");
      } else if (isInconsistent) {
        insights.push(
          "Your current pace is below your expected weekly availability",
        );
      }

      if (hasDurationTrendIncrease) {
        insights.push("Your average duration improved across the week");
      } else if (input.averageDurationMinutes > 0 && insights.length < 3) {
        insights.push(
          `Your average workout duration is ${this.formatDuration(input.averageDurationMinutes)}`,
        );
      }

      if (hasHighStreak) {
        recommendations.push("Keep your current rhythm");
        recommendations.push("Increase intensity only if your recovery feels good");
      } else if (isConsistent) {
        recommendations.push("Keep the same training cadence next week");
        recommendations.push("Maintain your current session quality and recovery");
      } else if (isBeginner) {
        recommendations.push("Repeat this rhythm for one more session this week");
        recommendations.push("Focus on finishing your planned workout window");
      } else if (isInconsistent) {
        recommendations.push("Schedule your next session within the next 24 hours");
        recommendations.push(
          `Aim to match your weekly target of ${input.expectedWorkouts} workouts`,
        );
      } else {
        recommendations.push("Keep showing up for your next planned session");
      }
    }

    this.applyFatigueSignals({
      fatigueLevel,
      hasExplicitFatigueLevel,
      insights,
      recommendations,
      hasTrainingPlan: input.hasTrainingPlan,
      isNoLogs,
    });

    recommendations.push(this.buildGoalAwareRecommendation(input.goal));

    if (!input.hasTrainingPlan && recommendations.length < 3) {
      recommendations.push("Keep your next session simple and easy to repeat");
    }

    return {
      message,
      insights: this.limitItems(insights),
      recommendations: this.limitItems(recommendations),
    };
  }

  private buildMessage(input: {
    logsCount: number;
    currentStreak: number;
    expectedWorkouts: number;
    isNoLogs: boolean;
    hasHighStreak: boolean;
    isConsistent: boolean;
    isBeginner: boolean;
    isInconsistent: boolean;
  }): string {
    if (input.isNoLogs) {
      return "You are ready to start your first training streak today.";
    }

    if (input.hasHighStreak) {
      return `Great consistency this week. You're on a ${input.currentStreak}-day streak.`;
    }

    if (input.isConsistent) {
      return "You matched your expected training rhythm this week.";
    }

    if (input.isBeginner) {
      return "Good start this week. You already logged your first workouts and can build consistency from here.";
    }

    if (input.isInconsistent) {
      return "You have room to rebuild your rhythm this week.";
    }

    return `You're making progress. Aim for ${input.expectedWorkouts} workouts this week to keep momentum.`;
  }

  private buildGoalAwareRecommendation(goal: FitnessGoal): string {
    switch (goal) {
      case "gain_muscle":
        return "Prioritize full, high-quality sessions to support muscle gain";
      case "lose_weight":
        return "Keep your sessions regular to support your fat-loss goal";
      case "maintain":
      default:
        return "Keep your routine steady to maintain your current fitness";
    }
  }

  private applyFatigueSignals(input: {
    fatigueLevel: FatigueLevel;
    hasExplicitFatigueLevel: boolean;
    insights: string[];
    recommendations: string[];
    hasTrainingPlan: boolean;
    isNoLogs: boolean;
  }): void {
    if (input.isNoLogs) {
      return;
    }

    switch (input.fatigueLevel) {
      case "HIGH":
        this.upsertInsight(
          input.insights,
          "Your recent training load suggests elevated fatigue",
        );
        input.recommendations.unshift(
          "Prioritize recovery and consider a lighter session if needed",
        );
        input.recommendations.push(
          "Avoid increasing intensity until your recovery feels more stable",
        );
        return;
      case "LOW":
        this.upsertInsight(
          input.insights,
          "Your recent workload looks manageable",
        );
        input.recommendations.push(
          input.hasTrainingPlan
            ? "You can consider a small progression if your form stays solid"
            : "Build consistency first, then progress intensity gradually",
        );
        return;
      case "MODERATE":
      default:
        if (input.insights.length < 3) {
          input.insights.push("Your current workload looks balanced overall");
        } else if (input.hasExplicitFatigueLevel) {
          input.insights[input.insights.length - 1] =
            "Your current workload looks balanced overall";
        }
        input.recommendations.push(
          "Keep your current plan and monitor recovery between sessions",
        );
    }
  }

  private upsertInsight(insights: string[], message: string): void {
    if (insights.includes(message)) {
      return;
    }

    if (insights.length < 3) {
      insights.push(message);
      return;
    }

    insights[insights.length - 1] = message;
  }

  private hasIncreasingDurationTrend(workoutLogs: WorkoutLog[]): boolean {
    if (workoutLogs.length < 4) {
      return false;
    }

    const orderedLogs = [...workoutLogs].sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    const midpoint = Math.floor(orderedLogs.length / 2);
    const firstHalf = orderedLogs.slice(0, midpoint);
    const secondHalf = orderedLogs.slice(midpoint);

    if (firstHalf.length === 0 || secondHalf.length === 0) {
      return false;
    }

    const firstHalfAverage = this.calculateAverageDuration(firstHalf);
    const secondHalfAverage = this.calculateAverageDuration(secondHalf);

    return secondHalfAverage > firstHalfAverage;
  }

  private calculateAverageDuration(workoutLogs: WorkoutLog[]): number {
    const totalDuration = workoutLogs.reduce(
      (total, workoutLog) => total + workoutLog.durationMinutes,
      0,
    );

    return totalDuration / workoutLogs.length;
  }

  private formatDuration(durationMinutes: number): string {
    const rounded = Math.round(durationMinutes * 100) / 100;

    if (Number.isInteger(rounded)) {
      return `${rounded} minutes`;
    }

    return `${rounded.toFixed(2)} minutes`;
  }

  private limitMessage(message: string): string {
    return message.slice(0, 240);
  }

  private limitItems(items: string[]): string[] {
    return items
      .map((item) => item.slice(0, 160))
      .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
      .slice(0, 3);
  }
}
