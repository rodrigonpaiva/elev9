import { Injectable } from "@nestjs/common";

import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import {
  FatigueLevel,
  UserHealthContextNutritionProfile,
} from "../context-builder/build-user-health-context.service";

export type CoachFeedbackGeneratorInput = {
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  expectedWorkouts: number;
  currentStreak: number;
  averageDurationMinutes: number;
  workoutLogs: WorkoutLog[];
  hasTrainingPlan: boolean;
  fatigueLevel?: FatigueLevel;
  latestCheckIn?: {
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
  };
  nutritionProfile?: UserHealthContextNutritionProfile;
};

export type CoachFeedbackGeneratorOutput = {
  message: string;
  insights: string[];
  recommendations: string[];
  influences: string[];
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
    const influences = new Set<string>();
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
      influences,
      hasTrainingPlan: input.hasTrainingPlan,
      isNoLogs,
    });
    this.applyDailyCheckInSignals({
      latestCheckIn: input.latestCheckIn,
      fatigueLevel,
      insights,
      recommendations,
      influences,
      isNoLogs,
      hasTrainingPlan: input.hasTrainingPlan,
    });
    this.applyNutritionSignals({
      nutritionProfile: input.nutritionProfile,
      insights,
      recommendations,
      influences,
      isNoLogs,
    });
    this.applyTrainingSignals({
      logsCount,
      expectedWorkouts: input.expectedWorkouts,
      currentStreak: input.currentStreak,
      influences,
    });

    recommendations.push(this.buildGoalAwareRecommendation(input.goal));

    if (!input.hasTrainingPlan && recommendations.length < 3) {
      recommendations.push("Keep your next session simple and easy to repeat");
    }

    return {
      message,
      insights: this.limitItems(insights),
      recommendations: this.limitItems(recommendations),
      influences: [...influences],
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
    influences: Set<string>;
    hasTrainingPlan: boolean;
    isNoLogs: boolean;
  }): void {
    if (input.isNoLogs) {
      return;
    }

    switch (input.fatigueLevel) {
      case "HIGH":
        input.influences.add("fatigue:high");
        input.influences.add("recovery:needs_recovery");
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
        input.influences.add("fatigue:low");
        input.influences.add("recovery:improving");
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

  private applyDailyCheckInSignals(input: {
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
    fatigueLevel: FatigueLevel;
    insights: string[];
    recommendations: string[];
    influences: Set<string>;
    isNoLogs: boolean;
    hasTrainingPlan: boolean;
  }): void {
    if (input.isNoLogs || !input.latestCheckIn) {
      return;
    }

    if (input.latestCheckIn.sleepQuality <= 2) {
      input.influences.add("checkin:poor_sleep");
      this.upsertInsight(
        input.insights,
        "Your latest check-in suggests sleep may be limiting recovery",
      );
    }

    if (input.latestCheckIn.energyLevel <= 2) {
      input.influences.add("checkin:low_energy");
      this.prependRecommendation(
        input.recommendations,
        "Keep today's session lighter if your energy still feels low",
      );
    }

    if (input.latestCheckIn.muscleSoreness >= 4) {
      input.influences.add("checkin:high_soreness");
      this.prependRecommendation(
        input.recommendations,
        "Consider mobility work, a lighter session, or extra recovery today",
      );
    }

    if (
      input.latestCheckIn.motivationLevel >= 4 &&
      input.fatigueLevel === "LOW"
    ) {
      input.influences.add("checkin:high_motivation");
      this.prependRecommendation(
        input.recommendations,
        input.hasTrainingPlan
          ? "Your motivation looks strong, so a small progression can make sense if recovery stays solid"
          : "Use this motivation to stay consistent before adding more intensity",
      );
    }

    if (input.latestCheckIn.motivationLevel <= 2) {
      this.upsertInsight(
        input.insights,
        "Your latest check-in shows motivation is lower right now",
      );
      this.prependRecommendation(
        input.recommendations,
        "Focus on consistency with a lighter, easier-to-start session today",
      );
    }
  }

  private applyNutritionSignals(input: {
    nutritionProfile?: UserHealthContextNutritionProfile;
    insights: string[];
    recommendations: string[];
    influences: Set<string>;
    isNoLogs: boolean;
  }): void {
    if (!input.nutritionProfile) {
      return;
    }

    if (input.nutritionProfile.mealsPerDay <= 2) {
      input.influences.add("nutrition:low_meal_frequency");
      this.upsertInsight(
        input.insights,
        "Your meal distribution may be too sparse to consistently support training and recovery",
      );
      this.prependRecommendation(
        input.recommendations,
        "Try to spread your meals more evenly across the day to support recovery",
      );
    }

    if (input.nutritionProfile.dietaryRestrictions.length > 0) {
      input.influences.add("nutrition:dietary_restrictions");
      this.upsertInsight(
        input.insights,
        "Your nutrition approach should stay consistent within your dietary restrictions",
      );
      this.prependRecommendation(
        input.recommendations,
        "Keep your food choices consistent within your dietary restrictions to support recovery",
      );
    }

    switch (input.nutritionProfile.goal) {
      case "muscle_gain":
        input.influences.add("nutrition:muscle_gain");
        this.prependRecommendation(
          input.recommendations,
          input.isNoLogs
            ? "Build meal consistency so your training sessions are supported when you resume"
            : "Support muscle gain with consistent meals around training and recovery",
        );
        return;
      case "fat_loss":
        input.influences.add("nutrition:fat_loss");
        this.prependRecommendation(
          input.recommendations,
          "Keep meal timing consistent so your fat-loss routine stays easier to maintain",
        );
        if (!input.isNoLogs) {
          this.prependRecommendation(
            input.recommendations,
            "Avoid skipping recovery meals after training even while pushing fat loss",
          );
        }
        return;
      case "maintenance":
      default:
        this.prependRecommendation(
          input.recommendations,
          "Keep your meal routine steady so training and recovery stay predictable",
        );
    }
  }

  private applyTrainingSignals(input: {
    logsCount: number;
    expectedWorkouts: number;
    currentStreak: number;
    influences: Set<string>;
  }): void {
    if (input.logsCount >= input.expectedWorkouts || input.currentStreak >= 3) {
      input.influences.add("training:high_consistency");
      return;
    }

    if (input.logsCount > 0 && input.logsCount < input.expectedWorkouts) {
      input.influences.add("training:low_consistency");
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

  private prependRecommendation(
    recommendations: string[],
    message: string,
  ): void {
    if (recommendations.includes(message)) {
      return;
    }

    recommendations.unshift(message);
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
