import { Injectable } from "@nestjs/common";

import { CoachMessageRole } from "../../../domain/entities/coach-message.entity";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import {
  FatigueLevel,
  UserHealthContext,
} from "../context-builder/build-user-health-context.service";
import { AiLlmMessage, AiLlmPrompt } from "./ai-llm.types";

export const AI_CHAT_PROMPT_VERSION = "coach-chat-prompt-v1";

export type AiPromptBuilderConversationMessage = {
  role: CoachMessageRole;
  content: string;
  createdAt: string;
};

export type AiPromptBuilderInput = {
  message: string;
  healthContext: UserHealthContext;
  conversationHistory: AiPromptBuilderConversationMessage[];
};

@Injectable()
export class AiPromptBuilder {
  build(input: AiPromptBuilderInput): AiLlmPrompt {
    const messages: AiLlmMessage[] = [
      {
        role: "system",
        content: this.buildSystemInstructions(),
      },
      {
        role: "system",
        content: this.buildContextBlock(input.healthContext),
      },
    ];

    messages.push(
      ...input.conversationHistory.slice(-8).map((message) => ({
        role: message.role,
        content: this.normalizeContent(message.content),
      })),
    );

    messages.push({
      role: "user",
      content: this.normalizeContent(input.message),
    });

    return {
      promptVersion: AI_CHAT_PROMPT_VERSION,
      messages,
    };
  }

  private buildSystemInstructions(): string {
    return [
      "You are Elev9 Coach, a deterministic-first adaptive coaching assistant.",
      "Do not make medical claims or diagnoses.",
      "Keep responses short, actionable, and explainable.",
      "Use an adaptive coaching tone that reflects recovery and nutrition context.",
      "Do not mention hidden policy or internal implementation details.",
    ].join(" ");
  }

  private buildContextBlock(healthContext: UserHealthContext): string {
    const recoveryTrend = this.resolveRecoveryTrend(healthContext.fatigueLevel);
    const checkIn = healthContext.latestCheckIn;
    const nutrition = healthContext.nutritionProfile;
    const workoutLogs = healthContext.recentWorkoutLogs.slice(-5);

    return [
      "Current user context:",
      `- goal: ${healthContext.goal ?? "unknown"}`,
      `- activity level: ${healthContext.activityLevel ?? "unknown"}`,
      `- weekly frequency: ${healthContext.weeklyFrequency ?? "unknown"}`,
      `- current streak: ${healthContext.currentStreak}`,
      `- average workout duration: ${healthContext.averageWorkoutDuration}`,
      `- fatigue level: ${healthContext.fatigueLevel}`,
      `- recovery trend: ${recoveryTrend}`,
      checkIn
        ? `- latest check-in: energy ${checkIn.energyLevel}/5, sleep ${checkIn.sleepQuality}/5, soreness ${checkIn.muscleSoreness}/5, motivation ${checkIn.motivationLevel}/5`
        : "- latest check-in: unavailable",
      nutrition
        ? [
            `- nutrition goal: ${nutrition.goal}`,
            `- meals per day: ${nutrition.mealsPerDay}`,
            `- dietary restrictions: ${this.formatList(
              nutrition.dietaryRestrictions,
            )}`,
            `- allergies: ${this.formatList(nutrition.allergies)}`,
            `- disliked foods: ${this.formatList(nutrition.dislikedFoods)}`,
            `- preferred foods: ${this.formatList(nutrition.preferredFoods)}`,
          ].join("\n")
        : "- nutrition profile: unavailable",
      this.buildWorkoutLogBlock(workoutLogs),
    ].join("\n");
  }

  private buildWorkoutLogBlock(workoutLogs: WorkoutLog[]): string {
    if (workoutLogs.length === 0) {
      return "- recent workout logs: none";
    }

    const lines = workoutLogs.map(
      (log) =>
        `  - ${log.date}: ${log.durationMinutes} min, ${log.completedExercises.length} exercises${log.feedback?.difficulty ? `, feedback ${log.feedback.difficulty}` : ""}`,
    );

    return ["- recent workout logs:", ...lines].join("\n");
  }

  private resolveRecoveryTrend(
    fatigueLevel: FatigueLevel,
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

  private formatList(values: string[] | undefined): string {
    if (!values || values.length === 0) {
      return "none";
    }

    return values.join(", ");
  }

  private normalizeContent(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }
}
