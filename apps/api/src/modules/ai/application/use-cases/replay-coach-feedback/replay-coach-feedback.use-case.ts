import { Inject, Injectable } from "@nestjs/common";

import {
  COACH_FEEDBACK_REPOSITORY,
  CoachFeedbackRepository,
} from "../../../domain/repositories/coach-feedback.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  COACH_FEEDBACK_GENERATOR_VERSION,
  CoachFeedbackGenerator,
  CoachFeedbackGeneratorInput,
} from "../../services/coach-feedback/coach-feedback-generator.service";
import {
  REPLAY_COACH_FEEDBACK_ERROR_CODES,
  ReplayCoachFeedbackError,
} from "./replay-coach-feedback.errors";
import { ReplayCoachFeedbackInput } from "./replay-coach-feedback.input";
import { ReplayCoachFeedbackOutput } from "./replay-coach-feedback.output";

@Injectable()
export class ReplayCoachFeedbackUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_FEEDBACK_REPOSITORY)
    private readonly coachFeedbackRepository: CoachFeedbackRepository,
    private readonly coachFeedbackGenerator: CoachFeedbackGenerator,
  ) {}

  async execute(
    input: ReplayCoachFeedbackInput,
  ): Promise<ReplayCoachFeedbackOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const feedbackId =
      typeof input.feedbackId === "string" ? input.feedbackId.trim() : "";

    if (!authUserId) {
      throw new ReplayCoachFeedbackError(
        REPLAY_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplayCoachFeedbackError(
          REPLAY_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const feedback = await this.coachFeedbackRepository.findById(feedbackId);

      if (!feedback || feedback.userProfileId !== userProfile.id) {
        throw new ReplayCoachFeedbackError(
          REPLAY_COACH_FEEDBACK_ERROR_CODES.COACH_FEEDBACK_NOT_FOUND,
          "Coach feedback not found.",
        );
      }

      if (!feedback.contextSnapshot) {
        throw new ReplayCoachFeedbackError(
          REPLAY_COACH_FEEDBACK_ERROR_CODES.CONTEXT_MISSING,
          "Coach feedback replay context is missing.",
        );
      }

      if (feedback.generatorVersion !== COACH_FEEDBACK_GENERATOR_VERSION) {
        throw new ReplayCoachFeedbackError(
          REPLAY_COACH_FEEDBACK_ERROR_CODES.GENERATOR_VERSION_UNSUPPORTED,
          "Coach feedback generator version is unsupported.",
        );
      }

      const replayed = this.coachFeedbackGenerator.generate(
        this.mapSnapshotToGeneratorInput(feedback.contextSnapshot),
      );

      return {
        feedbackId: feedback.id,
        generatorVersion: feedback.generatorVersion,
        persisted: {
          message: feedback.message,
          insights: feedback.insights,
          recommendations: feedback.recommendations,
          influences: feedback.influences,
        },
        replayed: {
          message: replayed.message,
          insights: replayed.insights,
          recommendations: replayed.recommendations,
          influences: replayed.influences,
        },
        matches: {
          message: feedback.message === replayed.message,
          insights: this.areArraysEqual(feedback.insights, replayed.insights),
          recommendations: this.areArraysEqual(
            feedback.recommendations,
            replayed.recommendations,
          ),
          influences: this.areArraysEqual(feedback.influences, replayed.influences),
        },
      };
    } catch (error) {
      if (error instanceof ReplayCoachFeedbackError) {
        throw error;
      }

      throw new ReplayCoachFeedbackError(
        REPLAY_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private mapSnapshotToGeneratorInput(
    snapshot: NonNullable<Awaited<ReturnType<CoachFeedbackRepository["findById"]>>>["contextSnapshot"],
  ): CoachFeedbackGeneratorInput {
    if (
      !snapshot ||
      !snapshot.goal ||
      !snapshot.activityLevel ||
      snapshot.hasTrainingPlan === undefined
    ) {
      throw new ReplayCoachFeedbackError(
        REPLAY_COACH_FEEDBACK_ERROR_CODES.CONTEXT_MISSING,
        "Coach feedback replay context is missing.",
      );
    }

    return {
      goal: snapshot.goal,
      activityLevel: snapshot.activityLevel,
      expectedWorkouts:
        snapshot.weeklyFrequency ?? this.resolveExpectedWorkouts(snapshot.activityLevel),
      currentStreak: snapshot.currentStreak ?? 0,
      averageDurationMinutes: snapshot.averageWorkoutDuration ?? 0,
      workoutLogs: (snapshot.recentWorkoutLogs ?? []).map((log, index) => ({
        id: `replay-${index}`,
        trainingPlanId: "replay-training-plan",
        workoutDayIndex: 1,
        durationMinutes: log.durationMinutes,
        completedExercises: [],
        date: log.date,
        createdAt: new Date(log.createdAt),
        updatedAt: new Date(log.createdAt),
      })),
      hasTrainingPlan: snapshot.hasTrainingPlan,
      fatigueLevel: snapshot.fatigueLevel,
      latestCheckIn: snapshot.latestCheckIn,
      nutritionProfile: snapshot.nutritionProfile
        ? {
            goal: snapshot.nutritionProfile.goal,
            mealsPerDay: snapshot.nutritionProfile.mealsPerDay,
            dietaryRestrictions: [],
            allergies: [],
            dislikedFoods: [],
            preferredFoods: [],
          }
        : undefined,
    };
  }

  private resolveExpectedWorkouts(
    activityLevel: "low" | "medium" | "high",
  ): number {
    switch (activityLevel) {
      case "low":
        return 2;
      case "medium":
        return 3;
      case "high":
      default:
        return 4;
    }
  }

  private areArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }
}
