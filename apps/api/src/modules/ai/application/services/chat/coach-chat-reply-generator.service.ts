import { Injectable } from "@nestjs/common";

import { BuildUserHealthContextService } from "../context-builder/build-user-health-context.service";

type UserHealthContext = Awaited<
  ReturnType<BuildUserHealthContextService["build"]>
>;

@Injectable()
export class CoachChatReplyGenerator {
  generate(input: {
    message: string;
    healthContext: UserHealthContext;
  }): string {
    const normalizedMessage = input.message.trim().toLowerCase();
    const asksAboutTraining =
      normalizedMessage.includes("train") ||
      normalizedMessage.includes("workout") ||
      normalizedMessage.includes("session");
    const latestCheckIn = input.healthContext.latestCheckIn;
    const recoveryTrend = this.resolveRecoveryTrend(
      input.healthContext.fatigueLevel,
    );
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;
    const hasLowMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel <= 2
      : false;
    const nutritionProfile = input.healthContext.nutritionProfile;

    if (
      input.healthContext.fatigueLevel === "HIGH" ||
      recoveryTrend === "needs_recovery" ||
      hasLowSleep ||
      hasHighSoreness
    ) {
      return asksAboutTraining
        ? "Your recovery signals suggest keeping today's session lighter."
        : "Your recovery signals suggest keeping today's session lighter.";
    }

    if (
      nutritionProfile?.goal === "muscle_gain" &&
      input.healthContext.fatigueLevel === "LOW" &&
      latestCheckIn &&
      latestCheckIn.motivationLevel >= 4
    ) {
      return "Your recent consistency looks strong. This may be a good moment for controlled progression.";
    }

    if (nutritionProfile?.mealsPerDay !== undefined && nutritionProfile.mealsPerDay <= 2) {
      return "Keeping your meals consistent today will support recovery and training.";
    }

    if (hasLowMotivation || input.healthContext.currentStreak >= 3) {
      return "Your recent consistency looks steady. Keep the routine simple and repeatable today.";
    }

    return "Your context looks steady. Keep the routine consistent and check in after your session.";
  }

  private resolveRecoveryTrend(
    fatigueLevel: UserHealthContext["fatigueLevel"],
  ): "improving" | "stable" | "needs_recovery" {
    switch (fatigueLevel) {
      case "LOW":
        return "improving";
      case "HIGH":
        return "needs_recovery";
      case "MODERATE":
      default:
        return "stable";
    }
  }
}
