import { Inject, Injectable } from '@nestjs/common';

import { CoachFeedbackGenerator } from '../../services/coach-feedback/coach-feedback-generator.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import {
  COACH_FEEDBACK_REPOSITORY,
  CoachFeedbackRepository,
} from '../../../domain/repositories/coach-feedback.repository';
import { ActivityLevel } from '../../../../fitness/domain/entities/fitness-profile.entity';
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from './generate-coach-feedback.errors';
import { GenerateCoachFeedbackInput } from './generate-coach-feedback.input';
import { GenerateCoachFeedbackOutput } from './generate-coach-feedback.output';

@Injectable()
export class GenerateCoachFeedbackUseCase {
  constructor(
    @Inject(COACH_FEEDBACK_REPOSITORY)
    private readonly coachFeedbackRepository: CoachFeedbackRepository,
    private readonly coachFeedbackGenerator: CoachFeedbackGenerator,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
  ) {}

  async execute(
    input: GenerateCoachFeedbackInput,
  ): Promise<GenerateCoachFeedbackOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      if (!healthContext.userProfileId) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      if (!healthContext.goal || !healthContext.activityLevel) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const feedback = this.coachFeedbackGenerator.generate({
        goal: healthContext.goal,
        activityLevel: healthContext.activityLevel,
        expectedWorkouts:
          healthContext.weeklyFrequency ??
          this.resolveExpectedWorkouts(healthContext.activityLevel),
        currentStreak: healthContext.currentStreak,
        averageDurationMinutes: healthContext.averageWorkoutDuration,
        workoutLogs: healthContext.recentWorkoutLogs,
        hasTrainingPlan: Boolean(healthContext.activeTrainingPlanId),
        fatigueLevel: healthContext.fatigueLevel,
        latestCheckIn: healthContext.latestCheckIn,
        nutritionProfile: healthContext.nutritionProfile,
      });

      await this.coachFeedbackRepository.create({
        userProfileId: healthContext.userProfileId,
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
        influences: feedback.influences,
      });

      return {
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
      };
    } catch (error) {
      if (error instanceof GenerateCoachFeedbackError) {
        throw error;
      }

      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveExpectedWorkouts(activityLevel: ActivityLevel): number {
    switch (activityLevel) {
      case 'low':
        return 2;
      case 'medium':
        return 3;
      case 'high':
      default:
        return 4;
    }
  }
}
